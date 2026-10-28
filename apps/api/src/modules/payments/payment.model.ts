import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const paymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: String, enum: ['razorpay', 'cod'], required: true },
    providerOrderId: { type: String, index: true, sparse: true },
    providerPaymentId: { type: String, sparse: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    verificationMeta: { type: Schema.Types.Mixed },
    rawEventIds: [{ type: String }],
  },
  { timestamps: true },
);

paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PaymentModel = mongoose.model('Payment', paymentSchema);
