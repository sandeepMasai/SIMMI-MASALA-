import { Link } from 'react-router-dom';
import { formatINR } from '@simmi/shared';
import { Trash2 } from 'lucide-react';
import { useGetCartQuery, useRemoveCartItemMutation, useUpdateCartItemMutation } from '../store/api';
import { Breadcrumbs, EmptyState, PageShell } from '../components/ui';

export function CartPage() {
  const { data: cart, isLoading } = useGetCartQuery();
  const [updateItem] = useUpdateCartItemMutation();
  const [removeItem] = useRemoveCartItemMutation();

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1 className="section-title mb-8 text-3xl md:text-4xl">Shopping Cart</h1>

      {isLoading && <p>Loading cart…</p>}
      {!isLoading && (!cart || cart.items.length === 0) && (
        <EmptyState title="Your cart is empty">
          <Link to="/shop" className="btn-primary mt-4 inline-flex">
            Continue shopping
          </Link>
        </EmptyState>
      )}

      {cart && cart.items.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="card-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-forest">{item.productNameEn}</p>
                  <p className="font-hindi text-sm text-muted">{item.productNameHi}</p>
                  <p className="mt-1 text-sm text-muted">{item.packWeightGrams}g · {formatINR(item.unitPricePaise)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" className="rounded border border-border px-2" onClick={() => void updateItem({ itemId: item.id, quantity: item.quantity - 1 })}>−</button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" className="rounded border border-border px-2" onClick={() => void updateItem({ itemId: item.id, quantity: item.quantity + 1 })}>+</button>
                    <button type="button" className="ml-auto text-discount" aria-label="Remove" onClick={() => void removeItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="font-semibold">{formatINR(item.lineTotalPaise)}</p>
              </div>
            ))}
          </div>

          <aside className="card-surface h-fit p-5">
            <h2 className="font-display text-xl text-forest">Order summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(cart.subtotalPaise)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>{formatINR(cart.discountPaise)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatINR(cart.shippingPaise)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatINR(cart.taxPaise)}</span></div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <span>Total</span><span>{formatINR(cart.totalPaise)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">Final totals are recalculated on the server at checkout.</p>
            <Link to="/checkout" className="btn-gold mt-5 w-full py-3">Proceed to Checkout</Link>
            <Link to="/shop" className="btn-outline mt-3 w-full py-3">Continue Shopping</Link>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
