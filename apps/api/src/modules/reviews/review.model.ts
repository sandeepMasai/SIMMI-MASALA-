import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/** Reviews are only shown when real moderated records exist — no seed fake reviews. */
const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: { type: String },
    body: { type: String, required: true },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type ReviewDocument = InferSchemaType<typeof reviewSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReviewModel = mongoose.model('Review', reviewSchema);
