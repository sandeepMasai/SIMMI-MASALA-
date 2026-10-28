import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const variantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true },
    packWeightGrams: { type: Number, required: true, min: 1, max: 10000 },
    pricePaise: { type: Number, required: true, min: 0 },
    compareAtPricePaise: { type: Number, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
    shippingWeightGrams: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
    barcode: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
  },
  { _id: true },
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const labelInfoSchema = new Schema(
  {
    ingredients: { type: String },
    productType: { type: String },
    countryOfOrigin: { type: String },
    netQuantityInfo: { type: String },
    storageInstructions: { type: String },
    shelfLife: { type: String },
    manufacturingDetails: { type: String },
    manufacturerName: { type: String },
    manufacturerAddress: { type: String },
    fssaiLicenseNumber: { type: String },
    fssaiVerified: { type: Boolean, default: false },
    batchAndExpiryInfo: { type: String },
    allergenInfo: { type: String },
    usageInstructions: { type: String },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    nameEn: { type: String, required: true, index: 'text' },
    nameHi: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    brandName: { type: String, default: 'SIMMI MASALA' },
    shortDescription: { type: String, default: '' },
    description: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    images: [imageSchema],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
    isActive: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    variants: { type: [variantSchema], validate: [(v: unknown[]) => v.length > 0, 'At least one variant'] },
    taxRateBps: { type: Number, default: 0, min: 0 },
    seoTitle: { type: String },
    seoDescription: { type: String },
    labelInfo: { type: labelInfoSchema, default: () => ({}) },
    isPlaceholderContent: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ isActive: 1, isArchived: 1, createdAt: -1 });
productSchema.index({ status: 1, updatedAt: -1 });

/** Keep legacy boolean flags in sync with status for existing storefront queries. */
productSchema.pre('save', function syncStatusFlags(next) {
  if (this.isModified('status') || this.isNew) {
    if (this.status === 'active') {
      this.isActive = true;
      this.isArchived = false;
    } else if (this.status === 'archived') {
      this.isActive = false;
      this.isArchived = true;
    } else {
      this.isActive = false;
      this.isArchived = false;
    }
  } else if (this.isModified('isArchived') && this.isArchived) {
    this.status = 'archived';
    this.isActive = false;
  } else if (this.isModified('isActive') && !this.isModified('status')) {
    if (this.isArchived) this.status = 'archived';
    else this.status = this.isActive ? 'active' : 'draft';
  }
  next();
});

export type ProductDocument = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductModel = mongoose.model('Product', productSchema);
