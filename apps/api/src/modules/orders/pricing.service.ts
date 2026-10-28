import { applyPercentageDiscount, clampDiscount } from '@simmi/shared';
import type { CouponDocument } from '../coupons/coupon.model.js';
import { AppError } from '../../utils/errors.js';

export interface PricedLine {
  productId: string;
  variantId: string;
  productNameEn: string;
  productNameHi: string;
  sku: string;
  packWeightGrams: number;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  taxPaise: number;
  taxRateBps: number;
  categoryId: string;
}

export function computeLineTax(lineTotalPaise: number, taxRateBps: number): number {
  if (taxRateBps <= 0) return 0;
  return Math.round((lineTotalPaise * taxRateBps) / 10_000);
}

export function computeShipping(
  subtotalAfterDiscountPaise: number,
  settings: {
    shippingFlatPaise?: number | null;
    freeShippingThresholdPaise?: number | null;
  },
): number {
  const threshold = settings.freeShippingThresholdPaise;
  if (threshold != null && subtotalAfterDiscountPaise >= threshold) return 0;
  return settings.shippingFlatPaise ?? 0;
}

export function validateAndComputeCouponDiscount(
  coupon: CouponDocument | null,
  lines: PricedLine[],
  subtotalPaise: number,
  customerUsageCount: number,
): number {
  if (!coupon) return 0;
  const now = Date.now();
  if (!coupon.isActive) throw new AppError('INVALID_COUPON', 'Coupon is inactive', 400);
  if (coupon.startsAt.getTime() > now || coupon.expiresAt.getTime() < now) {
    throw new AppError('INVALID_COUPON', 'Coupon is not currently valid', 400);
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('INVALID_COUPON', 'Coupon usage limit reached', 400);
  }
  if (coupon.perCustomerLimit != null && customerUsageCount >= coupon.perCustomerLimit) {
    throw new AppError('INVALID_COUPON', 'You have already used this coupon', 400);
  }
  if (subtotalPaise < (coupon.minOrderPaise ?? 0)) {
    throw new AppError('INVALID_COUPON', 'Order does not meet coupon minimum', 400);
  }

  let eligibleSubtotal = subtotalPaise;
  const productIds = new Set((coupon.eligibleProductIds ?? []).map((id) => id.toString()));
  const categoryIds = new Set((coupon.eligibleCategoryIds ?? []).map((id) => id.toString()));
  if (productIds.size || categoryIds.size) {
    eligibleSubtotal = lines
      .filter(
        (l) =>
          (productIds.size ? productIds.has(l.productId) : false) ||
          (categoryIds.size ? categoryIds.has(l.categoryId) : false),
      )
      .reduce((sum, l) => sum + l.lineTotalPaise, 0);
    if (eligibleSubtotal <= 0) {
      throw new AppError('INVALID_COUPON', 'Coupon does not apply to cart items', 400);
    }
  }

  let discount =
    coupon.type === 'percentage'
      ? applyPercentageDiscount(eligibleSubtotal, coupon.value)
      : Math.min(eligibleSubtotal, coupon.value);

  discount = clampDiscount(discount, coupon.maxDiscountPaise ?? null);
  return discount;
}

export function computeOrderTotals(
  lines: PricedLine[],
  discountPaise: number,
  settings: {
    shippingFlatPaise?: number | null;
    freeShippingThresholdPaise?: number | null;
    taxRateBps?: number | null;
  },
) {
  const subtotalPaise = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  const safeDiscount = Math.min(Math.max(0, discountPaise), subtotalPaise);
  const afterDiscount = subtotalPaise - safeDiscount;
  const lineTax = lines.reduce((s, l) => s + l.taxPaise, 0);
  const taxRate = settings.taxRateBps ?? 0;
  const storeTax = taxRate > 0 ? Math.round((afterDiscount * taxRate) / 10_000) : 0;
  const taxPaise = lineTax > 0 ? lineTax : storeTax;
  const shippingPaise = computeShipping(afterDiscount, settings);
  const totalPaise = afterDiscount + taxPaise + shippingPaise;
  return { subtotalPaise, discountPaise: safeDiscount, taxPaise, shippingPaise, totalPaise };
}
