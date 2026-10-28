import mongoose from 'mongoose';
import { ProductModel } from '../products/product.model.js';
import { InventoryMovementModel } from './inventory-movement.model.js';
import { AppError } from '../../utils/errors.js';
import { env } from '../../config/env.js';

/**
 * Reserve stock for checkout.
 * Uses an aggregation-pipeline update so reservation only succeeds when
 * (stockQuantity - reservedQuantity) >= quantity for the target variant.
 */
export async function reserveStock(items: { productId: string; variantId: string; quantity: number }[]) {
  const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60 * 1000);
  const reserved: {
    productId: string;
    variantId: string;
    quantity: number;
    expiresAt: Date;
    sku: string;
  }[] = [];

  for (const item of items) {
    const variantOid = new mongoose.Types.ObjectId(item.variantId);
    const productOid = new mongoose.Types.ObjectId(item.productId);

    const before = await ProductModel.findById(item.productId);
    if (!before || !before.isActive || before.isArchived) {
      if (reserved.length) await releaseReservations(reserved, 'reservation_release');
      throw new AppError('NOT_FOUND', 'Product not found', 404);
    }
    const beforeVariant = before.variants.id(item.variantId);
    if (!beforeVariant || !beforeVariant.isActive) {
      if (reserved.length) await releaseReservations(reserved, 'reservation_release');
      throw new AppError('NOT_FOUND', 'Variant not found', 404);
    }
    const beforeReserved = beforeVariant.reservedQuantity;

    const updated = await ProductModel.findOneAndUpdate(
      { _id: productOid, isActive: true, isArchived: false },
      [
        {
          $set: {
            variants: {
              $map: {
                input: '$variants',
                as: 'v',
                in: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$$v._id', variantOid] },
                        { $eq: ['$$v.isActive', true] },
                        {
                          $gte: [
                            { $subtract: ['$$v.stockQuantity', '$$v.reservedQuantity'] },
                            item.quantity,
                          ],
                        },
                      ],
                    },
                    {
                      $mergeObjects: [
                        '$$v',
                        { reservedQuantity: { $add: ['$$v.reservedQuantity', item.quantity] } },
                      ],
                    },
                    '$$v',
                  ],
                },
              },
            },
          },
        },
      ],
      { new: true },
    );

    if (!updated) {
      if (reserved.length) await releaseReservations(reserved, 'reservation_release');
      throw new AppError('NOT_FOUND', 'Product not found', 404);
    }

    const variant = updated.variants.id(item.variantId);
    if (!variant) {
      if (reserved.length) await releaseReservations(reserved, 'reservation_release');
      throw new AppError('NOT_FOUND', 'Variant not found', 404);
    }

    if (variant.reservedQuantity !== beforeReserved + item.quantity) {
      if (reserved.length) await releaseReservations(reserved, 'reservation_release');
      throw new AppError('INSUFFICIENT_STOCK', `Insufficient stock for SKU ${variant.sku}`, 409, {
        sku: variant.sku,
        available: Math.max(0, variant.stockQuantity - variant.reservedQuantity),
      });
    }

    await InventoryMovementModel.create({
      productId: item.productId,
      variantId: item.variantId,
      sku: variant.sku,
      quantityChange: 0,
      reason: 'order_reservation',
      resultingStock: variant.stockQuantity - variant.reservedQuantity,
      note: `Reserved ${item.quantity}`,
    });

    reserved.push({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      expiresAt,
      sku: variant.sku,
    });
  }

  return reserved;
}

export async function releaseReservations(
  items: { productId: string; variantId: string; quantity: number }[],
  reason: 'reservation_release' | 'payment_failure_restore' | 'order_cancel_restore' | 'refund_restore',
  orderId?: string,
) {
  for (const item of items) {
    const doc = await ProductModel.findById(item.productId);
    if (!doc) continue;
    const variant = doc.variants.id(item.variantId);
    if (!variant) continue;
    variant.reservedQuantity = Math.max(0, variant.reservedQuantity - item.quantity);
    await doc.save();
    await InventoryMovementModel.create({
      productId: item.productId,
      variantId: item.variantId,
      sku: variant.sku,
      quantityChange: 0,
      reason,
      orderId,
      resultingStock: variant.stockQuantity - variant.reservedQuantity,
      note: `Released reservation ${item.quantity}`,
    });
  }
}

