import { Router } from 'express';
import { checkoutSchema, buildPaginatedResult, paginationQuerySchema } from '@simmi/shared';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { authenticateCustomer } from '../../middleware/authenticate.js';
import { checkoutRateLimit } from '../../middleware/rate-limit.js';
import { sendSuccess } from '../../utils/response.js';
import { cancelOrder, createOrder, mapOrder } from './order.service.js';
import { OrderModel } from './order.model.js';
import { AppError } from '../../utils/errors.js';

export const orderRouter: import("express").Router = Router();

orderRouter.use(authenticateCustomer);

orderRouter.post(
  '/',
  checkoutRateLimit,
  validateRequest({ body: checkoutSchema }),
  asyncHandler(async (req, res) => {
    const result = await createOrder(req.user!.id, req.body);
    sendSuccess(res, result.order, result.reused ? 200 : 201);
  }),
);

orderRouter.get(
  '/my',
  validateRequest({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const filter = { userId: req.user!.id };
    const [total, docs] = await Promise.all([
      OrderModel.countDocuments(filter),
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    sendSuccess(res, buildPaginatedResult(docs.map(mapOrder), total, page, limit));
  }),
);

orderRouter.get(
  '/:orderId',
  validateRequest({ params: z.object({ orderId: z.string() }) }),
  asyncHandler(async (req, res) => {
    const order = await OrderModel.findOne({ _id: req.params.orderId, userId: req.user!.id });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    sendSuccess(res, mapOrder(order));
  }),
);

orderRouter.post(
  '/:orderId/cancel',
  validateRequest({ params: z.object({ orderId: z.string() }) }),
  asyncHandler(async (req, res) => {
    const order = await cancelOrder(String(req.params.orderId), req.user!.id, false);
    sendSuccess(res, order);
  }),
);

orderRouter.get(
  '/:orderId/invoice',
  validateRequest({ params: z.object({ orderId: z.string() }) }),
  asyncHandler(async (req, res) => {
    const order = await OrderModel.findOne({ _id: req.params.orderId, userId: req.user!.id });
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    const mapped = mapOrder(order);
    const html = `<!doctype html><html><head><title>Invoice ${mapped.orderNumber}</title>
      <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style>
      </head><body>
      <h1>SIMMI MASALA — Invoice</h1>
      <p>Order ${mapped.orderNumber}</p>
      <p>${mapped.shippingAddress.fullName}<br/>${mapped.shippingAddress.line1}, ${mapped.shippingAddress.city}, ${mapped.shippingAddress.state} ${mapped.shippingAddress.postalCode}</p>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Amount (paise)</th></tr></thead><tbody>
      ${mapped.items.map((i) => `<tr><td>${i.productNameEn} (${i.packWeightGrams}g)</td><td>${i.quantity}</td><td>${i.lineTotalPaise}</td></tr>`).join('')}
      </tbody></table>
      <p>Subtotal: ${mapped.subtotalPaise} | Discount: ${mapped.discountPaise} | Tax: ${mapped.taxPaise} | Shipping: ${mapped.shippingPaise}</p>
      <p><strong>Total (paise): ${mapped.totalPaise}</strong></p>
      <p><em>DRAFT invoice — tax registrations not configured.</em></p>
      </body></html>`;
    res.type('html').send(html);
  }),
);
