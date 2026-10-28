import type { StoreSettingsDto } from '@simmi/shared';
import { StoreSettingsModel } from './settings.model.js';
import { isEmailConfigured, isRazorpayConfigured } from '../../config/env.js';

export async function getOrCreateSettings() {
  let doc = await StoreSettingsModel.findOne({ singletonKey: 'store' });
  if (!doc) doc = await StoreSettingsModel.create({ singletonKey: 'store' });
  return doc;
}

export function mapSettings(doc: Awaited<ReturnType<typeof getOrCreateSettings>>): StoreSettingsDto {
  return {
    brandName: doc.brandName,
    tagline: doc.tagline,
    email: doc.email,
    phone: doc.phone,
    whatsappNumber: doc.whatsappNumber,
    addressLine1: doc.addressLine1,
    city: doc.city,
    state: doc.state,
    postalCode: doc.postalCode,
    country: doc.country,
    currency: 'INR',
    shippingFlatPaise: doc.shippingFlatPaise,
    freeShippingThresholdPaise: doc.freeShippingThresholdPaise,
    codEnabled: doc.codEnabled,
    taxRateBps: doc.taxRateBps,
    logoUrl: doc.logoUrl ?? undefined,
    policies: {
      privacy: doc.policies?.privacy ?? '',
      terms: doc.policies?.terms ?? '',
      shipping: doc.policies?.shipping ?? '',
      returns: doc.policies?.returns ?? '',
      cancellation: doc.policies?.cancellation ?? '',
      faq: doc.policies?.faq ?? '',
      about: doc.policies?.about ?? '',
    },
    featuredProductIds: (doc.featuredProductIds ?? []).map((id) => id.toString()),
    razorpayConfigured: isRazorpayConfigured(),
    emailConfigured: isEmailConfigured(),
    draftPolicyNotice: doc.draftPolicyNotice,
  };
}
