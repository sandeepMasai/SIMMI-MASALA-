import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetProductsQuery } from '../store/api';
import { getWishlistIds } from '../lib/wishlist';
import { ProductCard } from '../components/ProductCard';
import { Breadcrumbs, EmptyState, PageShell } from '../components/ui';

export function WishlistPage() {
  const [ids, setIds] = useState<string[]>([]);
  const { data } = useGetProductsQuery({ page: 1 });

  useEffect(() => {
    setIds(getWishlistIds());
  }, []);

  const products = (data?.items ?? []).filter((p) => ids.includes(p.id));

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Account', to: '/account' }, { label: 'Wishlist' }]} />
      <h1 className="section-title mb-8 text-3xl">Wishlist</h1>
      {!products.length && (
        <EmptyState title="Your wishlist is empty">
          <Link to="/shop" className="btn-primary mt-4 inline-flex">Browse spices</Link>
        </EmptyState>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </PageShell>
  );
}
