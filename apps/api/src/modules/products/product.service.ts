import type { ProductCreateInput, ProductUpdateInput, ProductVariantInput } from '@simmi/shared';
import { ProductModel } from './product.model.js';
import { AppError } from '../../utils/errors.js';

export function normalizeVariantInput(v: ProductVariantInput) {
  return {
    sku: v.sku.trim().toUpperCase(),
    packWeightGrams: v.packWeightGrams,
    pricePaise: v.pricePaise,
    compareAtPricePaise: v.compareAtPricePaise ?? null,
    stockQuantity: v.stockQuantity,
    lowStockThreshold: v.lowStockThreshold ?? 5,
    shippingWeightGrams: v.shippingWeightGrams ?? v.packWeightGrams + 20,
    isActive: v.isActive ?? true,
    barcode: v.barcode?.trim() || undefined,
    imageUrl: v.imageUrl?.trim() || undefined,
  };
}

export async function assertSkuAvailable(skus: string[], excludeProductId?: string) {
  const normalized = skus.map((s) => s.trim().toUpperCase());
  const clash = await ProductModel.findOne({
    'variants.sku': { $in: normalized },
    ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
  }).select('nameEn variants.sku');
  if (!clash) return;
  const used = new Set(clash.variants.map((v) => v.sku.toUpperCase()));
  const dup = normalized.find((s) => used.has(s));
  throw new AppError('CONFLICT', `SKU already in use: ${dup}`, 409);
}

export async function assertSlugAvailable(slug: string, excludeProductId?: string) {
  const existing = await ProductModel.findOne({
    slug,
    ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
  }).select('_id');
  if (existing) throw new AppError('CONFLICT', 'Product slug already exists', 409);
}

export function sanitizeLabelInfo(label: ProductCreateInput['labelInfo'] | ProductUpdateInput['labelInfo']) {
  if (!label) return {};
  return { ...label };
}
