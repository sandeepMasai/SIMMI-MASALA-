import type { ProductDto, ProductLabelInfoDto, ProductStatus, ProductVariantDto } from '@simmi/shared';

function nonempty(value?: string | null): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function deriveStatus(doc: {
  status?: string | null;
  isActive?: boolean | null;
  isArchived?: boolean | null;
}): ProductStatus {
  if (doc.status === 'draft' || doc.status === 'active' || doc.status === 'archived') {
    return doc.status;
  }
  if (doc.isArchived) return 'archived';
  if (doc.isActive) return 'active';
  return 'draft';
}

export function mapVariant(v: {
  _id: { toString(): string };
  sku: string;
  packWeightGrams: number;
  pricePaise: number;
  compareAtPricePaise?: number | null;
  stockQuantity: number;
  reservedQuantity?: number;
  lowStockThreshold: number;
  shippingWeightGrams: number;
  isActive: boolean;
  barcode?: string | null;
  imageUrl?: string | null;
}): ProductVariantDto {
  const reserved = v.reservedQuantity ?? 0;
  return {
    id: v._id.toString(),
    sku: v.sku,
    packWeightGrams: v.packWeightGrams,
    pricePaise: v.pricePaise,
    compareAtPricePaise: v.compareAtPricePaise ?? null,
    stockQuantity: Math.max(0, v.stockQuantity - reserved),
    lowStockThreshold: v.lowStockThreshold,
    shippingWeightGrams: v.shippingWeightGrams,
    isActive: v.isActive,
    barcode: nonempty(v.barcode),
    imageUrl: nonempty(v.imageUrl),
  };
}

function mapLabelInfo(
  label: {
    ingredients?: string | null;
    productType?: string | null;
    countryOfOrigin?: string | null;
    netQuantityInfo?: string | null;
    storageInstructions?: string | null;
    shelfLife?: string | null;
    manufacturingDetails?: string | null;
    manufacturerName?: string | null;
    manufacturerAddress?: string | null;
    fssaiLicenseNumber?: string | null;
    fssaiVerified?: boolean | null;
    batchAndExpiryInfo?: string | null;
    allergenInfo?: string | null;
    usageInstructions?: string | null;
  } | null | undefined,
  opts: { publicView: boolean },
): ProductLabelInfoDto | undefined {
  if (!label) return undefined;
  const fssaiVerified = Boolean(label.fssaiVerified);
  const fssai =
    fssaiVerified && nonempty(label.fssaiLicenseNumber)
      ? nonempty(label.fssaiLicenseNumber)
      : undefined;

  const dto: ProductLabelInfoDto = {
    ingredients: nonempty(label.ingredients),
    productType: nonempty(label.productType),
    countryOfOrigin: nonempty(label.countryOfOrigin),
    netQuantityInfo: nonempty(label.netQuantityInfo),
    storageInstructions: nonempty(label.storageInstructions),
    shelfLife: nonempty(label.shelfLife),
    manufacturingDetails: nonempty(label.manufacturingDetails),
    manufacturerName: nonempty(label.manufacturerName),
    manufacturerAddress: nonempty(label.manufacturerAddress),
    batchAndExpiryInfo: nonempty(label.batchAndExpiryInfo),
    allergenInfo: nonempty(label.allergenInfo),
    usageInstructions: nonempty(label.usageInstructions),
  };

  if (opts.publicView) {
    if (fssai) {
      dto.fssaiLicenseNumber = fssai;
      dto.fssaiVerified = true;
    }
  } else {
    dto.fssaiLicenseNumber = nonempty(label.fssaiLicenseNumber);
    dto.fssaiVerified = fssaiVerified;
  }

  const hasAny = Object.values(dto).some((v) => v !== undefined && v !== false);
  return hasAny ? dto : undefined;
}

export function mapProduct(
  doc: {
    _id: { toString(): string };
    nameEn: string;
    nameHi: string;
    slug: string;
    brandName?: string | null;
    shortDescription?: string | null;
    description: string;
    categoryId: { toString(): string };
    images: { url: string; alt?: string | null; sortOrder?: number | null; publicId?: string | null }[];
    isActive: boolean;
    isFeatured: boolean;
    isArchived?: boolean | null;
    status?: string | null;
    variants: Parameters<typeof mapVariant>[0][];
    taxRateBps: number;
    seoTitle?: string | null;
    seoDescription?: string | null;
    labelInfo?: Parameters<typeof mapLabelInfo>[0];
    isPlaceholderContent?: boolean | null;
    createdAt: Date;
    updatedAt: Date;
  },
  opts: { publicView?: boolean } = {},
): ProductDto {
  const publicView = opts.publicView ?? false;
  const status = deriveStatus(doc);
  return {
    id: doc._id.toString(),
    nameEn: doc.nameEn,
    nameHi: doc.nameHi,
    slug: doc.slug,
    brandName: nonempty(doc.brandName) ?? 'SIMMI MASALA',
    shortDescription: nonempty(doc.shortDescription),
    description: doc.description,
    categoryId: doc.categoryId.toString(),
    images: (doc.images ?? []).map((img, i) => ({
      url: img.url,
      alt: img.alt ?? undefined,
      sortOrder: img.sortOrder ?? i,
      publicId: img.publicId ?? undefined,
    })),
    isActive: status === 'active',
    isFeatured: doc.isFeatured,
    isArchived: status === 'archived',
    status,
    variants: doc.variants.map(mapVariant),
    taxRateBps: doc.taxRateBps,
    seoTitle: nonempty(doc.seoTitle),
    seoDescription: nonempty(doc.seoDescription),
    labelInfo: mapLabelInfo(doc.labelInfo, { publicView }),
    isPlaceholderContent: doc.isPlaceholderContent ?? true,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
