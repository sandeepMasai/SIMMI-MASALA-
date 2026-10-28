import { formatINR } from '@simmi/shared';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCustomerQuery, useUpdateCustomerMutation } from '../store/api';

export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const { data, isLoading, isError } = useCustomerQuery(customerId, { skip: !customerId });
  const [updateCustomer, { isLoading: saving }] = useUpdateCustomerMutation();
  const [accountStatus, setAccountStatus] = useState('active');
  const [supportNotes, setSupportNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (data?.customer) {
      setAccountStatus(data.customer.accountStatus);
      setSupportNotes(data.customer.supportNotes ?? '');
    }
  }, [data]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await updateCustomer({
        id: customerId,
        body: { accountStatus, supportNotes },
      }).unwrap();
      setMessage('Customer updated.');
    } catch {
      setError('Could not update customer.');
    }
  }

  if (isLoading) return <p>Loading…</p>;
  if (isError || !data) return <p className="text-spice-red">Could not load customer.</p>;

  const { customer, summary, orders } = data;

  return (
    <div>
      <Link to="/customers" className="text-sm text-forest underline">
        ← Customers
      </Link>
      <h1 className="mt-2 font-display text-3xl text-forest">{customer.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {customer.email}
        {customer.phone ? ` · ${customer.phone}` : ''} · joined{' '}
        {new Date(customer.createdAt).toLocaleDateString()}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Orders</p>
          <p className="mt-1 font-display text-2xl text-forest">{summary.totalOrders}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Paid orders</p>
          <p className="mt-1 font-display text-2xl text-forest">{summary.paidOrders}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Paid revenue</p>
          <p className="mt-1 font-display text-2xl text-forest">
            {formatINR(summary.paidRevenuePaise)}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void onSave(e)} className="card mt-6 max-w-xl space-y-3 p-5">
        <h2 className="font-display text-xl text-forest">Account</h2>
        <div>
          <label className="block text-sm font-semibold" htmlFor="accountStatus">
            Status
          </label>
          <select
            id="accountStatus"
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          >
            <option value="active">active</option>
            <option value="disabled">disabled</option>
            <option value="deletion_requested">deletion_requested</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="supportNotes">
            Support notes
          </label>
          <textarea
            id="supportNotes"
            rows={4}
            value={supportNotes}
            onChange={(e) => setSupportNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-spice-red">{error}</p>}
        {message && <p className="text-sm text-forest">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      <h2 className="mt-8 font-display text-xl text-forest">Recent orders</h2>
      {!orders.length && <p className="mt-3 text-sm text-muted">No orders for this customer.</p>}
      <ul className="mt-3 space-y-2">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="block rounded-xl border border-border bg-white px-3 py-2 text-sm hover:border-forest"
            >
              <strong className="text-forest">{o.orderNumber}</strong> · {o.status} ·{' '}
              {o.paymentStatus} · {formatINR(o.totalPaise)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
