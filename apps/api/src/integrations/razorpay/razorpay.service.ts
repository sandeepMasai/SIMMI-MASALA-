import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env, isRazorpayConfigured } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { OrderModel } from '../../modules/orders/order.model.js';
import { PaymentModel } from '../../modules/payments/payment.model.js';
import { markOrderPaid } from '../../modules/orders/order.service.js';

function client() {
  if (!isRazorpayConfigured()) {
    throw new AppError('SERVICE_UNAVAILABLE', 'Razorpay is not configured', 503);
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export function verifyCheckoutSignature(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const payload = `${input.razorpay_order_id}|${input.razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(input.razorpay_signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AppError('PAYMENT_FAILED', 'Invalid payment signature', 400);
  }
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError('SERVICE_UNAVAILABLE', 'Webhook secret not configured', 503);
  }
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AppError('PAYMENT_FAILED', 'Invalid webhook signature', 400);
  }
}

export async function createRazorpayOrderForInternalOrder(orderId: string) {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
  if (order.paymentMethod !== 'razorpay') {
    throw new AppError('VALIDATION_ERROR', 'Order is not a Razorpay order', 400);
  }
  if (order.razorpayOrderId) {
    return {
      razorpayOrderId: order.razorpayOrderId,
      amountPaise: order.totalPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    };
  }

  const rz = await client().orders.create({
    amount: order.totalPaise,
    currency: 'INR',
    receipt: order.orderNumber,
    notes: { internalOrderId: order._id.toString() },
  });

  order.razorpayOrderId = rz.id;
  await order.save();
  await PaymentModel.findOneAndUpdate(
    { orderId: order._id },
    { providerOrderId: rz.id },
  );

  return {
    razorpayOrderId: rz.id,
    amountPaise: order.totalPaise,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID,
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
  };
}

export async function verifyAndCapturePayment(input: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  verifyCheckoutSignature(input);
  const order = await OrderModel.findById(input.orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
  if (order.razorpayOrderId !== input.razorpay_order_id) {
    throw new AppError('PAYMENT_FAILED', 'Razorpay order mismatch', 400);
  }
  if (order.totalPaise <= 0) throw new AppError('PAYMENT_FAILED', 'Invalid order amount', 400);

  return markOrderPaid(order._id.toString(), {
    providerOrderId: input.razorpay_order_id,
    providerPaymentId: input.razorpay_payment_id,
    verificationMeta: { source: 'checkout_verify' },
  });
}

export async function handleWebhookEvent(event: {
  event?: string;
  id?: string;
  payload?: { payment?: { entity?: Record<string, unknown> } };
}) {
  const paymentEntity = event.payload?.payment?.entity;
  if (!paymentEntity) return { handled: false as const };

  const providerPaymentId = String(paymentEntity.id ?? '');
  const providerOrderId = String(paymentEntity.order_id ?? '');
  const amount = Number(paymentEntity.amount ?? 0);
  const eventId = String(event.id ?? providerPaymentId);

  const existingPayment = await PaymentModel.findOne({ providerPaymentId });
  if (existingPayment?.status === 'paid') {
    return { handled: true as const, duplicate: true as const };
  }

  const order = await OrderModel.findOne({ razorpayOrderId: providerOrderId });
  if (!order) return { handled: false as const };

  if (amount !== order.totalPaise) {
    throw new AppError('PAYMENT_FAILED', 'Webhook amount mismatch', 400);
  }

  if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
    const payment = await PaymentModel.findOne({ orderId: order._id });
    if (payment) {
      const ids = new Set(payment.rawEventIds ?? []);
      if (ids.has(eventId)) return { handled: true as const, duplicate: true as const };
      ids.add(eventId);
      payment.rawEventIds = [...ids];
      await payment.save();
    }
    await markOrderPaid(order._id.toString(), {
      providerOrderId,
      providerPaymentId,
      verificationMeta: { source: 'webhook', event: event.event },
    });
    return { handled: true as const, duplicate: false as const };
  }

  return { handled: false as const };
}

/**
 * Create a Razorpay refund when credentials are configured.
 * Returns null when Razorpay is not configured — callers must not claim provider success.
 */
export async function createRazorpayRefund(input: {
  providerPaymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
}): Promise<{ id: string; status: string } | null> {
  if (!isRazorpayConfigured()) return null;
  if (!input.providerPaymentId) {
    throw new AppError('VALIDATION_ERROR', 'Missing provider payment id for refund', 400);
  }
  const rz = client();
  const refund = await rz.payments.refund(input.providerPaymentId, {
    amount: input.amountPaise,
    notes: input.notes,
  });
  return { id: String(refund.id), status: String(refund.status ?? 'processed') };
}
