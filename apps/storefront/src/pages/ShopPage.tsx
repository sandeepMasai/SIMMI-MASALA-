import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { useGetCategoriesQuery, useGetProductsQuery } from '../store/api';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs, EmptyState, PageShell } from '../components/ui';

const PACKS = [100, 250, 500] as const;

export function ShopPage() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [packs, setPacks] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories } = useGetCategoriesQuery();

  useEffect(() => {
    setQ(params.get('q') ?? '');
    setPage(1);
  }, [params]);

  const query = useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      sort,
      page,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice < 100000 ? maxPrice : undefined,
    }),
    [q, category, sort, page, minPrice, maxPrice],
  );
  const { data, isLoading, isError } = useGetProductsQuery(query);

  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (packs.length) {
      list = list.filter((p) => p.variants.some((v) => packs.includes(v.packWeightGrams) && v.isActive));
    }
    if (inStockOnly) {
      list = list.filter((p) => p.variants.some((v) => v.stockQuantity > 0));
    }
    return list;
  }, [data, packs, inStockOnly]);

  const Filters = (
    <aside className="card-surface h-fit space-y-6 p-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-forest">Search</p>
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="input-field"
          placeholder="Search products"
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-forest">Category</p>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={!category} onChange={() => setCategory('')} /> All
          </label>
          {categories?.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input
                type="radio"
                checked={category === c.slug}
                onChange={() => {
                  setCategory(c.slug);
                  setPage(1);
                }}
              />
              {c.nameEn}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-forest">Price (paise)</p>
        <div className="flex gap-2">
          <input type="number" className="input-field" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value) || 0)} />
          <input type="number" className="input-field" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value) || 0)} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-forest">Pack size</p>
        <div className="space-y-2 text-sm">
          {PACKS.map((p) => (
            <label key={p} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={packs.includes(p)}
                onChange={() =>
                  setPacks((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
                }
              />
              {p} g
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-forest">Availability</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          In stock only
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-forest">Sort by</p>
        <select className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
    </aside>
  );

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop' }]} />
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="section-title text-3xl md:text-4xl">Shop spices</h1>
        <button type="button" className="btn-outline lg:hidden" onClick={() => setFiltersOpen(true)}>
          <Filter size={16} /> Filters
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">{Filters}</div>
        <div>
          {isError && <p className="text-discount">Could not load products.</p>}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading && [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {!isLoading && items.length === 0 && (
            <EmptyState title="No products match your filters">
              Try clearing pack size or price filters.
            </EmptyState>
          )}
          {data && data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} className="btn-outline disabled:opacity-40" onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="text-sm">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                className="btn-outline disabled:opacity-40"
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(100%,320px)] overflow-y-auto bg-cream p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-forest">Filters</p>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close">
                <X />
              </button>
            </div>
            {Filters}
          </div>
        </div>
      )}
    </PageShell>
  );
}
