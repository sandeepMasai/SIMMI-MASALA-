import { Link } from 'react-router-dom';
import { formatINR } from '@simmi/shared';
import { useOrdersQuery } from '../store/api';
import { useState } from 'react';

export function OrdersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useOrdersQuery({ q: q || undefined, status: status || undefined });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-forest">Orders</h1>
        <a
          className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold"
          href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}/admin/orders/export/csv`}
        >
          Export CSV
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Order number"
          className="rounded-xl border border-border bg-white px-3 py-2"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2"
        >
          <option value="">All statuses</option>
          {[
            'pending_payment',
            'placed',
            'payment_confirmed',
            'processing',
            'packed',
            'shipped',
            'delivered',
            'cancelled',
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {isLoading && <p className="mt-6">Loading…</p>}
      <div className="card mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link to={`/orders/${o.id}`} className="font-semibold text-forest underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-cream-dark px-2 py-1 text-xs font-semibold">{o.status}</span>
                </td>
                <td className="px-4 py-3">
                  {o.paymentMethod.toUpperCase()} · {o.paymentStatus}
                </td>
                <td className="px-4 py-3">{formatINR(o.totalPaise)}</td>
                <td className="px-4 py-3 text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
