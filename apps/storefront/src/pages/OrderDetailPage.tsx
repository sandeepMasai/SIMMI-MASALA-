import { Link, useParams } from 'react-router-dom';
import { formatINR } from '@simmi/shared';
import { useGetOrderQuery } from '../store/api';
import { apiFetch } from '../lib/api';
import { useState } from 'react';
import { Breadcrumbs, PageShell } from '../components/ui';
import { CheckCircle2 } from 'lucide-react';

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const { data: order, isLoading, isError, refetch } = useGetOrderQuery(orderId, { skip: !orderId });
  const [busy, setBusy] = useState(false);

  if (isLoading) return <PageShell><p>Loading order…</p></PageShell>;
  if (isError || !order) {
    return (
      <PageShell>
        <p>Order not found.</p>
        <Link to="/account" className="underline">Back</Link>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Account', to: '/account' },
          { label: order.orderNumber },
        ]}
      />
      <h1 className="section-title text-3xl">{order.orderNumber}</h1>
      <p className="mt-2 text-muted">
        Status: <strong className="text-ink">{order.status}</strong> · Payment:{' '}
        <strong className="text-ink">{order.paymentStatus}</strong> · {order.paymentMethod.toUpperCase()}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="font-display text-xl text-forest">Order timeline</h2>
          <ol className="relative mt-6 space-y-6 border-l-2 border-gold pl-6">
            {order.statusHistory.map((e, idx) => (
              <li key={`${e.status}-${idx}`} className="relative">
                <span className="absolute -left-[1.9rem] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-forest text-cream">
                  <CheckCircle2 size={14} />
                </span>
                <p className="font-semibold capitalize">{e.status.replaceAll('_', ' ')}</p>
                <p className="text-sm text-muted">
                  {new Date(e.at).toLocaleString()}
                  {e.note ? ` — ${e.note}` : ''}
                </p>
              </li>
            ))}
          </ol>
          {(order.trackingNumber || order.courierName) && (
            <p className="mt-6 rounded-xl bg-cream p-3 text-sm">
              Shipment: {order.courierName} {order.trackingNumber}
            </p>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="font-display text-xl text-forest">Items</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={`${i.sku}-${i.quantity}`} className="flex justify-between gap-3">
                <span>{i.productNameEn} ({i.packWeightGrams}g) × {i.quantity}</span>
                <span>{formatINR(i.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-semibold">Total {formatINR(order.totalPaise)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}/orders/${order.id}/invoice`}
              className="btn-outline"
              target="_blank"
              rel="noreferrer"
            >
              Invoice
            </a>
            {['pending_payment', 'placed', 'payment_confirmed', 'processing', 'packed'].includes(order.status) && (
              <button
                type="button"
                disabled={busy}
                className="btn-outline text-discount"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await apiFetch(`/orders/${order.id}/cancel`, { method: 'POST' });
                    await refetch();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Request cancellation
              </button>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
