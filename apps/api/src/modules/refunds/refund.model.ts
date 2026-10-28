import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const refundSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    amountPaise: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['requested', 'processing', 'completed', 'failed'],
      default: 'requested',
    },
    providerRefundId: { type: String },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export type RefundDocument = InferSchemaType<typeof refundSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RefundModel = mongoose.model('Refund', refundSchema);
