import { formatINR } from '@simmi/shared';
import { Link } from 'react-router-dom';
import {
  useAdjustInventoryMutation,
  useCouponsQuery,
  useCreateCouponMutation,
  useCustomersQuery,
  useInventoryMovementsQuery,
  useInventoryQuery,
  useSalesReportQuery,
  useSettingsQuery,
  useUpdateCouponMutation,
  useUpdateSettingsMutation,
} from '../store/api';
import { FormEvent, useState } from 'react';

function defaultDateRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function InventoryPage() {
  const { data, isLoading, isError } = useInventoryQuery();
  const { data: movements, isLoading: movementsLoading } = useInventoryMovementsQuery({ page: 1, limit: 30 });
  const [adjust, { isLoading: adjusting }] = useAdjustInventoryMutation();
  const [note, setNote] = useState('Manual correction');
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function onAdjust(productId: string, variantId: string) {
    setError('');
    const raw = qtyByVariant[variantId] ?? '0';
    const quantityChange = Number(raw);
    if (!Number.isInteger(quantityChange) || quantityChange === 0) {
      setError('Enter a non-zero integer quantity change.');
      return;
    }
    if (note.trim().length < 3) {
      setError('Note must be at least 3 characters.');
      return;
    }
    try {
      await adjust({ productId, variantId, quantityChange, note: note.trim() }).unwrap();
      setQtyByVariant((prev) => ({ ...prev, [variantId]: '' }));
    } catch {
      setError('Could not adjust inventory.');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Inventory</h1>
      <p className="mt-1 text-sm text-muted">Adjust stock with a required note. Movements appear below.</p>

      <label className="mt-4 block max-w-md text-sm font-semibold">
        Adjustment note
        <input
          className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && <p className="mt-2 text-sm text-spice-red">{error}</p>}

      {isLoading && <p className="mt-6">Loading inventory…</p>}
      {isError && <p className="mt-6 text-spice-red">Could not load inventory.</p>}
      {!isLoading && !isError && !(data ?? []).length && (
        <p className="mt-6 text-muted">No inventory rows yet.</p>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Adjust qty</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => {
              const variantId = String(row.variantId);
              return (
                <tr key={variantId} className="border-t border-border">
                  <td className="px-4 py-3">
                    {String(row.productName)} · {String(row.sku)}
                  </td>
                  <td className="px-4 py-3">{String(row.available)}</td>
                  <td className="px-4 py-3">{String(row.reservedQuantity)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        className="w-24 rounded-xl border border-border bg-white px-2 py-1"
                        placeholder="±qty"
                        value={qtyByVariant[variantId] ?? ''}
                        onChange={(e) =>
                          setQtyByVariant((prev) => ({ ...prev, [variantId]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={adjusting}
                        className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-cream disabled:opacity-60"
                        onClick={() => void onAdjust(String(row.productId), variantId)}
                      >
                        Apply
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-xl text-forest">Recent movements</h2>
      {movementsLoading && <p className="mt-3">Loading movements…</p>}
      {!movementsLoading && !(movements?.items ?? []).length && (
        <p className="mt-3 text-sm text-muted">No movements yet.</p>
      )}
      <div className="card mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Reason / note</th>
            </tr>
          </thead>
          <tbody>
            {(movements?.items ?? []).map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">{new Date(m.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{m.sku}</td>
                <td className="px-4 py-3">{m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}</td>
                <td className="px-4 py-3">{m.resultingStock}</td>
                <td className="px-4 py-3">
                  {m.reason}
                  {m.note ? ` · ${m.note}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const [q, setQ] = useState('');
  const { data, isLoading, isError } = useCustomersQuery({ q: q || undefined });

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Customers</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, phone"
        className="mt-4 w-full max-w-sm rounded-xl border border-border bg-white px-3 py-2"
      />
      {isLoading && <p className="mt-6">Loading…</p>}
      {isError && <p className="mt-6 text-spice-red">Could not load customers.</p>}
      {!isLoading && !isError && !(data?.items ?? []).length && (
        <p className="mt-6 text-muted">No customers found.</p>
      )}
      <ul className="mt-6 space-y-2">
        {(data?.items ?? []).map((c) => (
          <li key={c.id}>
            <Link
              to={`/customers/${c.id}`}
              className="block rounded-xl border border-border bg-white px-3 py-2 text-sm hover:border-forest"
            >
              <strong className="text-forest">{c.name}</strong> · {c.email}
              {c.phone ? ` · ${c.phone}` : ''} · {c.accountStatus}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CouponsPage() {
  const { data, isLoading, isError } = useCouponsQuery();
  const [createCoupon, { isLoading: creating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: updating }] = useUpdateCouponMutation();
  const [formError, setFormError] = useState('');
  const [formOk, setFormOk] = useState('');

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    setFormOk('');
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get('code') || '').trim().toUpperCase();
    const type = String(fd.get('type') || 'percentage');
    const value = Number(fd.get('value'));
    const minOrderPaise = Number(fd.get('minOrderPaise') || 0);
    const startsAt = String(fd.get('startsAt'));
    const expiresAt = String(fd.get('expiresAt'));
    const perCustomerLimit = Number(fd.get('perCustomerLimit') || 1);
    if (!code || code.length < 3) {
      setFormError('Code must be at least 3 characters.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setFormError('Value must be a positive number.');
      return;
    }
    try {
      await createCoupon({
        code,
        type,
        value,
        minOrderPaise,
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        perCustomerLimit,
        isActive: fd.get('isActive') === 'on',
      }).unwrap();
      setFormOk(`Coupon ${code} created.`);
      e.currentTarget.reset();
    } catch {
      setFormError('Could not create coupon.');
    }
  }

  const defaults = defaultDateRange();
  const startDefault = defaults.from;
  const endDefault = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Coupons</h1>

      <form onSubmit={(e) => void onCreate(e)} className="card mt-6 max-w-xl space-y-3 p-5">
        <h2 className="font-display text-xl text-forest">Create coupon</h2>
        <div>
          <label className="block text-sm font-semibold" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            name="code"
            required
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold" htmlFor="type">
              Type
            </label>
            <select
              id="type"
              name="type"
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
              defaultValue="percentage"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed (paise)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="value">
              Value
            </label>
            <input
              id="value"
              name="value"
              type="number"
              required
              min={1}
              step="any"
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="minOrderPaise">
            Min order (paise)
          </label>
          <input
            id="minOrderPaise"
            name="minOrderPaise"
            type="number"
            defaultValue={0}
            min={0}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold" htmlFor="startsAt">
              Starts
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="date"
              required
              defaultValue={startDefault}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="expiresAt">
              Expires
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              required
              defaultValue={endDefault}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="perCustomerLimit">
            Per-customer limit
          </label>
          <input
            id="perCustomerLimit"
            name="perCustomerLimit"
            type="number"
            min={1}
            defaultValue={1}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked />
          Active
        </label>
        {formError && <p className="text-sm text-spice-red">{formError}</p>}
        {formOk && <p className="text-sm text-forest">{formOk}</p>}
        <button
          type="submit"
          disabled={creating}
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {creating ? 'Creating…' : 'Create coupon'}
        </button>
      </form>

      {isLoading && <p className="mt-6">Loading coupons…</p>}
      {isError && <p className="mt-6 text-spice-red">Could not load coupons.</p>}
      {!isLoading && !isError && !(data ?? []).length && (
        <p className="mt-6 text-muted">No coupons yet.</p>
      )}
      <ul className="mt-6 space-y-2">
        {(data ?? []).map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            <div>
              <strong className="text-forest">{c.code}</strong> · {c.type} {c.value} · used {c.usedCount}
              <span className="ml-2 text-muted">{c.isActive ? 'active' : 'inactive'}</span>
            </div>
            <button
              type="button"
              disabled={updating}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-cream"
              onClick={() => void updateCoupon({ id: c.id, body: { isActive: !c.isActive } })}
            >
              {c.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportsPage() {
  const defaults = defaultDateRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const { data, isLoading, isError } = useSalesReportQuery({
    from: new Date(from).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Sales report</h1>
      <p className="mt-1 text-sm text-muted">Paid revenue only (excludes cancelled/refunded).</p>
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
      {isLoading && <p className="mt-6">Loading…</p>}
      {isError && <p className="mt-6 text-spice-red">Could not load report.</p>}
      <ul className="mt-6 space-y-2 text-sm">
        {(data?.sales ?? []).map((row) => (
          <li key={row._id} className="rounded-xl border border-border bg-white px-3 py-2">
            {row._id}: {row.orders} orders · {formatINR(row.revenuePaise)}
          </li>
        ))}
        {!isLoading && !isError && !(data?.sales ?? []).length && (
          <li className="text-muted">No paid sales in range.</li>
        )}
      </ul>
    </div>
  );
}

const POLICY_KEYS = [
  'privacy',
  'terms',
  'shipping',
  'returns',
  'cancellation',
  'faq',
  'about',
] as const;

export function SettingsPage() {
  const { data, isLoading, isError } = useSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return <p>Loading…</p>;
  if (isError || !data) return <p className="text-spice-red">Failed to load settings.</p>;

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Store settings</h1>
      <p className="mt-2 text-sm">
        Razorpay configured: {data.razorpayConfigured ? 'yes' : 'no'} · Email configured:{' '}
        {data.emailConfigured ? 'yes' : 'no'}
      </p>
      <p className="mt-1 text-xs text-muted">
        Payment secrets are never returned by this API — configure them via server env only.
      </p>
      <form
        className="mt-6 max-w-2xl space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(false);
          setError('');
          const fd = new FormData(e.currentTarget);
          const policies = Object.fromEntries(
            POLICY_KEYS.map((key) => [key, String(fd.get(`policy_${key}`) ?? '')]),
          );
          try {
            await updateSettings({
              brandName: String(fd.get('brandName')),
              tagline: String(fd.get('tagline')),
              phone: String(fd.get('phone')),
              email: String(fd.get('email')),
              shippingFlatPaise: Number(fd.get('shippingFlatPaise')),
              freeShippingThresholdPaise: Number(fd.get('freeShippingThresholdPaise')),
              codEnabled: fd.get('codEnabled') === 'on',
              policies,
            }).unwrap();
            setSaved(true);
          } catch {
            setError('Could not save settings.');
          }
        }}
      >
        {(
          [
            ['brandName', data.brandName],
            ['tagline', data.tagline],
            ['phone', data.phone],
            ['email', data.email],
            ['shippingFlatPaise', String(data.shippingFlatPaise)],
            ['freeShippingThresholdPaise', String(data.freeShippingThresholdPaise ?? '')],
          ] as const
        ).map(([name, value]) => (
          <div key={name}>
            <label className="block text-sm font-semibold" htmlFor={name}>
              {name}
            </label>
            <input
              id={name}
              name={name}
              defaultValue={value}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input name="codEnabled" type="checkbox" defaultChecked={data.codEnabled} />
          COD enabled
        </label>

        <h2 className="pt-4 font-display text-xl text-forest">Policies</h2>
        <p className="text-xs text-muted">{data.draftPolicyNotice}</p>
        {POLICY_KEYS.map((key) => (
          <div key={key}>
            <label className="block text-sm font-semibold" htmlFor={`policy_${key}`}>
              {key}
            </label>
            <textarea
              id={`policy_${key}`}
              name={`policy_${key}`}
              rows={5}
              defaultValue={data.policies?.[key] ?? ''}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-sm"
            />
          </div>
        ))}

        {error && <p className="text-sm text-spice-red">{error}</p>}
        {saved && <p className="text-sm text-forest">Saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-forest px-4 py-2 font-semibold text-cream disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
