import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const DRAFT_NOTICE =
  'DRAFT: Policy content below is a development placeholder pending business-owner approval. It is not legal advice.';

const settingsSchema = new Schema(
  {
    singletonKey: { type: String, unique: true, default: 'store' },
    brandName: { type: String, default: 'SIMMI MASALA' },
    tagline: { type: String, default: 'हर रसोई की पहचान' },
    email: { type: String, default: 'SimmiMasala@gmail.com' },
    phone: { type: String, default: '9772512267' },
    whatsappNumber: { type: String, default: '9772512267' },
    addressLine1: { type: String, default: 'Village Salpuri' },
    city: { type: String, default: 'Alwar' },
    state: { type: String, default: 'Rajasthan' },
    postalCode: { type: String, default: '301030' },
    country: { type: String, default: 'IN' },
    currency: { type: String, default: 'INR' },
    shippingFlatPaise: { type: Number, default: 5000 },
    freeShippingThresholdPaise: { type: Number, default: 49900 },
    codEnabled: { type: Boolean, default: true },
    taxRateBps: { type: Number, default: 0 },
    logoUrl: { type: String },
    featuredProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    policies: {
      privacy: { type: String, default: `${DRAFT_NOTICE}\n\nWe collect account and order information to fulfill purchases.` },
      terms: { type: String, default: `${DRAFT_NOTICE}\n\nBy placing an order you agree to our draft terms.` },
      shipping: { type: String, default: `${DRAFT_NOTICE}\n\nShipping charges and timelines are configured in store settings.` },
      returns: { type: String, default: `${DRAFT_NOTICE}\n\nReturn eligibility will be confirmed by the business owner.` },
      cancellation: { type: String, default: `${DRAFT_NOTICE}\n\nCancellations may be requested before shipment when eligible.` },
      faq: { type: String, default: `${DRAFT_NOTICE}\n\nQ: Where are you based?\nA: Village Salpuri, Alwar, Rajasthan 301030.` },
      about: {
        type: String,
        default:
          'SIMMI MASALA is an Indian spices brand based in Village Salpuri, Alwar, Rajasthan. Tagline: हर रसोई की पहचान.',
      },
    },
    draftPolicyNotice: { type: String, default: DRAFT_NOTICE },
  },
  { timestamps: true },
);

export type StoreSettingsDocument = InferSchemaType<typeof settingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StoreSettingsModel = mongoose.model('StoreSettings', settingsSchema);
