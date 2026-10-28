const KEY = 'simmi_wishlist';

export function getWishlistIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

export function toggleWishlist(productId: string): string[] {
  const ids = new Set(getWishlistIds());
  if (ids.has(productId)) ids.delete(productId);
  else ids.add(productId);
  const next = [...ids];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isInWishlist(productId: string): boolean {
  return getWishlistIds().includes(productId);
}
