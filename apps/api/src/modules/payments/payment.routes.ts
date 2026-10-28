import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { authenticateCustomer } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';
import {
  createRazorpayOrderForInternalOrder,
  handleWebhookEvent,
  verifyAndCapturePayment,
  verifyWebhookSignature,
} from '../../integrations/razorpay/razorpay.service.js';
import { OrderModel } from '../orders/order.model.js';
import { AppError } from '../../utils/errors.js';
import { isRazorpayConfigured } from '../../config/env.js';

export const paymentRouter: import("express").Router = Router();

paymentRouter.get(
  '/razorpay/config',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, {
      configured: isRazorpayConfigured(),
      keyId: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : null,
    });
  }),
);

paymentRouter.post(
  '/razorpay/create-order',
  authenticateCustomer,
  validateRequest({ body: z.object({ orderId: z.string() }) }),
  asyncHandler(async (req, res) => {
    const order = await OrderModel.findOne({ _id: req.body.orderId, userId: req.user!.id });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    const payload = await createRazorpayOrderForInternalOrder(order._id.toString());
    sendSuccess(res, payload);
  }),
);

paymentRouter.post(
  '/razorpay/verify',
  authenticateCustomer,
  validateRequest({
    body: z.object({
      orderId: z.string(),
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const order = await OrderModel.findOne({ _id: req.body.orderId, userId: req.user!.id });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    const updated = await verifyAndCapturePayment(req.body);
    sendSuccess(res, updated);
  }),
);

paymentRouter.post(
  '/razorpay/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature || typeof signature !== 'string') {
      throw new AppError('PAYMENT_FAILED', 'Missing webhook signature', 400);
    }
    const raw = (req as typeof req & { rawBody?: Buffer }).rawBody;
    if (!raw) throw new AppError('PAYMENT_FAILED', 'Missing raw body for webhook', 400);
    verifyWebhookSignature(raw, signature);
    const result = await handleWebhookEvent(req.body);
    sendSuccess(res, result);
  }),
);
