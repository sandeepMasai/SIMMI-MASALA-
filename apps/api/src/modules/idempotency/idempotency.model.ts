import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const idempotencySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    responseStatus: { type: Number, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

export type IdempotencyDocument = InferSchemaType<typeof idempotencySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const IdempotencyModel = mongoose.model('IdempotencyRecord', idempotencySchema);
