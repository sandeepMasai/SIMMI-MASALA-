import type { CartDto, CartItemDto } from '@simmi/shared';
import { CartModel } from './cart.model.js';
import { ProductModel } from '../products/product.model.js';
import { StoreSettingsModel } from '../settings/settings.model.js';
import { computeLineTax, computeOrderTotals } from '../orders/pricing.service.js';
import { AppError } from '../../utils/errors.js';

async function getOrCreateCart(userId?: string, guestKey?: string) {
  if (userId) {
    let cart = await CartModel.findOne({ userId });
    if (!cart) cart = await CartModel.create({ userId, items: [] });
    return cart;
  }
  if (!guestKey) throw new AppError('VALIDATION_ERROR', 'Guest cart key required', 400);
  let cart = await CartModel.findOne({ guestKey });
  if (!cart) cart = await CartModel.create({ guestKey, items: [] });
  return cart;
}

export async function hydrateCart(cartId: string): Promise<CartDto> {
  const cart = await CartModel.findById(cartId);
  if (!cart) throw new AppError('NOT_FOUND', 'Cart not found', 404);
  const settings = (await StoreSettingsModel.findOne({ singletonKey: 'store' })) ?? {
    shippingFlatPaise: 5000,
    freeShippingThresholdPaise: 49900,
    taxRateBps: 0,
  };

  const items: CartItemDto[] = [];
  for (const item of cart.items) {
    const product = await ProductModel.findById(item.productId);
    if (!product || product.isArchived || !product.isActive) continue;
    const variant = product.variants.id(item.variantId);
    if (!variant || !variant.isActive) continue;
    const available = Math.max(0, variant.stockQuantity - variant.reservedQuantity);
    const qty = Math.min(item.quantity, Math.max(available, 1));
    const lineTotal = variant.pricePaise * qty;
    items.push({
      id: item._id!.toString(),
      productId: product._id.toString(),
      variantId: variant._id.toString(),
      quantity: qty,
      productNameEn: product.nameEn,
      productNameHi: product.nameHi,
      productSlug: product.slug,
      sku: variant.sku,
      packWeightGrams: variant.packWeightGrams,
      unitPricePaise: variant.pricePaise,
      lineTotalPaise: lineTotal,
      imageUrl: product.images[0]?.url,
      availableStock: available,
    });
  }

  const priced = items.map((i) => {
    const productTax = 0;
    return {
      ...i,
      taxPaise: computeLineTax(i.lineTotalPaise, productTax),
      taxRateBps: 0,
      categoryId: '',
    };
  });

  const totals = computeOrderTotals(
    priced.map((p) => ({
      productId: p.productId,
      variantId: p.variantId,
      productNameEn: p.productNameEn,
      productNameHi: p.productNameHi,
      sku: p.sku,
      packWeightGrams: p.packWeightGrams,
      unitPricePaise: p.unitPricePaise,
      quantity: p.quantity,
      lineTotalPaise: p.lineTotalPaise,
      taxPaise: p.taxPaise,
      taxRateBps: p.taxRateBps,
      categoryId: p.categoryId,
    })),
    0,
    settings,
  );

  return {
    id: cart._id.toString(),
    items,
    currency: 'INR',
    ...totals,
  };
}

export async function getCartDto(userId?: string, guestKey?: string) {
  const cart = await getOrCreateCart(userId, guestKey);
  return hydrateCart(cart._id.toString());
}

export async function addCartItem(
  input: { productId: string; variantId: string; quantity: number },
  userId?: string,
  guestKey?: string,
) {
  const product = await ProductModel.findById(input.productId);
  if (!product || !product.isActive || product.isArchived) {
    throw new AppError('NOT_FOUND', 'Product not available', 404);
  }
  const variant = product.variants.id(input.variantId);
  if (!variant || !variant.isActive) throw new AppError('NOT_FOUND', 'Variant not available', 404);
  const available = variant.stockQuantity - variant.reservedQuantity;
  if (available < input.quantity) {
    throw new AppError('INSUFFICIENT_STOCK', 'Not enough stock', 409, { available });
  }

  const cart = await getOrCreateCart(userId, guestKey);
  const existing = cart.items.find(
    (i) => i.productId.toString() === input.productId && i.variantId.toString() === input.variantId,
  );
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + input.quantity);
    if (existing.quantity > available) {
      throw new AppError('INSUFFICIENT_STOCK', 'Not enough stock', 409, { available });
    }
  } else {
    cart.items.push({
      productId: product._id,
      variantId: variant._id,
      quantity: input.quantity,
    } as never);
  }
  await cart.save();
  return hydrateCart(cart._id.toString());
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
  userId?: string,
  guestKey?: string,
) {
  const cart = await getOrCreateCart(userId, guestKey);
  const item = cart.items.id(itemId);
  if (!item) throw new AppError('NOT_FOUND', 'Cart item not found', 404);
  if (quantity <= 0) {
    item.deleteOne();
  } else {
    const product = await ProductModel.findById(item.productId);
    const variant = product?.variants.id(item.variantId);
    const available = variant ? variant.stockQuantity - variant.reservedQuantity : 0;
    if (quantity > available) {
      throw new AppError('INSUFFICIENT_STOCK', 'Not enough stock', 409, { available });
    }
    item.quantity = quantity;
  }
  await cart.save();
  return hydrateCart(cart._id.toString());
}

export async function removeCartItem(itemId: string, userId?: string, guestKey?: string) {
  const cart = await getOrCreateCart(userId, guestKey);
  const item = cart.items.id(itemId);
  if (!item) throw new AppError('NOT_FOUND', 'Cart item not found', 404);
  item.deleteOne();
  await cart.save();
  return hydrateCart(cart._id.toString());
}

export async function mergeGuestCart(userId: string, guestKey: string) {
  const guest = await CartModel.findOne({ guestKey });
  if (!guest?.items.length) return getCartDto(userId);
  const userCart = await getOrCreateCart(userId);
  for (const g of guest.items) {
    const existing = userCart.items.find(
      (i) =>
        i.productId.toString() === g.productId.toString() &&
        i.variantId.toString() === g.variantId.toString(),
    );
    if (existing) existing.quantity = Math.min(99, existing.quantity + g.quantity);
    else userCart.items.push(g);
  }
  await userCart.save();
  await guest.deleteOne();
  return hydrateCart(userCart._id.toString());
}

export async function clearCart(userId: string) {
  const cart = await CartModel.findOne({ userId });
  if (cart) {
    cart.items = [] as never;
    await cart.save();
  }
}
