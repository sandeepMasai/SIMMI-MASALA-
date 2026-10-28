import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  buildPaginatedResult,
  paginationQuerySchema,
  orderStatusSchema,
  productCreateSchema,
  productUpdateSchema,
  CUSTOMER_ROLE,
  ADMIN_ROLES,
  emailSchema,
  passwordSchema,
} from '@simmi/shared';
import { hashPassword } from '../auth/password.js';
import { ContentModel } from '../content/content.model.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { authenticateAdmin, authorize } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';
import { OrderModel } from '../orders/order.model.js';
import { ProductModel } from '../products/product.model.js';
import { UserModel } from '../users/user.model.js';
import { CouponModel } from '../coupons/coupon.model.js';
import { CategoryModel } from '../categories/category.model.js';
import { InventoryMovementModel } from '../inventory/inventory-movement.model.js';
import { PaymentModel } from '../payments/payment.model.js';
import { RefundModel } from '../refunds/refund.model.js';
import { AdminAuditLogModel } from './audit-log.model.js';
import { mapProduct } from '../products/product.mapper.js';
import {
  assertSkuAvailable,
  assertSlugAvailable,
  normalizeVariantInput,
  sanitizeLabelInfo,
} from '../products/product.service.js';
import { mapOrder, updateOrderStatus, cancelOrder } from '../orders/order.service.js';
import { adjustStock } from '../inventory/inventory.service.js';
import { getOrCreateSettings, mapSettings } from '../settings/settings.service.js';
import { storeImage } from '../../integrations/storage/storage.service.js';
import { AppError } from '../../utils/errors.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const adminRouter: import("express").Router = Router();
adminRouter.use(authenticateAdmin);

async function audit(actorId: string, action: string, resourceType: string, resourceId?: string, meta?: unknown) {
  await AdminAuditLogModel.create({ actorId, action, resourceType, resourceId, meta });
}

adminRouter.get(
  '/dashboard',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const match = { createdAt: { $gte: from, $lte: to } };

    const [
      totalOrders,
      paidAgg,
      pendingPayments,
      awaiting,
      delivered,
      cancelled,
      activeProducts,
      lowStock,
      recentOrders,
      bestSellers,
    ] = await Promise.all([
      OrderModel.countDocuments(match),
      OrderModel.aggregate([
        { $match: { ...match, paymentStatus: 'paid', status: { $nin: ['cancelled', 'refunded'] } } },
        { $group: { _id: null, total: { $sum: '$totalPaise' }, count: { $sum: 1 } } },
      ]),
      OrderModel.countDocuments({ ...match, paymentStatus: 'pending' }),
      OrderModel.countDocuments({ status: { $in: ['placed', 'payment_confirmed', 'processing'] } }),
      OrderModel.countDocuments({ ...match, status: 'delivered' }),
      OrderModel.countDocuments({ ...match, status: 'cancelled' }),
      ProductModel.countDocuments({ isActive: true, isArchived: false }),
      ProductModel.aggregate([
        { $unwind: '$variants' },
        {
          $match: {
            isArchived: false,
            $expr: {
              $lte: [
                { $subtract: ['$variants.stockQuantity', '$variants.reservedQuantity'] },
                '$variants.lowStockThreshold',
              ],
            },
          },
        },
        { $limit: 20 },
      ]),
      OrderModel.find().sort({ createdAt: -1 }).limit(10),
      OrderModel.aggregate([
        { $match: { status: { $nin: ['cancelled'] }, paymentStatus: { $in: ['paid', 'pending'] } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.sku',
            name: { $first: '$items.productNameEn' },
            qty: { $sum: '$items.quantity' },
            revenuePaise: { $sum: '$items.lineTotalPaise' },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 10 },
      ]),
    ]);

    sendSuccess(res, {
      totalOrders,
      paidRevenuePaise: paidAgg[0]?.total ?? 0,
      paidOrders: paidAgg[0]?.count ?? 0,
      pendingPayments,
      awaitingProcessing: awaiting,
      delivered,
      cancelled,
      activeProducts,
      lowStockProducts: lowStock.map((p) => ({
        productId: p._id.toString(),
        nameEn: p.nameEn,
        sku: p.variants.sku,
        available: p.variants.stockQuantity - p.variants.reservedQuantity,
      })),
      recentOrders: recentOrders.map(mapOrder),
      bestSellers,
      revenueRule:
        'Paid revenue excludes cancelled and refunded orders; COD pending is not counted as paid.',
      range: { from: from.toISOString(), to: to.toISOString() },
    });
  }),
);