export async function commitReservations(
  items: { productId: string; variantId: string; quantity: number }[],
  orderId: string,
) {
  for (const item of items) {
    const doc = await ProductModel.findById(item.productId);
    if (!doc) throw new AppError('NOT_FOUND', 'Product not found during stock commit', 404);
    const variant = doc.variants.id(item.variantId);
    if (!variant) throw new AppError('NOT_FOUND', 'Variant not found during stock commit', 404);
    if (variant.reservedQuantity < item.quantity || variant.stockQuantity < item.quantity) {
      throw new AppError('INSUFFICIENT_STOCK', `Cannot commit stock for ${variant.sku}`, 409);
    }
    variant.reservedQuantity -= item.quantity;
    variant.stockQuantity -= item.quantity;
    await doc.save();
    await InventoryMovementModel.create({
      productId: item.productId,
      variantId: item.variantId,
      sku: variant.sku,
      quantityChange: -item.quantity,
      reason: 'order_commit',
      orderId,
      resultingStock: variant.stockQuantity - variant.reservedQuantity,
    });
  }
}

export async function adjustStock(input: {
  productId: string;
  variantId: string;
  quantityChange: number;
  note: string;
  actorId: string;
}) {
  const productOid = new mongoose.Types.ObjectId(input.productId);
  const variantOid = new mongoose.Types.ObjectId(input.variantId);
  const delta = input.quantityChange;

  const updated = await ProductModel.findOneAndUpdate(
    {
      _id: productOid,
      variants: {
        $elemMatch: {
          _id: variantOid,
          ...(delta < 0 ? { stockQuantity: { $gte: Math.abs(delta) } } : {}),
        },
      },
    },
    { $inc: { 'variants.$[v].stockQuantity': delta } },
    {
      new: true,
      arrayFilters: [{ 'v._id': variantOid }],
    },
  );

  if (!updated) {
    const exists = await ProductModel.findById(input.productId);
    if (!exists || !exists.variants.id(input.variantId)) {
      throw new AppError('NOT_FOUND', 'Product or variant not found', 404);
    }
    throw new AppError('VALIDATION_ERROR', 'Stock cannot be negative', 400);
  }

  const variant = updated.variants.id(input.variantId)!;
  await InventoryMovementModel.create({
    productId: input.productId,
    variantId: input.variantId,
    sku: variant.sku,
    quantityChange: input.quantityChange,
    reason: 'manual_adjustment',
    note: input.note,
    actorId: input.actorId,
    resultingStock: variant.stockQuantity - variant.reservedQuantity,
  });
  return variant;
}

export async function expireReservations() {
  const { OrderModel } = await import('../orders/order.model.js');
  const now = new Date();
  const stale = await OrderModel.find({
    status: 'pending_payment',
    'reservations.expiresAt': { $lt: now },
    'reservations.released': false,
    stockCommitted: false,
  }).limit(50);

  for (const order of stale) {
    const toRelease = (order.reservations ?? [])
      .filter((r) => !r.released && !r.committed && r.expiresAt < now)
      .map((r) => ({
        productId: r.productId.toString(),
        variantId: r.variantId.toString(),
        quantity: r.quantity,
      }));
    if (!toRelease.length) continue;
    await releaseReservations(toRelease, 'reservation_release', order._id.toString());
    for (const r of order.reservations ?? []) {
      if (!r.released && !r.committed && r.expiresAt < now) r.released = true;
    }
    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', note: 'Reservation expired', at: new Date() });
    order.stockRestored = true;
    await order.save();
  }
}

export async function withOptionalTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>,
) {
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session?.inTransaction()) await session.abortTransaction();
    if (
      err &&
      typeof err === 'object' &&
      'message' in err &&
      String((err as Error).message).includes('Transaction numbers')
    ) {
      return fn(null);
    }
    throw err;
  } finally {
    await session?.endSession();
  }
}
