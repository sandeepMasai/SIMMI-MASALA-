import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const inventoryMovementSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, required: true, index: true },
    sku: { type: String, required: true },
    quantityChange: { type: Number, required: true },
    reason: {
      type: String,
      enum: [
        'manual_adjustment',
        'order_reservation',
        'order_commit',
        'reservation_release',
        'order_cancel_restore',
        'payment_failure_restore',
        'refund_restore',
        'seed',
      ],
      required: true,
    },
    note: { type: String },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    resultingStock: { type: Number, required: true },
  },
  { timestamps: true },
);

export type InventoryMovementDocument = InferSchemaType<typeof inventoryMovementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InventoryMovementModel = mongoose.model('InventoryMovement', inventoryMovementSchema);
