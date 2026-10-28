import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const contentSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    /** Flexible JSON blocks (hero, story, banners). Only business-supplied facts. */
    blocks: { type: Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

export type ContentDocument = InferSchemaType<typeof contentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ContentModel = mongoose.model('ContentPage', contentSchema);
