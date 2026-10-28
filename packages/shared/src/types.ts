import type { OrderStatus, PaymentStatus, ProductStatus } from './schemas.js';
import type { Permission, UserRole } from './roles.js';

export interface MoneyFields {
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  shippingPaise: number;
  totalPaise: number;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  packWeightGrams: number;
  pricePaise: number;
  compareAtPricePaise?: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  shippingWeightGrams: number;
  isActive: boolean;
  barcode?: string;
  imageUrl?: string;
}

export interface ProductImageDto {
  url: string;
  alt?: string;
  sortOrder: number;
  publicId?: string;
}

/** Optional packaged-food / label fields — only populated when business-supplied. */
export interface ProductLabelInfoDto {
  ingredients?: string;
  productType?: string;
  countryOfOrigin?: string;
  netQuantityInfo?: string;
  storageInstructions?: string;
  shelfLife?: string;
  manufacturingDetails?: string;
  manufacturerName?: string;
  manufacturerAddress?: string;
  /** Present only when verified by the business. */
  fssaiLicenseNumber?: string;
  fssaiVerified?: boolean;
  batchAndExpiryInfo?: string;
  allergenInfo?: string;
  usageInstructions?: string;
}

export interface ProductDto {
  id: string;
  nameEn: string;
  nameHi: string;
  slug: string;
  brandName?: string;
  shortDescription?: string;
  description: string;
  categoryId: string;
  categorySlug?: string;
  images: ProductImageDto[];
  isActive: boolean;
  isFeatured: boolean;
  isArchived?: boolean;
  status: ProductStatus;
  variants: ProductVariantDto[];
  taxRateBps: number;
  seoTitle?: string;
  seoDescription?: string;
  labelInfo?: ProductLabelInfoDto;
  isPlaceholderContent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDto {
  id: string;
  nameEn: string;
  nameHi: string;
  slug: string;
  description?: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  permissions?: Permission[];
  emailVerified: boolean;
  accountStatus: 'active' | 'disabled' | 'deletion_requested';
  createdAt: string;
}

export interface CartItemDto {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  productNameEn: string;
  productNameHi: string;
  productSlug: string;
  sku: string;
  packWeightGrams: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  imageUrl?: string;
  availableStock: number;
}

export interface CartDto extends MoneyFields {
  id: string;
  items: CartItemDto[];
  currency: 'INR';
}

export interface OrderItemDto {
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
}

export interface AddressSnapshotDto {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderStatusEventDto {
  status: OrderStatus;
  note?: string;
  at: string;
  by?: string;
}

export interface OrderDto extends MoneyFields {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'razorpay' | 'cod';
  items: OrderItemDto[];
  shippingAddress: AddressSnapshotDto;
  statusHistory: OrderStatusEventDto[];
  couponCode?: string;
  notes?: string;
  trackingNumber?: string;
  courierName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettingsDto {
  brandName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  currency: 'INR';
  shippingFlatPaise: number;
  freeShippingThresholdPaise: number | null;
  codEnabled: boolean;
  taxRateBps: number;
  logoUrl?: string;
  policies: {
    privacy: string;
    terms: string;
    shipping: string;
    returns: string;
    cancellation: string;
    faq: string;
    about: string;
  };
  featuredProductIds: string[];
  razorpayConfigured: boolean;
  emailConfigured: boolean;
  draftPolicyNotice: string;
}
