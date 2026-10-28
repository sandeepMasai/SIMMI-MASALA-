import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatINR } from '@simmi/shared';
import { Heart, Minus, Plus } from 'lucide-react';
import { useAddToCartMutation, useGetProductQuery } from '../store/api';
import { ProductCard } from '../components/ProductCard';
import { useDispatch } from 'react-redux';
import { pushToast, setCartOpen } from '../store/uiSlice';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs, PageShell } from '../components/ui';
import { isInWishlist, toggleWishlist } from '../lib/wishlist';

type TabKey =
  | 'Description'
  | 'Ingredients'
  | 'Pack size'
  | 'Storage'
  | 'Manufacturer'
  | 'Origin'
  | 'Labeling'
  | 'Shipping';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError } = useGetProductQuery(slug, { skip: !slug });
  const [addToCart, { isLoading: adding }] = useAddToCartMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const product = data?.product;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [wish, setWish] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [packError, setPackError] = useState('');

  const activeVariants = useMemo(
    () => product?.variants.filter((v) => v.isActive) ?? [],
    [product],
  );
  const selectedVariant = activeVariants.find((v) => v.id === variantId) ?? null;

  const tabs = useMemo(() => {
    if (!product) return [] as { key: TabKey; label: string; body: string }[];
    const label = product.labelInfo;
    const items: { key: TabKey; label: string; body: string }[] = [
      { key: 'Description', label: 'Description', body: product.description },
    ];
    if (label?.ingredients) {
      items.push({ key: 'Ingredients', label: 'Ingredients', body: label.ingredients });
    }
    items.push({
      key: 'Pack size',
      label: 'Pack size',
      body: activeVariants.map((v) => `${v.packWeightGrams} g (SKU ${v.sku})`).join('\n') || 'No active packs',
    });
    if (label?.storageInstructions) {
      items.push({ key: 'Storage', label: 'Storage', body: label.storageInstructions });
    }
    const manufacturer = [label?.manufacturerName, label?.manufacturerAddress, label?.manufacturingDetails]
      .filter(Boolean)
      .join('\n');
    if (manufacturer) {
      items.push({ key: 'Manufacturer', label: 'Manufacturer / packer', body: manufacturer });
    }
    if (label?.countryOfOrigin) {
      items.push({ key: 'Origin', label: 'Origin', body: label.countryOfOrigin });
    }
    const labeling = [
      label?.netQuantityInfo ? `Net quantity: ${label.netQuantityInfo}` : '',
      label?.shelfLife ? `Shelf life: ${label.shelfLife}` : '',
      label?.fssaiVerified && label.fssaiLicenseNumber
        ? `FSSAI: ${label.fssaiLicenseNumber}`
        : '',
      label?.batchAndExpiryInfo ? `Batch / expiry: ${label.batchAndExpiryInfo}` : '',
      label?.allergenInfo ? `Allergens: ${label.allergenInfo}` : '',
      label?.usageInstructions ? `Usage: ${label.usageInstructions}` : '',
      label?.productType ? `Product type: ${label.productType}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    if (labeling) {
      items.push({ key: 'Labeling', label: 'Label information', body: labeling });
    }
    items.push({
      key: 'Shipping',
      label: 'Shipping',
      body: 'Shipping charges and free-shipping threshold are configured in store settings. Delivery timelines are confirmed after order processing.',
    });
    return items;
  }, [product, activeVariants]);

  const [tab, setTab] = useState<TabKey>('Description');
  const activeTab = tabs.find((t) => t.key === tab) ?? tabs[0];

  if (isLoading) {
    return (
      <PageShell>
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (isError || !product) {
    return (
      <PageShell>
        <p className="text-discount">Product not found.</p>
        <Link to="/shop" className="mt-4 inline-block underline">
          Back to shop
        </Link>
      </PageShell>
    );
  }

  const images = product.images.length
    ? product.images
    : [{ url: '', alt: product.nameEn, sortOrder: 0 }];
  const hasCompare =
    selectedVariant?.compareAtPricePaise != null &&
    selectedVariant.compareAtPricePaise > selectedVariant.pricePaise;

  const add = async (buyNow = false) => {
    if (!selectedVariant) {
      setPackError('Please select a pack size before adding to cart.');
      return;
    }
    setPackError('');
    try {
      await addToCart({
        productId: product.id,
        variantId: selectedVariant.id,
        quantity: qty,
      }).unwrap();
      dispatch(pushToast({ type: 'success', message: 'Added to cart' }));
      if (buyNow) navigate('/checkout');
      else dispatch(setCartOpen(true));
    } catch (err) {
      dispatch(pushToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed' }));
    }
  };

  return (
    <PageShell>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Shop', to: '/shop' },
          { label: product.nameEn },
        ]}
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-2xl border border-border bg-white">
            <img
              src={selectedVariant?.imageUrl || images[imgIdx]?.url || images[0]?.url}
              alt={images[imgIdx]?.alt || product.nameEn}
              className="aspect-square w-full object-cover"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={`${img.url}-${i}`}
                type="button"
                onClick={() => setImgIdx(i)}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${
                  imgIdx === i ? 'border-forest' : 'border-border'
                }`}
              >
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              {product.brandName && (
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">
                  {product.brandName}
                </p>
              )}
              <h1 className="font-display text-4xl text-forest">{product.nameEn}</h1>
              <p className="font-hindi mt-1 text-xl text-muted">{product.nameHi}</p>
            </div>
            <button
              type="button"
              className={`rounded-full border border-border p-2 ${wish ? 'text-discount' : 'text-forest'}`}
              onClick={() => {
                const next = toggleWishlist(product.id);
                setWish(next.includes(product.id) || isInWishlist(product.id));
              }}
              aria-label="Wishlist"
            >
              <Heart size={18} fill={wish ? 'currentColor' : 'none'} />
            </button>
          </div>

          {product.shortDescription && (
            <p className="mt-3 text-sm leading-relaxed text-ink/80">{product.shortDescription}</p>
          )}

          {product.isPlaceholderContent && (
            <p className="mt-3 rounded-xl bg-gold/15 px-3 py-2 text-sm text-ink">
              Placeholder description, price, and image — pending business approval.
            </p>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            <p className="font-display text-3xl text-ink">
              {selectedVariant ? formatINR(selectedVariant.pricePaise) : 'Select a pack'}
            </p>
            {hasCompare && selectedVariant?.compareAtPricePaise != null && (
              <p className="text-lg text-muted line-through">
                {formatINR(selectedVariant.compareAtPricePaise)}
              </p>
            )}
          </div>
          {selectedVariant && (
            <p className="mt-2 text-sm text-muted">
              {selectedVariant.stockQuantity > 0
                ? `${selectedVariant.stockQuantity} in stock · SKU ${selectedVariant.sku}`
                : 'Out of stock'}
            </p>
          )}

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-semibold text-forest">Pack size</legend>
            <div className="flex flex-wrap gap-2">
              {activeVariants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVariantId(v.id);
                    setPackError('');
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    selectedVariant?.id === v.id
                      ? 'border-forest bg-forest text-cream'
                      : 'border-border bg-white text-ink'
                  }`}
                >
                  {v.packWeightGrams} g · {formatINR(v.pricePaise)}
                </button>
              ))}
            </div>
            {packError && <p className="mt-2 text-sm text-discount">{packError}</p>}
          </fieldset>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-semibold">Qty</span>
            <div className="inline-flex items-center rounded-full border border-border bg-white">
              <button
                type="button"
                className="p-2"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                className="p-2"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="Increase"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={adding || (selectedVariant != null && selectedVariant.stockQuantity < 1)}
              className="btn-primary disabled:opacity-50"
              onClick={() => void add(false)}
            >
              Add to Cart
            </button>
            <button
              type="button"
              disabled={adding || (selectedVariant != null && selectedVariant.stockQuantity < 1)}
              className="btn-gold disabled:opacity-50"
              onClick={() => void add(true)}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex flex-wrap gap-2 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-semibold ${
                activeTab?.key === t.key ? 'border-b-2 border-forest text-forest' : 'text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="card-surface mt-4 whitespace-pre-wrap p-5 text-sm leading-relaxed text-ink">
          {activeTab?.body}
        </div>
      </div>

      {(data?.related?.length ?? 0) > 0 && (
        <section className="mt-16">
          <h2 className="section-title section-ornament mb-6 text-2xl">Related spices</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data!.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
