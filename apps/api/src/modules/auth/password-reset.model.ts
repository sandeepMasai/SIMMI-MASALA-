import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const passwordResetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

export type PasswordResetDocument = InferSchemaType<typeof passwordResetSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PasswordResetModel = mongoose.model('PasswordResetToken', passwordResetSchema);
