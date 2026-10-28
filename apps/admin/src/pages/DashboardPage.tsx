import { formatINR } from '@simmi/shared';
import { useState } from 'react';
import { useDashboardQuery } from '../store/api';

function defaultDateRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function DashboardPage() {
  const defaults = defaultDateRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const { data, isLoading, isError } = useDashboardQuery({
    from: new Date(from).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
  });

  if (isLoading) return <p>Loading dashboard…</p>;
  if (isError || !data) return <p className="text-spice-red">Failed to load dashboard.</p>;

  const cards = [
    ['Total orders', data.totalOrders, 'bg-forest/10 text-forest'],
    ['Paid revenue', formatINR(Number(data.paidRevenuePaise ?? 0)), 'bg-gold/20 text-forest-dark'],
    ['Pending payments', data.pendingPayments, 'bg-amber-100 text-amber-900'],
    ['Awaiting processing', data.awaitingProcessing, 'bg-sky-100 text-sky-900'],
    ['Delivered', data.delivered, 'bg-emerald-100 text-emerald-900'],
    ['Cancelled', data.cancelled, 'bg-red-100 text-red-800'],
    ['Active products', data.activeProducts, 'bg-white text-ink'],
  ] as const;

  const salesBars = ((data.bestSellers as { _id: string; qty: number; name: string }[]) ?? []).slice(0, 6);
  const maxQty = Math.max(1, ...salesBars.map((s) => s.qty));

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">{String(data.revenueRule)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="text-sm">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, cls]) => (
          <div key={label} className={`card p-4 ${cls}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-2 font-display text-2xl">{String(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-xl text-forest">Best sellers</h2>
          <div className="mt-4 space-y-3">
            {salesBars.map((s) => (
              <div key={s._id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted">{s.qty}</span>
                </div>
                <div className="h-2 rounded-full bg-cream-dark">
                  <div className="h-2 rounded-full bg-forest" style={{ width: `${(s.qty / maxQty) * 100}%` }} />
                </div>
              </div>
            ))}
            {!salesBars.length && <p className="text-sm text-muted">No sales data yet.</p>}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-display text-xl text-forest">Low stock</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {((data.lowStockProducts as { sku: string; nameEn: string; available: number }[]) ?? []).map((p) => (
              <li key={p.sku} className="rounded-xl border border-border px-3 py-2">
                {p.nameEn} · {p.sku} · available {p.available}
              </li>
            ))}
            {!((data.lowStockProducts as unknown[]) ?? []).length && (
              <li className="text-muted">No low-stock items.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
