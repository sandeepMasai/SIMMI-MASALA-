import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, formatINR } from '@simmi/shared';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  useCreateOrderMutation,
  useGetCartQuery,
  useGetSettingsQuery,
  useMeQuery,
} from '../store/api';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import { apiFetch } from '../lib/api';
import { Breadcrumbs, PageShell } from '../components/ui';

const checkoutFormSchema = addressSchema.extend({
  paymentMethod: z.enum(['cod', 'razorpay']),
  notes: z.string().max(500).optional(),
  couponCode: z.string().optional(),
});
type CheckoutForm = z.infer<typeof checkoutFormSchema>;

const STEPS = ['Cart', 'Address', 'Payment', 'Review'] as const;

export function CheckoutPage() {
  const { data: me, isError: authError } = useMeQuery();
  const { data: cart } = useGetCartQuery();
  const { data: settings } = useGetSettingsQuery();
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { paymentMethod: 'cod', country: 'IN' },
  });

  if (authError || !me?.user) {
    return (
      <PageShell narrow>
        <p className="text-center">Please log in to checkout.</p>
        <Link to="/login" className="btn-primary mx-auto mt-4 block w-fit">Login</Link>
      </PageShell>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageShell narrow>
        <p className="text-center">Your cart is empty.</p>
        <Link to="/shop" className="btn-primary mx-auto mt-4 block w-fit">Continue shopping</Link>
      </PageShell>
    );
  }

  const values = watch();

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <h1 className="section-title mb-6 text-3xl">Checkout</h1>

      <ol className="mb-10 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              i === step ? 'bg-forest text-cream' : i < step ? 'bg-gold/30 text-forest' : 'bg-cream-dark text-muted'
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (form) => {
            try {
              const { paymentMethod, notes, couponCode, ...address } = form;
              const order = await createOrder({
                paymentMethod,
                notes,
                couponCode: couponCode || undefined,
                address,
                idempotencyKey: crypto.randomUUID(),
              }).unwrap();

              if (paymentMethod === 'razorpay') {
                if (!settings?.razorpayConfigured) {
                  dispatch(pushToast({ type: 'error', message: 'Razorpay is not configured. Choose COD.' }));
                  return;
                }
                const rz = await apiFetch<{ razorpayOrderId: string }>('/payments/razorpay/create-order', {
                  method: 'POST',
                  json: { orderId: order.id },
                });
                dispatch(
                  pushToast({
                    type: 'info',
                    message: `Razorpay order ${rz.razorpayOrderId} created. Complete payment when keys are live.`,
                  }),
                );
              } else {
                dispatch(pushToast({ type: 'success', message: 'Order placed (COD)' }));
              }
              navigate(`/account/orders/${order.id}`);
            } catch (err) {
              dispatch(pushToast({ type: 'error', message: err instanceof Error ? err.message : 'Checkout failed' }));
            }
          })}
        >
          {step === 0 && (
            <div className="card-surface p-5">
              <p className="font-semibold text-forest">Cart review</p>
              <ul className="mt-3 space-y-2 text-sm">
                {cart.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span>{i.productNameEn} · {i.packWeightGrams}g × {i.quantity}</span>
                    <span>{formatINR(i.lineTotalPaise)}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn-primary mt-5" onClick={() => setStep(1)}>Continue to Address</button>
            </div>
          )}

          {step === 1 && (
            <div className="card-surface space-y-3 p-5">
              <p className="font-semibold text-forest">Shipping address</p>
              {(
                [
                  ['fullName', 'Full name'],
                  ['phone', 'Phone'],
                  ['line1', 'Address line 1'],
                  ['line2', 'Address line 2'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['postalCode', 'PIN code'],
                ] as const
              ).map(([name, label]) => (
                <div key={name}>
                  <label className="mb-1 block text-sm font-medium" htmlFor={name}>{label}</label>
                  <input id={name} className="input-field" {...register(name)} />
                  {errors[name] && <p className="text-sm text-discount">{errors[name]?.message as string}</p>}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-outline" onClick={() => setStep(0)}>Back</button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    const ok = await trigger(['fullName', 'phone', 'line1', 'city', 'state', 'postalCode']);
                    if (ok) setStep(2);
                  }}
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card-surface space-y-4 p-5">
              <p className="font-semibold text-forest">Payment method</p>
              <label className="flex items-center gap-3 rounded-xl border border-border p-4">
                <input type="radio" value="razorpay" {...register('paymentMethod')} />
                <span>
                  Razorpay (Cards / UPI)
                  {!settings?.razorpayConfigured && <span className="ml-2 text-xs text-muted">not configured</span>}
                </span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-border p-4">
                <input type="radio" value="cod" {...register('paymentMethod')} />
                <span>Cash on Delivery {settings?.codEnabled === false && '(disabled)'}</span>
              </label>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="couponCode">Coupon</label>
                <input id="couponCode" className="input-field" {...register('couponCode')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="notes">Order notes</label>
                <textarea id="notes" rows={3} className="input-field" {...register('notes')} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-outline" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn-primary" onClick={() => setStep(3)}>Review order</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card-surface space-y-4 p-5">
              <p className="font-semibold text-forest">Review & place order</p>
              <p className="text-sm text-muted">
                Ship to {values.fullName}, {values.line1}, {values.city}, {values.state} {values.postalCode}
              </p>
              <p className="text-sm">Payment: {values.paymentMethod?.toUpperCase()}</p>
              <div className="flex gap-3">
                <button type="button" className="btn-outline" onClick={() => setStep(2)}>Back</button>
                <button type="submit" disabled={isLoading} className="btn-gold disabled:opacity-50">
                  Place Order
                </button>
              </div>
            </div>
          )}
        </form>

        <aside className="card-surface h-fit p-5">
          <h2 className="font-display text-xl text-forest">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>{i.productNameEn} × {i.quantity}</span>
                <span>{formatINR(i.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(cart.subtotalPaise)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{formatINR(cart.shippingPaise)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatINR(cart.totalPaise)}</span></div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
