import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: true },
);

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    guestKey: { type: String, sparse: true },
    items: [cartItemSchema],
  },
  { timestamps: true },
);

cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
cartSchema.index({ guestKey: 1 }, { unique: true, sparse: true });

export type CartDocument = InferSchemaType<typeof cartSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CartModel = mongoose.model('Cart', cartSchema);
