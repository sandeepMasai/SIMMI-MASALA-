import { Link } from 'react-router-dom';
import { formatINR } from '@simmi/shared';
import { useMeQuery, useMyOrdersQuery, useLogoutMutation } from '../store/api';
import { Breadcrumbs, PageShell } from '../components/ui';
import { getWishlistIds } from '../lib/wishlist';

const nav = [
  { to: '/account', label: 'Overview' },
  { to: '/account', label: 'Orders' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/wishlist', label: 'Wishlist' },
  { to: '/contact', label: 'Support' },
];

export function AccountPage() {
  const { data: me, isError } = useMeQuery();
  const { data: orders } = useMyOrdersQuery(undefined, { skip: isError || !me });
  const [logout] = useLogoutMutation();

  if (isError || !me?.user) {
    return (
      <PageShell narrow>
        <p className="text-center">Please log in to view your account.</p>
        <Link to="/login" className="btn-primary mx-auto mt-4 block w-fit">Login</Link>
      </PageShell>
    );
  }

  const items = orders?.items ?? [];
  const stats = {
    total: items.length,
    delivered: items.filter((o) => o.status === 'delivered').length,
    processing: items.filter((o) =>
      ['placed', 'payment_confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(o.status),
    ).length,
    cancelled: items.filter((o) => o.status === 'cancelled').length,
  };

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Account' }]} />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="card-surface h-fit p-4">
          <p className="mb-3 font-display text-lg text-forest">My Account</p>
          <nav className="flex flex-col gap-1 text-sm">
            {nav.map((n) => (
              <Link key={n.label} to={n.to} className="rounded-lg px-3 py-2 hover:bg-cream">
                {n.label}
              </Link>
            ))}
            <button type="button" className="rounded-lg px-3 py-2 text-left text-discount hover:bg-cream" onClick={() => void logout()}>
              Logout
            </button>
          </nav>
        </aside>

        <div>
          <h1 className="section-title text-3xl">Hello, {me.user.name}</h1>
          <p className="mt-1 text-muted">{me.user.email}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Total Orders', stats.total, 'bg-forest/10 text-forest'],
              ['Delivered', stats.delivered, 'bg-emerald-100 text-emerald-800'],
              ['Processing', stats.processing, 'bg-amber-100 text-amber-800'],
              ['Cancelled', stats.cancelled, 'bg-red-100 text-red-800'],
            ].map(([label, value, cls]) => (
              <div key={String(label)} className={`rounded-2xl p-4 ${cls}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
                <p className="mt-2 font-display text-3xl">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-muted">Wishlist items saved locally: {getWishlistIds().length}</div>

          <h2 className="mt-10 font-display text-2xl text-forest">Recent orders</h2>
          {!items.length && <p className="mt-4 text-muted">No orders yet.</p>}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white">
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
                {items.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link to={`/account/orders/${o.id}`} className="font-semibold text-forest underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-pill bg-cream-dark text-ink">{o.status}</span>
                    </td>
                    <td className="px-4 py-3">{o.paymentStatus}</td>
                    <td className="px-4 py-3">{formatINR(o.totalPaise)}</td>
                    <td className="px-4 py-3 text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
