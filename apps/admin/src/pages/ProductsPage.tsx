import { formatINR } from '@simmi/shared';
import { Link } from 'react-router-dom';
import { useArchiveProductMutation, useProductsQuery } from '../store/api';
import { useState } from 'react';

export function ProductsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const { data, isLoading, isError } = useProductsQuery({
    q: q || undefined,
    status: status || undefined,
  });
  const [archive] = useArchiveProductMutation();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-forest">Products</h1>
        <Link
          to="/products/new"
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream"
        >
          Add Product
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products or SKU"
          className="w-full max-w-sm rounded-xl border border-border bg-white px-3 py-2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading && <p className="mt-6">Loading…</p>}
      {isError && <p className="mt-6 text-spice-red">Could not load products.</p>}
      <div className="card mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Variants / Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.images[0]?.url && (
                      <img src={p.images[0].url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div>
                      <Link to={`/products/${p.id}/edit`} className="font-semibold text-forest hover:underline">
                        {p.nameEn}
                      </Link>
                      <div className="font-hindi text-xs text-muted">{p.nameHi}</div>
                      <div className="text-xs text-muted">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.variants.map((v) => (
                    <div key={v.id}>
                      {v.packWeightGrams}g · {formatINR(v.pricePaise)} · stock {v.stockQuantity}
                      {!v.isActive && <span className="text-muted"> (off)</span>}
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      p.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.status === 'archived'
                          ? 'bg-cream-dark text-muted'
                          : 'bg-gold/20 text-forest-dark'
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-3">
                  <Link to={`/products/${p.id}/edit`} className="text-forest underline">
                    Edit
                  </Link>
                  {p.status !== 'archived' && (
                    <button
                      type="button"
                      className="text-spice-red underline"
                      onClick={() => void archive(p.id)}
                    >
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
