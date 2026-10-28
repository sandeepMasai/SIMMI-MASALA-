import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    productNameEn: { type: String, required: true },
    productNameHi: { type: String, required: true },
    sku: { type: String, required: true },
    packWeightGrams: { type: Number, required: true },
    unitPricePaise: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotalPaise: { type: Number, required: true },
    taxPaise: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const addressSnapshotSchema = new Schema(
  {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false },
);

const statusEventSchema = new Schema(
  {
    status: { type: String, required: true },
    note: String,
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const reservationSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    released: { type: Boolean, default: false },
    committed: { type: Boolean, default: false },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'placed',
        'payment_confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
      ],
      default: 'pending_payment',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
    items: [orderItemSchema],
    shippingAddress: { type: addressSnapshotSchema, required: true },
    subtotalPaise: { type: Number, required: true },
    discountPaise: { type: Number, required: true, default: 0 },
    taxPaise: { type: Number, required: true, default: 0 },
    shippingPaise: { type: Number, required: true, default: 0 },
    totalPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    couponCode: { type: String },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    notes: { type: String },
    internalNotes: { type: String },
    statusHistory: [statusEventSchema],
    trackingNumber: { type: String },
    courierName: { type: String },
    idempotencyKey: { type: String, required: true },
    reservations: [reservationSchema],
    stockCommitted: { type: Boolean, default: false },
    stockRestored: { type: Boolean, default: false },
    razorpayOrderId: { type: String, index: true, sparse: true },
    cancelledAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1, status: 1 });
orderSchema.index({ idempotencyKey: 1, userId: 1 }, { unique: true });

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OrderModel = mongoose.model('Order', orderSchema);
