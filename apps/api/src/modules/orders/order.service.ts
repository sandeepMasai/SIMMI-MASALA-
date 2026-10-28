import { customAlphabet } from 'nanoid';
import type { CheckoutInput, OrderDto, OrderStatus } from '@simmi/shared';
import { OrderModel } from './order.model.js';
import { ProductModel } from '../products/product.model.js';
import { AddressModel } from '../addresses/address.model.js';
import { CouponModel } from '../coupons/coupon.model.js';
import { StoreSettingsModel } from '../settings/settings.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { CartModel } from '../cart/cart.model.js';
import {
  computeLineTax,
  computeOrderTotals,
  validateAndComputeCouponDiscount,
  type PricedLine,
} from './pricing.service.js';
import {
  commitReservations,
  releaseReservations,
  reserveStock,
} from '../inventory/inventory.service.js';
import { AppError, assertFound } from '../../utils/errors.js';
import { isRazorpayConfigured } from '../../config/env.js';
import { clearCart } from '../cart/cart.service.js';

const orderNumber = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['placed', 'payment_confirmed', 'cancelled'],
  placed: ['payment_confirmed', 'processing', 'cancelled'],
  payment_confirmed: ['processing', 'cancelled', 'refunded'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function mapOrder(doc: InstanceType<typeof OrderModel>): OrderDto {
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    status: doc.status as OrderStatus,
    paymentStatus: doc.paymentStatus as OrderDto['paymentStatus'],
    paymentMethod: doc.paymentMethod as OrderDto['paymentMethod'],
    items: doc.items.map((i) => ({
      productId: i.productId.toString(),
      variantId: i.variantId.toString(),
      productNameEn: i.productNameEn,
      productNameHi: i.productNameHi,
      sku: i.sku,
      packWeightGrams: i.packWeightGrams,
      unitPricePaise: i.unitPricePaise,
      quantity: i.quantity,
      lineTotalPaise: i.lineTotalPaise,
      taxPaise: i.taxPaise,
    })),
    shippingAddress: {
      fullName: doc.shippingAddress.fullName!,
      phone: doc.shippingAddress.phone!,
      line1: doc.shippingAddress.line1!,
      line2: doc.shippingAddress.line2 ?? undefined,
      city: doc.shippingAddress.city!,
      state: doc.shippingAddress.state!,
      postalCode: doc.shippingAddress.postalCode!,
      country: doc.shippingAddress.country ?? 'IN',
    },
    subtotalPaise: doc.subtotalPaise,
    discountPaise: doc.discountPaise,
    taxPaise: doc.taxPaise,
    shippingPaise: doc.shippingPaise,
    totalPaise: doc.totalPaise,
    couponCode: doc.couponCode ?? undefined,
    notes: doc.notes ?? undefined,
    trackingNumber: doc.trackingNumber ?? undefined,
    courierName: doc.courierName ?? undefined,
    statusHistory: (doc.statusHistory ?? []).map((s) => ({
      status: s.status as OrderStatus,
      note: s.note ?? undefined,
      at: (s.at ?? new Date()).toISOString(),
      by: s.by?.toString(),
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function resolveAddress(userId: string, input: CheckoutInput) {
  if (input.addressId) {
    const addr = await AddressModel.findOne({ _id: input.addressId, userId });
    assertFound(addr, 'Address not found');
    return {
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country ?? 'IN',
    };
  }
  if (input.address) return { ...input.address, country: input.address.country ?? 'IN' };
  throw new AppError('VALIDATION_ERROR', 'Shipping address is required', 400);
}

export async function createOrder(userId: string, input: CheckoutInput) {
  const existing = await OrderModel.findOne({ userId, idempotencyKey: input.idempotencyKey });
  if (existing) return { order: mapOrder(existing), reused: true as const };

  const settings = await StoreSettingsModel.findOne({ singletonKey: 'store' });
  if (!settings) throw new AppError('INTERNAL_ERROR', 'Store settings missing', 500);

  if (input.paymentMethod === 'cod' && !settings.codEnabled) {
    throw new AppError('VALIDATION_ERROR', 'Cash on Delivery is not available', 400);
  }
  if (input.paymentMethod === 'razorpay' && !isRazorpayConfigured()) {
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Online payment is not configured. Use COD or configure Razorpay.',
      503,
    );
  }

  const cart = await CartModel.findOne({ userId });
  if (!cart?.items.length) throw new AppError('VALIDATION_ERROR', 'Cart is empty', 400);

  const lines: PricedLine[] = [];
  for (const item of cart.items) {
    const product = await ProductModel.findById(item.productId);
    if (!product || !product.isActive || product.isArchived) {
      throw new AppError('VALIDATION_ERROR', 'A product in your cart is unavailable', 400);
    }
    const variant = product.variants.id(item.variantId);
    if (!variant || !variant.isActive) {
      throw new AppError('VALIDATION_ERROR', 'A pack size in your cart is unavailable', 400);
    }
    const available = variant.stockQuantity - variant.reservedQuantity;
    if (available < item.quantity) {
      throw new AppError('INSUFFICIENT_STOCK', `Insufficient stock for ${variant.sku}`, 409, {
        available,
      });
    }
    const lineTotal = variant.pricePaise * item.quantity;
    const taxRate = product.taxRateBps || settings.taxRateBps || 0;
    lines.push({
      productId: product._id.toString(),
      variantId: variant._id.toString(),
      productNameEn: product.nameEn,
      productNameHi: product.nameHi,
      sku: variant.sku,
      packWeightGrams: variant.packWeightGrams,
      unitPricePaise: variant.pricePaise,
      quantity: item.quantity,
      lineTotalPaise: lineTotal,
      taxPaise: computeLineTax(lineTotal, taxRate),
      taxRateBps: taxRate,
      categoryId: product.categoryId.toString(),
    });
  }

  let coupon = null;
  let customerUsage = 0;
  if (input.couponCode) {
    coupon = await CouponModel.findOne({ code: input.couponCode.toUpperCase() });
    if (!coupon) throw new AppError('INVALID_COUPON', 'Coupon not found', 400);
    customerUsage = await OrderModel.countDocuments({
      userId,
      couponCode: coupon.code,
      status: { $nin: ['cancelled'] },
    });
  }

  const subtotalPaise = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  const discountPaise = validateAndComputeCouponDiscount(coupon, lines, subtotalPaise, customerUsage);
  const totals = computeOrderTotals(lines, discountPaise, settings);
  const address = await resolveAddress(userId, input);

  const reserved = await reserveStock(
    lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
  );

  const isCod = input.paymentMethod === 'cod';
  const status: OrderStatus = isCod ? 'placed' : 'pending_payment';
  const paymentStatus = isCod ? 'pending' : 'pending';

  const order = await OrderModel.create({
    orderNumber: `SM-${orderNumber()}`,
    userId,
    status,
    paymentStatus,
    paymentMethod: input.paymentMethod,
    items: lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      productNameEn: l.productNameEn,
      productNameHi: l.productNameHi,
      sku: l.sku,
      packWeightGrams: l.packWeightGrams,
      unitPricePaise: l.unitPricePaise,
      quantity: l.quantity,
      lineTotalPaise: l.lineTotalPaise,
      taxPaise: l.taxPaise,
    })),
    shippingAddress: address,
    ...totals,
    couponCode: coupon?.code,
    couponId: coupon?._id,
    notes: input.notes,
    idempotencyKey: input.idempotencyKey,
    reservations: reserved.map((r) => ({
      productId: r.productId,
      variantId: r.variantId,
      quantity: r.quantity,
      expiresAt: r.expiresAt,
      released: false,
      committed: false,
    })),
    statusHistory: [{ status, note: 'Order created', at: new Date() }],
  });

  await PaymentModel.create({
    orderId: order._id,
    provider: input.paymentMethod,
    amountPaise: order.totalPaise,
    currency: 'INR',
    status: paymentStatus,
  });

  if (coupon) {
    coupon.usedCount += 1;
    await coupon.save();
  }

  if (isCod) {
    await commitReservations(
      lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
      order._id.toString(),
    );
    order.stockCommitted = true;
    for (const r of order.reservations ?? []) r.committed = true;
    await order.save();
    await clearCart(userId);
  }

  return { order: mapOrder(order), reused: false as const };
}

export async function markOrderPaid(orderId: string, meta: {
  providerOrderId?: string;
  providerPaymentId?: string;
  verificationMeta?: unknown;
}) {
  const order = await OrderModel.findById(orderId);
  assertFound(order, 'Order not found');
  if (order.paymentStatus === 'paid') return mapOrder(order);

  if (!order.stockCommitted) {
    const items = (order.reservations ?? [])
      .filter((r) => !r.released)
      .map((r) => ({
        productId: r.productId.toString(),
        variantId: r.variantId.toString(),
        quantity: r.quantity,
      }));
    await commitReservations(items, order._id.toString());
    order.stockCommitted = true;
    for (const r of order.reservations ?? []) {
      if (!r.released) r.committed = true;
    }
  }

  order.paymentStatus = 'paid';
  order.status = 'payment_confirmed';
  order.razorpayOrderId = meta.providerOrderId ?? order.razorpayOrderId;
  order.statusHistory.push({
    status: 'payment_confirmed',
    note: 'Payment confirmed',
    at: new Date(),
  });
  await order.save();

  await PaymentModel.findOneAndUpdate(
    { orderId: order._id },
    {
      status: 'paid',
      providerOrderId: meta.providerOrderId,
      providerPaymentId: meta.providerPaymentId,
      verificationMeta: meta.verificationMeta,
    },
  );

  await clearCart(order.userId.toString());
  return mapOrder(order);
}

export async function cancelOrder(orderId: string, actorId: string, asAdmin = false) {
  const order = await OrderModel.findById(orderId);
  assertFound(order, 'Order not found');
  if (!asAdmin && order.userId.toString() !== actorId) {
    throw new AppError('FORBIDDEN', 'Not your order', 403);
  }
  const cancellable: OrderStatus[] = [
    'pending_payment',
    'placed',
    'payment_confirmed',
    'processing',
    'packed',
  ];
  if (!cancellable.includes(order.status as OrderStatus)) {
    throw new AppError('INVALID_STATE', 'Order cannot be cancelled in current status', 400);
  }

  if (!order.stockRestored) {
    if (order.stockCommitted) {
      // restore stock
      for (const item of order.items) {
        const product = await ProductModel.findById(item.productId);
        const variant = product?.variants.id(item.variantId);
        if (variant) {
          variant.stockQuantity += item.quantity;
          await product!.save();
        }
      }
      const { InventoryMovementModel } = await import('../inventory/inventory-movement.model.js');
      for (const item of order.items) {
        await InventoryMovementModel.create({
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          quantityChange: item.quantity,
          reason: 'order_cancel_restore',
          orderId: order._id,
          actorId,
          resultingStock: 0,
        });
      }
    } else {
      await releaseReservations(
        (order.reservations ?? []).map((r) => ({
          productId: r.productId.toString(),
          variantId: r.variantId.toString(),
          quantity: r.quantity,
        })),
        'order_cancel_restore',
        order._id.toString(),
      );
      for (const r of order.reservations ?? []) r.released = true;
    }
    order.stockRestored = true;
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  if (order.paymentStatus === 'pending') order.paymentStatus = 'failed';
  order.statusHistory.push({
    status: 'cancelled',
    note: 'Order cancelled',
    at: new Date(),
    by: actorId as never,
  });
  await order.save();
  return mapOrder(order);
}

export async function updateOrderStatus(
  orderId: string,
  next: OrderStatus,
  actorId: string,
  extra?: { trackingNumber?: string; courierName?: string; note?: string },
) {
  const order = await OrderModel.findById(orderId);
  assertFound(order, 'Order not found');
  const allowed = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (!allowed.includes(next)) {
    throw new AppError(
      'INVALID_STATE',
      `Cannot transition from ${order.status} to ${next}`,
      400,
    );
  }
  order.status = next;
  if (extra?.trackingNumber) order.trackingNumber = extra.trackingNumber;
  if (extra?.courierName) order.courierName = extra.courierName;
  if (next === 'delivered') order.deliveredAt = new Date();
  order.statusHistory.push({
    status: next,
    note: extra?.note,
    at: new Date(),
    by: actorId as never,
  });
  await order.save();
  return mapOrder(order);
}
