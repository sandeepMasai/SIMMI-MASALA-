import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { ADMIN_ROLES, CUSTOMER_ROLE, type Permission } from '@simmi/shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [CUSTOMER_ROLE, ...ADMIN_ROLES],
      default: CUSTOMER_ROLE,
      index: true,
    },
    permissionsOverride: [{ type: String }],
    accountStatus: {
      type: String,
      enum: ['active', 'disabled', 'deletion_requested'],
      default: 'active',
      index: true,
    },
    emailVerifiedAt: { type: Date },
    emailVerificationTokenHash: { type: String, select: false },
    lastLoginAt: { type: Date },
    supportNotes: { type: String },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  permissionsOverride?: Permission[];
};

export const UserModel = mongoose.model('User', userSchema);
