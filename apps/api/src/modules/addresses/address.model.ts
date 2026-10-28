import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'IN' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type AddressDocument = InferSchemaType<typeof addressSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AddressModel = mongoose.model('Address', addressSchema);
