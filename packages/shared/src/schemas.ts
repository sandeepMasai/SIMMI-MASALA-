import { z } from 'zod';
import { ADMIN_ROLES, CUSTOMER_ROLE } from './roles.js';

export const indianPhoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const emailSchema = z.string().email().transform((v) => v.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/[0-9]/, 'Password must include a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: indianPhoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const addressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  fullName: z.string().trim().min(2).max(100),
  phone: indianPhoneSchema,
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  country: z.string().default('IN'),
  isDefault: z.boolean().optional(),
});

/** Common packs shown in admin UI; other positive gram values are allowed. */
export const COMMON_PACK_WEIGHTS_G = [100, 250, 500] as const;

export const packWeightGramsSchema = z
  .number({ invalid_type_error: 'Pack weight must be a number' })
  .int('Pack weight must be a whole number of grams')
  .positive('Pack weight must be greater than 0')
  .max(10000, 'Pack weight must be 10 kg or less');

export const productStatusSchema = z.enum(['draft', 'active', 'archived']);

export const productImageInputSchema = z.object({
  url: z.string().url('Image URL must be valid'),
  alt: z.string().trim().max(200).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional().default(0),
  publicId: z.string().optional(),
});

export const productLabelInfoSchema = z.object({
  ingredients: z.string().trim().max(5000).optional().or(z.literal('')),
  productType: z.string().trim().max(200).optional().or(z.literal('')),
  countryOfOrigin: z.string().trim().max(120).optional().or(z.literal('')),
  netQuantityInfo: z.string().trim().max(500).optional().or(z.literal('')),
  storageInstructions: z.string().trim().max(2000).optional().or(z.literal('')),
  shelfLife: z.string().trim().max(500).optional().or(z.literal('')),
  manufacturingDetails: z.string().trim().max(2000).optional().or(z.literal('')),
  manufacturerName: z.string().trim().max(200).optional().or(z.literal('')),
  manufacturerAddress: z.string().trim().max(1000).optional().or(z.literal('')),
  /** Only set when the business has verified the license number. */
  fssaiLicenseNumber: z.string().trim().max(50).optional().or(z.literal('')),
  fssaiVerified: z.boolean().optional().default(false),
  batchAndExpiryInfo: z.string().trim().max(1000).optional().or(z.literal('')),
  allergenInfo: z.string().trim().max(2000).optional().or(z.literal('')),
  usageInstructions: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const productVariantInputSchema = z.object({
  id: z.string().min(1).optional(),
  sku: z
    .string()
    .trim()
    .min(2, 'SKU is required')
    .max(64)
    .regex(/^[A-Za-z0-9][A-Za-z0-9-_]*$/, 'SKU may contain letters, numbers, hyphens, and underscores'),
  packWeightGrams: packWeightGramsSchema,
  pricePaise: z.number().int().min(0, 'Price must be 0 or more (paise)'),
  compareAtPricePaise: z.number().int().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  shippingWeightGrams: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
  barcode: z.string().trim().max(64).optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

function assertUniqueVariants(
  variants: z.infer<typeof productVariantInputSchema>[],
  ctx: z.RefinementCtx,
) {
  const skus = new Set<string>();
  const weights = new Set<number>();
  variants.forEach((v, index) => {
    const skuKey = v.sku.toUpperCase();
    if (skus.has(skuKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate SKU: ${v.sku}`,
        path: ['variants', index, 'sku'],
      });
    }
    skus.add(skuKey);
    if (weights.has(v.packWeightGrams)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate pack size: ${v.packWeightGrams}g`,
        path: ['variants', index, 'packWeightGrams'],
      });
    }
    weights.add(v.packWeightGrams);
    if (
      v.compareAtPricePaise != null &&
      v.compareAtPricePaise > 0 &&
      v.compareAtPricePaise < v.pricePaise
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Compare-at price must be greater than or equal to selling price',
        path: ['variants', index, 'compareAtPricePaise'],
      });
    }
  });
}

const productFieldsBase = {
  nameEn: z.string().trim().min(2).max(160),
  nameHi: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  brandName: z.string().trim().max(120).optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Category is required'),
  shortDescription: z.string().trim().max(500).optional().or(z.literal('')),
  description: z.string().trim().min(10, 'Full description must be at least 10 characters').max(20000),
  images: z.array(productImageInputSchema).optional().default([]),
  isFeatured: z.boolean().optional().default(false),
  status: productStatusSchema.optional().default('draft'),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  taxRateBps: z.number().int().min(0).max(10000).optional().default(0),
  seoTitle: z.string().trim().max(160).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(320).optional().or(z.literal('')),
  isPlaceholderContent: z.boolean().optional().default(false),
  labelInfo: productLabelInfoSchema.optional().default({}),
  variants: z.array(productVariantInputSchema).min(1, 'At least one pack variant is required'),
};

export const productCreateSchema = z
  .object(productFieldsBase)
  .superRefine((data, ctx) => {
    assertUniqueVariants(data.variants, ctx);
    if (data.status === 'active') {
      if (!data.shortDescription?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Short description is required to publish',
          path: ['shortDescription'],
        });
      }
      if (!data.variants.some((v) => v.isActive)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one active pack variant is required to publish',
          path: ['variants'],
        });
      }
      if (data.labelInfo?.fssaiLicenseNumber?.trim() && !data.labelInfo.fssaiVerified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mark FSSAI as verified before publishing a license number, or clear the field',
          path: ['labelInfo', 'fssaiVerified'],
        });
      }
    }
  });

export const productUpdateSchema = z
  .object({
    ...productFieldsBase,
    variants: z.array(productVariantInputSchema).min(1).optional(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (data.variants) assertUniqueVariants(data.variants, ctx);
    if (data.status === 'active') {
      if (data.shortDescription !== undefined && !data.shortDescription.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Short description is required to publish',
          path: ['shortDescription'],
        });
      }
      if (
        data.labelInfo?.fssaiLicenseNumber?.trim() &&
        data.labelInfo.fssaiVerified === false
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mark FSSAI as verified before publishing a license number, or clear the field',
          path: ['labelInfo', 'fssaiVerified'],
        });
      }
    }
  });

export const cartItemInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  addressId: z.string().optional(),
  address: addressSchema.optional(),
  paymentMethod: z.enum(['razorpay', 'cod']),
  couponCode: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().min(8).max(128),
});

export const orderStatusSchema = z.enum([
  'pending_payment',
  'placed',
  'payment_confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]);

export const paymentStatusSchema = z.enum([
  'pending',
  'authorized',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);

export const couponTypeSchema = z.enum(['percentage', 'fixed']);

export const roleSchema = z.enum([CUSTOMER_ROLE, ...ADMIN_ROLES]);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
export type ProductLabelInfoInput = z.infer<typeof productLabelInfoSchema>;
