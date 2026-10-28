import { formatINR } from '@simmi/shared';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useCancelOrderMutation,
  useOrderQuery,
  useRefundOrderMutation,
  useUpdateOrderNotesMutation,
  useUpdateOrderStatusMutation,
} from '../store/api';

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const { data, isLoading, isError } = useOrderQuery(orderId, { skip: !orderId });
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateOrderStatusMutation();
  const [updateNotes, { isLoading: savingNotes }] = useUpdateOrderNotesMutation();
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();
  const [refundOrder, { isLoading: refunding }] = useRefundOrderMutation();

  const [status, setStatus] = useState('processing');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (data) {
      setStatus(data.order.status);
      setTrackingNumber(data.order.trackingNumber ?? '');
      setCourierName(data.order.courierName ?? '');
      setInternalNotes(data.internalNotes ?? '');
      if (data.payment?.amountPaise) {
        setRefundAmount(String(data.payment.amountPaise));
      }
    }
  }, [data]);

  if (isLoading) return <p>Loading…</p>;
  if (isError || !data) return <p className="text-spice-red">Could not load order.</p>;

  const { order, payment } = data;
  const canCancel = !['cancelled', 'refunded', 'delivered'].includes(order.status);
  const canRefund = payment?.status === 'paid' || payment?.status === 'partially_refunded';

  async function onStatus(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await updateStatus({
        id: order.id,
        status,
        trackingNumber: trackingNumber || undefined,
        courierName: courierName || undefined,
      }).unwrap();
      setMessage('Status updated.');
    } catch {
      setError('Could not update status.');
    }
  }

  async function onNotes(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await updateNotes({ id: order.id, internalNotes }).unwrap();
      setMessage('Internal notes saved.');
    } catch {
      setError('Could not save notes.');
    }
  }

  async function onCancel() {
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    setMessage('');
    setError('');
    try {
      await cancelOrder(order.id).unwrap();
      setMessage('Order cancelled.');
    } catch {
      setError('Could not cancel order.');
    }
  }

  async function onRefund(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    const amountPaise = Number(refundAmount);
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      setError('Refund amount must be a positive integer (paise).');
      return;
    }
    if (refundReason.trim().length < 3) {
      setError('Refund reason must be at least 3 characters.');
      return;
    }
    try {
      const result = await refundOrder({
        id: order.id,
        amountPaise,
        reason: refundReason.trim(),
      }).unwrap();
      setMessage(
        result.providerRefunded
          ? `Refund recorded. Provider refunded: yes. ${result.note}`
          : `Refund recorded. Provider refunded: no. ${result.note}`,
      );
      setRefundReason('');
    } catch {
      setError('Could not process refund.');
    }
  }

  return (
    <div>
      <Link to="/orders" className="text-sm text-forest underline">
        ← Orders
      </Link>
      <h1 className="mt-2 font-display text-3xl text-forest">{order.orderNumber}</h1>
      <p className="mt-2 text-sm">
        {order.status} · {order.paymentStatus} · {order.paymentMethod} · {formatINR(order.totalPaise)}
      </p>
      {(message || error) && (
        <p className={`mt-3 text-sm ${error ? 'text-spice-red' : 'text-forest'}`}>{error || message}</p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-4 text-sm">
          <p className="font-semibold text-forest">Ship to</p>
          <p className="mt-2">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
            {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.phone}
          </p>
        </div>
        <div className="card p-4 text-sm">
          <p className="font-semibold text-forest">Payment</p>
          {payment ? (
            <ul className="mt-2 space-y-1">
              <li>Provider: {payment.provider}</li>
              <li>Status: {payment.status}</li>
              <li>Amount: {formatINR(payment.amountPaise)}</li>
              {payment.providerOrderId && <li>Provider order: {payment.providerOrderId}</li>}
              {payment.providerPaymentId && <li>Provider payment: {payment.providerPaymentId}</li>}
            </ul>
          ) : (
            <p className="mt-2 text-muted">No payment record.</p>
          )}
          <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
            Subtotal {formatINR(order.subtotalPaise)} · Discount {formatINR(order.discountPaise)} ·
            Tax {formatINR(order.taxPaise)} · Shipping {formatINR(order.shippingPaise)}
            {order.couponCode ? ` · Coupon ${order.couponCode}` : ''}
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-display text-xl text-forest">Line items</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Line total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={`${item.sku}-${i}`} className="border-t border-border">
                <td className="px-4 py-3">
                  {item.productNameEn}
                  <div className="text-xs text-muted">{item.packWeightGrams}g</div>
                </td>
                <td className="px-4 py-3">{item.sku}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{formatINR(item.unitPricePaise)}</td>
                <td className="px-4 py-3">{formatINR(item.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-display text-xl text-forest">Status history</h2>
      <ol className="mt-3 space-y-2 border-l-2 border-forest pl-4 text-sm">
        {order.statusHistory.map((e, i) => (
          <li key={`${e.status}-${i}`}>
            <strong>{e.status}</strong> — {new Date(e.at).toLocaleString()}
            {e.note ? ` · ${e.note}` : ''}
          </li>
        ))}
      </ol>

      <form onSubmit={(e) => void onStatus(e)} className="card mt-8 flex flex-wrap gap-2 p-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-white px-2 py-2"
        >
          {[
            'processing',
            'packed',
            'shipped',
            'out_for_delivery',
            'delivered',
            'cancelled',
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={courierName}
          onChange={(e) => setCourierName(e.target.value)}
          placeholder="Courier"
          className="rounded-xl border border-border bg-white px-2 py-2"
        />
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Tracking (only if provided)"
          className="rounded-xl border border-border bg-white px-2 py-2"
        />
        <button
          type="submit"
          disabled={updatingStatus}
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          Update status
        </button>
      </form>

      <form onSubmit={(e) => void onNotes(e)} className="card mt-6 max-w-xl space-y-3 p-4">
        <h2 className="font-display text-xl text-forest">Internal notes</h2>
        <textarea
          rows={4}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          placeholder="Visible only to admins"
        />
        <button
          type="submit"
          disabled={savingNotes}
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {savingNotes ? 'Saving…' : 'Save notes'}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        {canCancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={() => void onCancel()}
            className="rounded-full border border-spice-red/40 px-4 py-2 text-sm font-semibold text-spice-red disabled:opacity-60"
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}
      </div>

      {canRefund && (
        <form onSubmit={(e) => void onRefund(e)} className="card mt-6 max-w-xl space-y-3 p-4">
          <h2 className="font-display text-xl text-forest">Refund</h2>
          <p className="text-xs text-muted">
            Amount in paise. Razorpay refunds are attempted when configured; otherwise a ledger-only
            refund is recorded.
          </p>
          <div>
            <label className="block text-sm font-semibold" htmlFor="refundAmount">
              Amount (paise)
            </label>
            <input
              id="refundAmount"
              type="number"
              min={1}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold" htmlFor="refundReason">
              Reason
            </label>
            <input
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
              minLength={3}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={refunding}
            className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
          >
            {refunding ? 'Refunding…' : 'Issue refund'}
          </button>
        </form>
      )}
    </div>
  );
}
