import { Heart, ShoppingBag, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { formatINR, type ProductDto } from '@simmi/shared';
import { useDispatch } from 'react-redux';
import { useAddToCartMutation } from '../store/api';
import { pushToast, setCartOpen } from '../store/uiSlice';
import { isInWishlist, toggleWishlist } from '../lib/wishlist';

export function ProductCard({
  product,
  badge,
}: {
  product: ProductDto;
  badge?: string;
}) {
  const activeVariants = product.variants.filter((v) => v.isActive);
  const [variantId, setVariantId] = useState('');
  const selected = activeVariants.find((v) => v.id === variantId);
  const [wish, setWish] = useState(() => isInWishlist(product.id));
  const [addToCart, { isLoading }] = useAddToCartMutation();
  const dispatch = useDispatch();
  const hasCompare =
    selected?.compareAtPricePaise != null && selected.compareAtPricePaise > selected.pricePaise;
  const displayPrice = selected ?? activeVariants[0];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
        {badge && <span className="badge-pill bg-forest text-white">{badge}</span>}
        {hasCompare && <span className="badge-pill bg-discount text-white">Sale</span>}
      </div>
      <button
        type="button"
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ${
          wish ? 'text-discount' : 'text-forest'
        }`}
        aria-label="Toggle wishlist"
        onClick={(e) => {
          e.preventDefault();
          setWish(toggleWishlist(product.id).includes(product.id));
        }}
      >
        <Heart size={16} fill={wish ? 'currentColor' : 'none'} />
      </button>

      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-square overflow-hidden bg-cream-dark">
          <img
            src={selected?.imageUrl || product.images[0]?.url}
            alt={product.images[0]?.alt || product.nameEn}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-display text-lg text-forest">{product.nameEn}</h3>
          <p className="font-hindi text-sm text-muted">{product.nameHi}</p>
        </Link>
        {product.shortDescription && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{product.shortDescription}</p>
        )}
        <div className="mt-2 flex items-center gap-1 text-xs text-muted">
          <Star size={12} className="text-border" />
          <span>Reviews appear when published</span>
        </div>
        {displayPrice && (
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-lg font-semibold text-ink">
              {formatINR(selected?.pricePaise ?? displayPrice.pricePaise)}
            </p>
            {hasCompare && selected?.compareAtPricePaise != null && (
              <p className="text-sm text-muted line-through">
                {formatINR(selected.compareAtPricePaise)}
              </p>
            )}
            <span className="text-xs text-muted">
              / {selected?.packWeightGrams ?? displayPrice.packWeightGrams}g
            </span>
          </div>
        )}

        {activeVariants.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeVariants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  selected?.id === v.id
                    ? 'border-forest bg-forest text-cream'
                    : 'border-border bg-cream text-ink'
                }`}
              >
                {v.packWeightGrams}g
              </button>
            ))}
          </div>
        )}

        {product.isPlaceholderContent && (
          <p className="mt-1 text-[11px] text-muted">Placeholder pricing & imagery</p>
        )}
        <button
          type="button"
          disabled={!selected || isLoading || selected.stockQuantity < 1}
          className="btn-primary mt-auto w-full py-2.5 text-sm disabled:opacity-50"
          onClick={async () => {
            if (!selected) {
              dispatch(pushToast({ type: 'error', message: 'Select a pack size first' }));
              return;
            }
            try {
              await addToCart({
                productId: product.id,
                variantId: selected.id,
                quantity: 1,
              }).unwrap();
              dispatch(pushToast({ type: 'success', message: 'Added to cart' }));
              dispatch(setCartOpen(true));
            } catch (err) {
              dispatch(
                pushToast({
                  type: 'error',
                  message: err instanceof Error ? err.message : 'Could not add to cart',
                }),
              );
            }
          }}
        >
          <ShoppingBag size={15} />
          {selected ? 'Add to Cart' : 'Select pack'}
        </button>
      </div>
    </article>
  );
}