adminRouter.get(
  '/products',
  authorize('products:read'),
  validateRequest({
    query: paginationQuerySchema.extend({
      q: z.string().optional(),
      status: z.enum(['draft', 'active', 'archived', 'all']).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { page, limit, q, status } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      status?: string;
    };
    const filter: Record<string, unknown> = {};
    if (status === 'archived') filter.status = 'archived';
    else if (status === 'draft' || status === 'active') filter.status = status;
    else if (status !== 'all') filter.isArchived = false;
    if (q) {
      filter.$or = [
        { nameEn: new RegExp(q, 'i') },
        { nameHi: new RegExp(q, 'i') },
        { slug: new RegExp(q, 'i') },
        { 'variants.sku': new RegExp(q, 'i') },
      ];
    }
    const [total, docs] = await Promise.all([
      ProductModel.countDocuments(filter),
      ProductModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    sendSuccess(res, buildPaginatedResult(docs.map((d) => mapProduct(d)), total, page, limit));
  }),
);

adminRouter.get(
  '/products/:productId',
  authorize('products:read'),
  validateRequest({ params: z.object({ productId: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const doc = await ProductModel.findById(req.params.productId);
    if (!doc) throw new AppError('NOT_FOUND', 'Product not found', 404);
    sendSuccess(res, mapProduct(doc));
  }),
);

adminRouter.post(
  '/products',
  authorize('products:write'),
  validateRequest({ body: productCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productCreateSchema>;
    await assertSlugAvailable(body.slug);
    await assertSkuAvailable(body.variants.map((v) => v.sku));
    const doc = await ProductModel.create({
      nameEn: body.nameEn,
      nameHi: body.nameHi,
      slug: body.slug,
      brandName: body.brandName || 'SIMMI MASALA',
      shortDescription: body.shortDescription || '',
      description: body.description,
      categoryId: body.categoryId,
      images: body.images ?? [],
      status: body.status ?? 'draft',
      isFeatured: body.isFeatured ?? false,
      taxRateBps: body.taxRateBps ?? 0,
      seoTitle: body.seoTitle || undefined,
      seoDescription: body.seoDescription || undefined,
      isPlaceholderContent: body.isPlaceholderContent ?? false,
      labelInfo: sanitizeLabelInfo(body.labelInfo),
      variants: body.variants.map((v) => ({ ...normalizeVariantInput(v), reservedQuantity: 0 })),
    });
    await audit(req.user!.id, 'product.create', 'product', doc._id.toString());
    sendSuccess(res, mapProduct(doc), 201);
  }),
);

adminRouter.patch(
  '/products/:productId',
  authorize('products:write'),
  validateRequest({ params: z.object({ productId: z.string() }), body: productUpdateSchema }),
  asyncHandler(async (req, res) => {
    const doc = await ProductModel.findById(req.params.productId);
    if (!doc) throw new AppError('NOT_FOUND', 'Product not found', 404);
    const body = req.body as z.infer<typeof productUpdateSchema>;

    if (body.slug && body.slug !== doc.slug) await assertSlugAvailable(body.slug, doc._id.toString());
    if (body.variants) await assertSkuAvailable(body.variants.map((v) => v.sku), doc._id.toString());

    const { variants, labelInfo, ...rest } = body;
    Object.assign(doc, rest);
    if (labelInfo !== undefined) doc.labelInfo = sanitizeLabelInfo(labelInfo) as never;
    if (variants) {
      doc.variants = variants.map((v) => {
        const normalized = normalizeVariantInput(v);
        if (v.id) {
          const existing = doc.variants.id(v.id);
          if (existing) {
            Object.assign(existing, {
              ...normalized,
              reservedQuantity: existing.reservedQuantity,
            });
            return existing;
          }
        }
        return { ...normalized, reservedQuantity: 0 };
      }) as never;
    }
    await doc.save();
    await audit(req.user!.id, 'product.update', 'product', doc._id.toString());
    sendSuccess(res, mapProduct(doc));
  }),
);

adminRouter.post(
  '/products/:productId/archive',
  authorize('products:write'),
  asyncHandler(async (req, res) => {
    const doc = await ProductModel.findById(req.params.productId);
    if (!doc) throw new AppError('NOT_FOUND', 'Product not found', 404);
    doc.status = 'archived';
    await doc.save();
    await audit(req.user!.id, 'product.archive', 'product', doc._id.toString());
    sendSuccess(res, mapProduct(doc));
  }),
);

adminRouter.post(
  '/products/:productId/images',
  authorize('products:write'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('VALIDATION_ERROR', 'Image file required', 400);
    const doc = await ProductModel.findById(req.params.productId);
    if (!doc) throw new AppError('NOT_FOUND', 'Product not found', 404);
    const stored = await storeImage(req.file);
    doc.images.push({ url: stored.url, publicId: stored.publicId, alt: doc.nameEn, sortOrder: doc.images.length });
    await doc.save();
    sendSuccess(res, mapProduct(doc));
  }),
);

async function mapCategory(c: {
  _id: { toString(): string };
  nameEn: string;
  nameHi: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number | null;
  isActive: boolean;
  isArchived?: boolean | null;
}) {
  const productCount = await ProductModel.countDocuments({
    categoryId: c._id,
    isArchived: false,
  });
  return {
    id: c._id.toString(),
    nameEn: c.nameEn,
    nameHi: c.nameHi,
    slug: c.slug,
    description: c.description ?? '',
    imageUrl: c.imageUrl ?? undefined,
    sortOrder: c.sortOrder ?? 0,
    isActive: c.isActive,
    isArchived: Boolean(c.isArchived),
    productCount,
  };
}

adminRouter.get(
  '/categories',
  authorize('products:read'),
  asyncHandler(async (_req, res) => {
    const cats = await CategoryModel.find({ isArchived: { $ne: true } }).sort({
      sortOrder: 1,
      nameEn: 1,
    });
    sendSuccess(res, await Promise.all(cats.map(mapCategory)));
  }),
);

adminRouter.post(
  '/categories',
  authorize('products:write'),
  validateRequest({
    body: z.object({
      nameEn: z.string().min(2),
      nameHi: z.string().min(1),
      slug: z.string().min(2),
      description: z.string().optional(),
      imageUrl: z.string().url().optional().or(z.literal('')),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const existing = await CategoryModel.findOne({ slug: req.body.slug });
    if (existing) throw new AppError('CONFLICT', 'Category slug already exists', 409);
    const cat = await CategoryModel.create({
      ...req.body,
      imageUrl: req.body.imageUrl || undefined,
      sortOrder: req.body.sortOrder ?? 0,
      isActive: req.body.isActive ?? true,
    });
    await audit(req.user!.id, 'category.create', 'category', cat._id.toString());
    sendSuccess(res, await mapCategory(cat), 201);
  }),
);

adminRouter.patch(
  '/categories/:id',
  authorize('products:write'),
  validateRequest({
    params: z.object({ id: z.string() }),
    body: z.object({
      nameEn: z.string().min(2).optional(),
      nameHi: z.string().min(1).optional(),
      slug: z.string().min(2).optional(),
      description: z.string().optional(),
      imageUrl: z.string().url().optional().or(z.literal('')),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const cat = await CategoryModel.findById(req.params.id);
    if (!cat || cat.isArchived) throw new AppError('NOT_FOUND', 'Category not found', 404);
    if (req.body.slug && req.body.slug !== cat.slug) {
      const clash = await CategoryModel.findOne({ slug: req.body.slug });
      if (clash) throw new AppError('CONFLICT', 'Category slug already exists', 409);
    }
    Object.assign(cat, {
      ...req.body,
      imageUrl: req.body.imageUrl === '' ? undefined : (req.body.imageUrl ?? cat.imageUrl),
    });
    await cat.save();
    await audit(req.user!.id, 'category.update', 'category', cat._id.toString());
    sendSuccess(res, await mapCategory(cat));
  }),
);

adminRouter.post(
  '/categories/:id/archive',
  authorize('products:write'),
  asyncHandler(async (req, res) => {
    const cat = await CategoryModel.findById(req.params.id);
    if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404);
    const inUse = await ProductModel.countDocuments({
      categoryId: cat._id,
      isArchived: false,
      status: { $ne: 'archived' },
    });
    if (inUse > 0) {
      throw new AppError(
        'CONFLICT',
        `Cannot archive category while ${inUse} active product(s) reference it`,
        409,
      );
    }
    cat.isArchived = true;
    cat.isActive = false;
    await cat.save();
    await audit(req.user!.id, 'category.archive', 'category', cat._id.toString());
    sendSuccess(res, await mapCategory(cat));
  }),
);

adminRouter.get(
  '/inventory',
  authorize('inventory:read'),
  asyncHandler(async (_req, res) => {
    const products = await ProductModel.find({ isArchived: false });
    const rows = products.flatMap((p) =>
      p.variants.map((v) => ({
        productId: p._id.toString(),
        productName: p.nameEn,
        variantId: v._id.toString(),
        sku: v.sku,
        packWeightGrams: v.packWeightGrams,
        stockQuantity: v.stockQuantity,
        reservedQuantity: v.reservedQuantity,
        available: v.stockQuantity - v.reservedQuantity,
        lowStockThreshold: v.lowStockThreshold,
      })),
    );
    sendSuccess(res, rows);
  }),
);

adminRouter.post(
  '/inventory/adjust',
  authorize('inventory:write'),
  validateRequest({
    body: z.object({
      productId: z.string(),
      variantId: z.string(),
      quantityChange: z.number().int(),
      note: z.string().min(3),
    }),
  }),
  asyncHandler(async (req, res) => {
    const variant = await adjustStock({ ...req.body, actorId: req.user!.id });
    await audit(req.user!.id, 'inventory.adjust', 'variant', req.body.variantId, req.body);
    sendSuccess(res, {
      sku: variant.sku,
      stockQuantity: variant.stockQuantity,
      reservedQuantity: variant.reservedQuantity,
    });
  }),
);

adminRouter.get(
  '/inventory/movements',
  authorize('inventory:read'),
  validateRequest({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const [total, docs] = await Promise.all([
      InventoryMovementModel.countDocuments(),
      InventoryMovementModel.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    sendSuccess(
      res,
      buildPaginatedResult(
        docs.map((d) => ({
          id: d._id.toString(),
          sku: d.sku,
          quantityChange: d.quantityChange,
          reason: d.reason,
          note: d.note,
          resultingStock: d.resultingStock,
          createdAt: d.createdAt.toISOString(),
        })),
        total,
        page,
        limit,
      ),
    );
  }),
);

adminRouter.get(
  '/orders',
  authorize('orders:read'),
  validateRequest({
    query: paginationQuerySchema.extend({
      q: z.string().optional(),
      status: orderStatusSchema.optional(),
      paymentStatus: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { page, limit, q, status, paymentStatus } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      status?: string;
      paymentStatus?: string;
    };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (q) filter.$or = [{ orderNumber: new RegExp(q, 'i') }];
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

adminRouter.get(
  '/orders/:orderId',
  authorize('orders:read'),
  asyncHandler(async (req, res) => {
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    const payment = await PaymentModel.findOne({ orderId: order._id });
    sendSuccess(res, {
      order: mapOrder(order),
      payment: payment
        ? {
            id: payment._id.toString(),
            provider: payment.provider,
            status: payment.status,
            amountPaise: payment.amountPaise,
            providerOrderId: payment.providerOrderId,
            providerPaymentId: payment.providerPaymentId,
          }
        : null,
      internalNotes: order.internalNotes,
    });
  }),
);

adminRouter.patch(
  '/orders/:orderId/status',
  authorize('orders:write'),
  validateRequest({
    params: z.object({ orderId: z.string() }),
    body: z.object({
      status: orderStatusSchema,
      trackingNumber: z.string().optional(),
      courierName: z.string().optional(),
      note: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const order = await updateOrderStatus(String(req.params.orderId), req.body.status, req.user!.id, req.body);
    await audit(req.user!.id, 'order.status', 'order', order.id, req.body);
    sendSuccess(res, order);
  }),
);

adminRouter.post(
  '/orders/:orderId/cancel',
  authorize('orders:write'),
  asyncHandler(async (req, res) => {
    const order = await cancelOrder(String(req.params.orderId), req.user!.id, true);
    await audit(req.user!.id, 'order.cancel', 'order', order.id);
    sendSuccess(res, order);
  }),
);

adminRouter.patch(
  '/orders/:orderId/notes',
  authorize('orders:write'),
  validateRequest({
    params: z.object({ orderId: z.string() }),
    body: z.object({ internalNotes: z.string().max(5000) }),
  }),
  asyncHandler(async (req, res) => {
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    order.internalNotes = req.body.internalNotes;
    await order.save();
    await audit(req.user!.id, 'order.notes', 'order', order._id.toString());
    sendSuccess(res, { id: order._id.toString(), internalNotes: order.internalNotes });
  }),
);

adminRouter.post(
  '/orders/:orderId/refund',
  authorize('orders:write'),
  validateRequest({
    body: z.object({ amountPaise: z.number().int().positive(), reason: z.string().min(3) }),
  }),
  asyncHandler(async (req, res) => {
    const { createRazorpayRefund } = await import('../../integrations/razorpay/razorpay.service.js');
    const { isRazorpayConfigured } = await import('../../config/env.js');
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);
    const payment = await PaymentModel.findOne({ orderId: order._id });
    if (!payment || payment.status !== 'paid') {
      throw new AppError('INVALID_STATE', 'No paid payment to refund', 400);
    }
    if (req.body.amountPaise > payment.amountPaise) {
      throw new AppError('VALIDATION_ERROR', 'Refund exceeds payment amount', 400);
    }

    let providerRefundId: string | undefined;
    let providerRefunded = false;
    if (order.paymentMethod === 'razorpay' && isRazorpayConfigured()) {
      if (!payment.providerPaymentId) {
        throw new AppError('INVALID_STATE', 'Missing Razorpay payment id; cannot refund via provider', 400);
      }
      const provider = await createRazorpayRefund({
        providerPaymentId: payment.providerPaymentId,
        amountPaise: req.body.amountPaise,
        notes: { orderNumber: order.orderNumber, reason: req.body.reason },
      });
      if (!provider) {
        throw new AppError('SERVICE_UNAVAILABLE', 'Razorpay refund failed to start', 503);
      }
      providerRefundId = provider.id;
      providerRefunded = true;
    }

    const refund = await RefundModel.create({
      orderId: order._id,
      paymentId: payment._id,
      amountPaise: req.body.amountPaise,
      reason: req.body.reason,
      status: 'completed',
      providerRefundId,
      actorId: req.user!.id,
    });
    payment.status =
      req.body.amountPaise === payment.amountPaise ? 'refunded' : 'partially_refunded';
    await payment.save();
    order.paymentStatus = payment.status;
    if (payment.status === 'refunded') {
      order.status = 'refunded';
      order.statusHistory.push({
        status: 'refunded',
        note: req.body.reason,
        at: new Date(),
        by: req.user!.id as never,
      });
    }
    await order.save();
    await audit(req.user!.id, 'order.refund', 'order', order._id.toString(), {
      ...req.body,
      providerRefunded,
    });
    sendSuccess(res, {
      id: refund._id.toString(),
      status: refund.status,
      providerRefunded,
      providerRefundId,
      note: providerRefunded
        ? 'Refund submitted to Razorpay and recorded locally.'
        : 'Ledger-only refund recorded. Razorpay was not configured or order was not Razorpay — no provider refund was created.',
    });
  }),
);

adminRouter.get(
  '/orders/export/csv',
  authorize('orders:read'),
  asyncHandler(async (_req, res) => {
    const orders = await OrderModel.find().sort({ createdAt: -1 }).limit(5000);
    const header = 'orderNumber,status,paymentStatus,totalPaise,createdAt\n';
    const rows = orders
      .map((o) => `${o.orderNumber},${o.status},${o.paymentStatus},${o.totalPaise},${o.createdAt.toISOString()}`)
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(header + rows);
  }),
);

adminRouter.get(
  '/customers',
  authorize('customers:read'),
  validateRequest({ query: paginationQuerySchema.extend({ q: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string };
    const filter: Record<string, unknown> = { role: CUSTOMER_ROLE };
    if (q) filter.$or = [{ email: new RegExp(q, 'i') }, { name: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }];
    const [total, docs] = await Promise.all([
      UserModel.countDocuments(filter),
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    sendSuccess(
      res,
      buildPaginatedResult(
        docs.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          phone: u.phone,
          accountStatus: u.accountStatus,
          createdAt: u.createdAt.toISOString(),
        })),
        total,
        page,
        limit,
      ),
    );
  }),
);

adminRouter.get(
  '/customers/:id',
  authorize('customers:read'),
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || user.role !== CUSTOMER_ROLE) throw new AppError('NOT_FOUND', 'Customer not found', 404);
    const orders = await OrderModel.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50);
    const paid = orders.filter((o) => o.paymentStatus === 'paid');
    sendSuccess(res, {
      customer: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountStatus: user.accountStatus,
        supportNotes: user.supportNotes,
        createdAt: user.createdAt.toISOString(),
      },
      summary: {
        totalOrders: orders.length,
        paidOrders: paid.length,
        paidRevenuePaise: paid.reduce((s, o) => s + o.totalPaise, 0),
      },
      orders: orders.map(mapOrder),
    });
  }),
);

adminRouter.patch(
  '/customers/:id',
  authorize('customers:write'),
  validateRequest({
    params: z.object({ id: z.string() }),
    body: z.object({
      accountStatus: z.enum(['active', 'disabled', 'deletion_requested']).optional(),
      supportNotes: z.string().max(5000).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || user.role !== CUSTOMER_ROLE) throw new AppError('NOT_FOUND', 'Customer not found', 404);
    if (req.body.accountStatus) user.accountStatus = req.body.accountStatus;
    if (req.body.supportNotes !== undefined) user.supportNotes = req.body.supportNotes;
    await user.save();
    await audit(req.user!.id, 'customer.update', 'user', user._id.toString(), req.body);
    sendSuccess(res, {
      id: user._id.toString(),
      accountStatus: user.accountStatus,
      supportNotes: user.supportNotes,
    });
  }),
);

adminRouter.get(
  '/coupons',
  authorize('coupons:read'),
  asyncHandler(async (_req, res) => {
    const coupons = await CouponModel.find().sort({ createdAt: -1 });
    sendSuccess(
      res,
      coupons.map((c) => ({
        id: c._id.toString(),
        code: c.code,
        type: c.type,
        value: c.value,
        minOrderPaise: c.minOrderPaise,
        maxDiscountPaise: c.maxDiscountPaise,
        startsAt: c.startsAt.toISOString(),
        expiresAt: c.expiresAt.toISOString(),
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        isActive: c.isActive,
      })),
    );
  }),
);

adminRouter.post(
  '/coupons',
  authorize('coupons:write'),
  validateRequest({
    body: z.object({
      code: z.string().min(3).max(40),
      type: z.enum(['percentage', 'fixed']),
      value: z.number().positive(),
      minOrderPaise: z.number().int().min(0).default(0),
      maxDiscountPaise: z.number().int().positive().optional(),
      startsAt: z.string().datetime(),
      expiresAt: z.string().datetime(),
      usageLimit: z.number().int().positive().optional(),
      perCustomerLimit: z.number().int().positive().default(1),
      isActive: z.boolean().default(true),
    }),
  }),
  asyncHandler(async (req, res) => {
    const coupon = await CouponModel.create({
      ...req.body,
      code: req.body.code.toUpperCase(),
      startsAt: new Date(req.body.startsAt),
      expiresAt: new Date(req.body.expiresAt),
    });
    await audit(req.user!.id, 'coupon.create', 'coupon', coupon._id.toString());
    sendSuccess(res, { id: coupon._id.toString(), code: coupon.code }, 201);
  }),
);

adminRouter.patch(
  '/coupons/:id',
  authorize('coupons:write'),
  validateRequest({
    params: z.object({ id: z.string() }),
    body: z.object({
      type: z.enum(['percentage', 'fixed']).optional(),
      value: z.number().positive().optional(),
      minOrderPaise: z.number().int().min(0).optional(),
      maxDiscountPaise: z.number().int().positive().nullable().optional(),
      startsAt: z.string().datetime().optional(),
      expiresAt: z.string().datetime().optional(),
      usageLimit: z.number().int().positive().nullable().optional(),
      perCustomerLimit: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const coupon = await CouponModel.findById(req.params.id);
    if (!coupon) throw new AppError('NOT_FOUND', 'Coupon not found', 404);
    const { startsAt, expiresAt, ...rest } = req.body;
    Object.assign(coupon, rest);
    if (startsAt) coupon.startsAt = new Date(startsAt);
    if (expiresAt) coupon.expiresAt = new Date(expiresAt);
    await coupon.save();
    await audit(req.user!.id, 'coupon.update', 'coupon', coupon._id.toString(), req.body);
    sendSuccess(res, {
      id: coupon._id.toString(),
      code: coupon.code,
      isActive: coupon.isActive,
    });
  }),
);

adminRouter.get(
  '/reports/sales',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const sales = await OrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          paymentStatus: 'paid',
          status: { $nin: ['cancelled', 'refunded'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenuePaise: { $sum: '$totalPaise' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    sendSuccess(res, { from, to, sales });
  }),
);

adminRouter.get(
  '/settings',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const doc = await getOrCreateSettings();
    sendSuccess(res, mapSettings(doc));
  }),
);

adminRouter.patch(
  '/settings',
  authorize('settings:write'),
  asyncHandler(async (req, res) => {
    const doc = await getOrCreateSettings();
    const allowed = [
      'brandName',
      'tagline',
      'email',
      'phone',
      'whatsappNumber',
      'addressLine1',
      'city',
      'state',
      'postalCode',
      'country',
      'shippingFlatPaise',
      'freeShippingThresholdPaise',
      'codEnabled',
      'taxRateBps',
      'logoUrl',
      'featuredProductIds',
      'policies',
    ] as const;
    for (const key of allowed) {
      if (key in req.body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any)[key] = req.body[key];
      }
    }
    await doc.save();
    await audit(req.user!.id, 'settings.update', 'settings', 'store');
    sendSuccess(res, mapSettings(doc));
  }),
);

adminRouter.get(
  '/admins',
  authorize('admins:manage'),
  asyncHandler(async (_req, res) => {
    const admins = await UserModel.find({ role: { $in: [...ADMIN_ROLES] } })
      .sort({ createdAt: -1 })
      .select('name email role accountStatus createdAt lastLoginAt');
    sendSuccess(
      res,
      admins.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        accountStatus: u.accountStatus,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString(),
      })),
    );
  }),
);

adminRouter.post(
  '/admins',
  authorize('admins:manage'),
  validateRequest({
    body: z.object({
      name: z.string().min(2).max(100),
      email: emailSchema,
      password: passwordSchema,
      role: z.enum(['super_admin', 'product_manager', 'order_manager', 'support_manager']),
    }),
  }),
  asyncHandler(async (req, res) => {
    if (req.body.role === 'super_admin' && req.user!.role !== 'super_admin') {
      throw new AppError('FORBIDDEN', 'Only a Super Admin can create another Super Admin', 403);
    }
    const email = req.body.email.toLowerCase();
    const existing = await UserModel.findOne({ email });
    if (existing) throw new AppError('CONFLICT', 'Email already registered', 409);
    const user = await UserModel.create({
      name: req.body.name,
      email,
      passwordHash: await hashPassword(req.body.password),
      role: req.body.role,
      emailVerifiedAt: new Date(),
      accountStatus: 'active',
    });
    await audit(req.user!.id, 'admin.create', 'user', user._id.toString(), {
      role: user.role,
      email: user.email,
    });
    sendSuccess(
      res,
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      201,
    );
  }),
);

adminRouter.patch(
  '/admins/:id',
  authorize('admins:manage'),
  validateRequest({
    params: z.object({ id: z.string() }),
    body: z.object({
      role: z.enum(['super_admin', 'product_manager', 'order_manager', 'support_manager']).optional(),
      accountStatus: z.enum(['active', 'disabled']).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
      throw new AppError('NOT_FOUND', 'Admin not found', 404);
    }
    if (user._id.toString() === req.user!.id && req.body.accountStatus === 'disabled') {
      throw new AppError('VALIDATION_ERROR', 'Cannot disable your own account', 400);
    }
    if (req.body.role === 'super_admin' && req.user!.role !== 'super_admin') {
      throw new AppError('FORBIDDEN', 'Only a Super Admin can assign Super Admin', 403);
    }
    if (req.body.role) user.role = req.body.role;
    if (req.body.accountStatus) user.accountStatus = req.body.accountStatus;
    await user.save();
    await audit(req.user!.id, 'admin.update', 'user', user._id.toString(), req.body);
    sendSuccess(res, {
      id: user._id.toString(),
      role: user.role,
      accountStatus: user.accountStatus,
    });
  }),
);

adminRouter.get(
  '/audit-logs',
  authorize('admins:manage'),
  validateRequest({ query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const [total, docs] = await Promise.all([
      AdminAuditLogModel.countDocuments(),
      AdminAuditLogModel.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    sendSuccess(
      res,
      buildPaginatedResult(
        docs.map((d) => ({
          id: d._id.toString(),
          actorId: d.actorId?.toString(),
          action: d.action,
          resourceType: d.resourceType,
          resourceId: d.resourceId,
          meta: d.meta,
          createdAt: d.createdAt.toISOString(),
        })),
        total,
        page,
        limit,
      ),
    );
  }),
);

adminRouter.get(
  '/content',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const docs = await ContentModel.find().sort({ key: 1 });
    sendSuccess(
      res,
      docs.map((d) => ({
        id: d._id.toString(),
        key: d.key,
        title: d.title,
        status: d.status,
        blocks: d.blocks,
        publishedAt: d.publishedAt?.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    );
  }),
);

adminRouter.put(
  '/content/:key',
  authorize('settings:write'),
  validateRequest({
    params: z.object({ key: z.string().min(2).max(80) }),
    body: z.object({
      title: z.string().min(2).max(200),
      status: z.enum(['draft', 'published']),
      blocks: z.record(z.unknown()),
    }),
  }),
  asyncHandler(async (req, res) => {
    const key = req.params.key!;
    const doc = await ContentModel.findOneAndUpdate(
      { key },
      {
        $set: {
          title: req.body.title,
          status: req.body.status,
          blocks: req.body.blocks,
          publishedAt: req.body.status === 'published' ? new Date() : null,
        },
        $setOnInsert: { key },
      },
      { upsert: true, new: true },
    );
    await audit(req.user!.id, 'content.upsert', 'content', key, { status: req.body.status });
    sendSuccess(res, {
      id: doc!._id.toString(),
      key: doc!.key,
      title: doc!.title,
      status: doc!.status,
      blocks: doc!.blocks,
      publishedAt: doc!.publishedAt?.toISOString(),
    });
  }),
);
