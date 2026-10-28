import { describe, expect, it } from 'vitest';
import { productCreateSchema } from './schemas.js';

const baseVariant = {
  sku: 'SM-HALDI-100G',
  packWeightGrams: 100,
  pricePaise: 8000,
  stockQuantity: 10,
  lowStockThreshold: 5,
  isActive: true,
};

const baseProduct = {
  nameEn: 'Turmeric Powder',
  nameHi: 'हल्दी पाउडर',
  slug: 'turmeric-powder',
  categoryId: '507f1f77bcf86cd799439011',
  description: 'Ground turmeric for cooking. Placeholder pending approval.',
  shortDescription: 'Pure turmeric powder',
  status: 'draft' as const,
  variants: [baseVariant],
};

describe('productCreateSchema', () => {
  it('accepts a draft with one variant', () => {
    const parsed = productCreateSchema.parse(baseProduct);
    expect(parsed.status).toBe('draft');
    expect(parsed.variants).toHaveLength(1);
  });

  it('rejects duplicate SKUs', () => {
    const result = productCreateSchema.safeParse({
      ...baseProduct,
      variants: [
        baseVariant,
        { ...baseVariant, sku: 'sm-haldi-100g', packWeightGrams: 250, pricePaise: 18000 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate pack weights', () => {
    const result = productCreateSchema.safeParse({
      ...baseProduct,
      variants: [
        baseVariant,
        { ...baseVariant, sku: 'SM-HALDI-250G', packWeightGrams: 100, pricePaise: 9000 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('allows custom pack sizes beyond 100/250/500', () => {
    const parsed = productCreateSchema.parse({
      ...baseProduct,
      variants: [{ ...baseVariant, packWeightGrams: 1000, sku: 'SM-HALDI-1KG' }],
    });
    expect(parsed.variants[0]?.packWeightGrams).toBe(1000);
  });

  it('requires short description and active variant to publish', () => {
    const result = productCreateSchema.safeParse({
      ...baseProduct,
      shortDescription: '',
      status: 'active',
      variants: [{ ...baseVariant, isActive: false }],
    });
    expect(result.success).toBe(false);
  });

  it('blocks unverified FSSAI on publish', () => {
    const result = productCreateSchema.safeParse({
      ...baseProduct,
      status: 'active',
      labelInfo: {
        fssaiLicenseNumber: '10000000000000',
        fssaiVerified: false,
      },
    });
    expect(result.success).toBe(false);
  });

  it('allows verified FSSAI on publish', () => {
    const parsed = productCreateSchema.parse({
      ...baseProduct,
      status: 'active',
      labelInfo: {
        fssaiLicenseNumber: '10000000000000',
        fssaiVerified: true,
      },
    });
    expect(parsed.labelInfo?.fssaiVerified).toBe(true);
  });
});
