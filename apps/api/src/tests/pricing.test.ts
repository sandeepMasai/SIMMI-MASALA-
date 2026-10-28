import { describe, expect, it } from 'vitest';
import {
  computeLineTax,
  computeOrderTotals,
  computeShipping,
  validateAndComputeCouponDiscount,
} from '../modules/orders/pricing.service.js';

describe('pricing', () => {
  it('computes line tax in basis points', () => {
    expect(computeLineTax(10000, 500)).toBe(500);
    expect(computeLineTax(10000, 0)).toBe(0);
  });

  it('applies free shipping threshold', () => {
    expect(
      computeShipping(50000, { shippingFlatPaise: 5000, freeShippingThresholdPaise: 49900 }),
    ).toBe(0);
    expect(
      computeShipping(10000, { shippingFlatPaise: 5000, freeShippingThresholdPaise: 49900 }),
    ).toBe(5000);
  });

  it('computes totals with discount', () => {
    const totals = computeOrderTotals(
      [
        {
          productId: '1',
          variantId: '1',
          productNameEn: 'Turmeric',
          productNameHi: 'हल्दी',
          sku: 'T-100',
          packWeightGrams: 100,
          unitPricePaise: 8000,
          quantity: 2,
          lineTotalPaise: 16000,
          taxPaise: 0,
          taxRateBps: 0,
          categoryId: 'c1',
        },
      ],
      1000,
      { shippingFlatPaise: 5000, freeShippingThresholdPaise: 49900, taxRateBps: 0 },
    );
    expect(totals.subtotalPaise).toBe(16000);
    expect(totals.discountPaise).toBe(1000);
    expect(totals.shippingPaise).toBe(5000);
    expect(totals.totalPaise).toBe(20000);
  });

  it('validates percentage coupons', () => {
    const discount = validateAndComputeCouponDiscount(
      {
        isActive: true,
        startsAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 100000),
        usageLimit: 10,
        usedCount: 0,
        perCustomerLimit: 1,
        minOrderPaise: 0,
        type: 'percentage',
        value: 10,
        maxDiscountPaise: 5000,
        eligibleProductIds: [],
        eligibleCategoryIds: [],
      } as never,
      [],
      20000,
      0,
    );
    expect(discount).toBe(2000);
  });
});
