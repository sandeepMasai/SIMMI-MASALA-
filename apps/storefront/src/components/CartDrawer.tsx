import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { formatINR } from '@simmi/shared';
import { useGetCartQuery, useRemoveCartItemMutation, useUpdateCartItemMutation } from '../store/api';
import { setCartOpen } from '../store/uiSlice';

export function CartDrawer() {
  const dispatch = useDispatch();
  const { data: cart, isLoading } = useGetCartQuery();
  const [updateItem] = useUpdateCartItemMutation();
  const [removeItem] = useRemoveCartItemMutation();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close cart"
        onClick={() => dispatch(setCartOpen(false))}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-earth/10 px-4 py-4">
          <h2 className="font-display text-xl text-forest">Your cart</h2>
          <button type="button" onClick={() => dispatch(setCartOpen(false))} className="text-sm font-semibold">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && <p>Loading…</p>}
          {!isLoading && (!cart || cart.items.length === 0) && (
            <p className="text-earth">Your cart is empty.</p>
          )}
          {cart?.items.map((item) => (
            <div key={item.id} className="mb-4 border-b border-earth/10 pb-4">
              <p className="font-semibold">{item.productNameEn}</p>
              <p className="font-hindi text-sm text-earth">{item.productNameHi}</p>
              <p className="text-sm">{item.packWeightGrams}g · {formatINR(item.unitPricePaise)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-2"
                  onClick={() => void updateItem({ itemId: item.id, quantity: item.quantity - 1 })}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  className="rounded border px-2"
                  onClick={() => void updateItem({ itemId: item.id, quantity: item.quantity + 1 })}
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-auto text-sm text-spice-red"
                  onClick={() => void removeItem(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {cart && cart.items.length > 0 && (
          <div className="border-t border-earth/10 p-4">
            <div className="mb-3 flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatINR(cart.subtotalPaise)}</span>
            </div>
            <div className="mb-3 flex justify-between text-sm">
              <span>Shipping estimate</span>
              <span>{formatINR(cart.shippingPaise)}</span>
            </div>
            <div className="mb-4 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatINR(cart.totalPaise)}</span>
            </div>
            <Link
              to="/cart"
              onClick={() => dispatch(setCartOpen(false))}
              className="mb-2 block rounded-full border border-border px-4 py-2.5 text-center text-sm font-semibold"
            >
              View cart
            </Link>
            <Link
              to="/checkout"
              onClick={() => dispatch(setCartOpen(false))}
              className="block rounded-full bg-forest px-4 py-3 text-center font-semibold text-cream"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
