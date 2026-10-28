import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderPaise: { type: Number, default: 0 },
    maxDiscountPaise: { type: Number },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number },
    perCustomerLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    eligibleProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    eligibleCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponDocument = InferSchemaType<typeof couponSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CouponModel = mongoose.model('Coupon', couponSchema);
