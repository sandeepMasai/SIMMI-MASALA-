import { FormEvent, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Heart,
  HelpingHand,
  Leaf,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetCartQuery, useGetSettingsQuery, useMeQuery, useLogoutMutation } from '../store/api';
import { dismissToast, setCartOpen, setMobileNavOpen } from '../store/uiSlice';
import type { RootState } from '../store';
import { CartDrawer } from './CartDrawer';
import { getWishlistIds } from '../lib/wishlist';

const spiceLinks = [
  { to: '/product/turmeric-powder', label: 'Turmeric Powder' },
  { to: '/product/red-chilli-powder', label: 'Red Chilli Powder' },
  { to: '/product/coriander-powder', label: 'Coriander Powder' },
  { to: '/shop', label: 'All spices' },
];

export function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartOpen, mobileNavOpen, toasts } = useSelector((s: RootState) => s.ui);
  const { data: settings } = useGetSettingsQuery();
  const { data: cart } = useGetCartQuery();
  const { data: me } = useMeQuery();
  const [logout] = useLogoutMutation();
  const [query, setQuery] = useState('');
  const [spicesOpen, setSpicesOpen] = useState(false);
  const user = me?.user;
  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const wishCount = typeof window !== 'undefined' ? getWishlistIds().length : 0;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
    dispatch(setMobileNavOpen(false));
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="bg-forest text-cream">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12px] md:text-[13px]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} />
              {settings?.addressLine1 ?? 'Village Salpuri'}, {settings?.city ?? 'Alwar'}, Rajasthan
            </span>
            <a href={`tel:${settings?.phone ?? '9772512267'}`} className="inline-flex items-center gap-1.5 hover:underline">
              <Phone size={13} />
              {settings?.phone ?? '9772512267'}
            </a>
            <a
              href={`mailto:${settings?.email ?? 'SimmiMasala@gmail.com'}`}
              className="hidden items-center gap-1.5 sm:inline-flex hover:underline"
            >
              <Mail size={13} />
              {settings?.email ?? 'SimmiMasala@gmail.com'}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-4">
            <span className="inline-flex items-center gap-1.5">
              <Truck size={13} /> Free Shipping Above ₹499
            </span>
            <Link to="/account" className="hover:underline">
              Track Order
            </Link>
            <Link to="/faq" className="inline-flex items-center gap-1 hover:underline">
              <HelpingHand size={13} /> Help
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:gap-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-cream">
              <Leaf size={20} />
            </span>
            <span>
              <span className="font-display block text-xl font-semibold leading-none text-forest md:text-[1.65rem]">
                Simmi Masala
              </span>
              <span className="font-hindi mt-0.5 block text-[11px] text-gold-deep">
                {settings?.tagline ?? 'हर रसोई की पहचान'}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'text-sm font-semibold text-gold-deep' : 'text-sm font-medium text-ink hover:text-forest')}>
              Home
            </NavLink>
            <NavLink to="/shop" className={({ isActive }) => (isActive ? 'text-sm font-semibold text-gold-deep' : 'text-sm font-medium text-ink hover:text-forest')}>
              Shop
            </NavLink>
            <div
              className="relative"
              onMouseEnter={() => setSpicesOpen(true)}
              onMouseLeave={() => setSpicesOpen(false)}
            >
              <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-forest">
                Spices <ChevronDown size={14} />
              </button>
              {spicesOpen && (
                <div className="absolute left-0 top-full z-50 min-w-52 rounded-xl border border-border bg-white py-2 shadow-[var(--shadow-card)]">
                  {spiceLinks.map((l) => (
                    <Link
                      key={l.to + l.label}
                      to={l.to}
                      className="block px-4 py-2 text-sm hover:bg-cream"
                      onClick={() => setSpicesOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'font-semibold text-gold-deep underline decoration-2 underline-offset-8' : 'font-medium text-ink hover:text-forest'}`
              }
            >
              About Us
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `text-sm ${isActive ? 'font-semibold text-gold-deep underline decoration-2 underline-offset-8' : 'font-medium text-ink hover:text-forest'}`
              }
            >
              Contact
            </NavLink>
          </nav>

          <form onSubmit={onSearch} className="ml-auto hidden min-w-0 flex-1 max-w-md md:flex">
            <div className="flex w-full overflow-hidden rounded-full border border-border bg-cream">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search spices..."
                className="w-full bg-transparent px-4 py-2.5 text-sm outline-none"
                aria-label="Search spices"
              />
              <button type="submit" className="bg-forest px-4 text-cream hover:bg-forest-soft" aria-label="Search">
                <Search size={18} />
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {user ? (
              <Link to="/account" className="hidden items-center gap-1.5 rounded-full px-2 py-1.5 text-sm sm:inline-flex hover:bg-cream">
                <UserRound size={18} className="text-forest" />
                <span className="hidden xl:inline">Account</span>
              </Link>
            ) : (
              <Link to="/login" className="hidden items-center gap-1.5 rounded-full px-2 py-1.5 text-sm sm:inline-flex hover:bg-cream">
                <UserRound size={18} className="text-forest" />
                <span className="hidden xl:inline">Login / Register</span>
              </Link>
            )}
            <Link to="/account/wishlist" className="relative rounded-full p-2 text-forest hover:bg-cream" aria-label="Wishlist">
              <Heart size={20} />
              {wishCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-forest-dark">
                  {wishCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="relative rounded-full p-2 text-forest hover:bg-cream"
              aria-label="Open cart"
              onClick={() => dispatch(setCartOpen(true))}
            >
              <ShoppingBag size={20} />
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-discount px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            </button>
            {user && (
              <button type="button" onClick={() => void logout()} className="hidden text-xs text-muted hover:text-forest lg:inline">
                Logout
              </button>
            )}
            <button
              type="button"
              className="rounded-full p-2 text-forest lg:hidden"
              aria-label="Menu"
              onClick={() => dispatch(setMobileNavOpen(!mobileNavOpen))}
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-border px-4 py-4 lg:hidden">
            <form onSubmit={onSearch} className="mb-3 flex overflow-hidden rounded-full border border-border bg-cream">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spices..." className="w-full px-4 py-2.5 text-sm outline-none" />
              <button type="submit" className="bg-forest px-4 text-cream"><Search size={18} /></button>
            </form>
            <div className="flex flex-col">
              {[
                ['/', 'Home'],
                ['/shop', 'Shop'],
                ['/about', 'About Us'],
                ['/contact', 'Contact'],
                ['/account', 'Account'],
                ['/cart', 'Cart'],
              ].map(([to, label]) => (
                <Link key={to} to={to} className="rounded-md px-2 py-2 font-medium" onClick={() => dispatch(setMobileNavOpen(false))}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-10 bg-forest-dark text-cream">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
          <div className="md:col-span-1">
            <p className="font-display text-2xl">Simmi Masala</p>
            <p className="font-hindi mt-1 text-gold">{settings?.tagline ?? 'हर रसोई की पहचान'}</p>
            <p className="mt-4 text-sm leading-relaxed text-cream/80">
              {settings?.addressLine1}, {settings?.city}, {settings?.state} {settings?.postalCode}
            </p>
          </div>
          <div className="text-sm space-y-2">
            <p className="font-semibold text-gold">Quick links</p>
            <Link to="/shop" className="block text-cream/85 hover:underline">Shop</Link>
            <Link to="/about" className="block text-cream/85 hover:underline">About</Link>
            <Link to="/contact" className="block text-cream/85 hover:underline">Contact</Link>
            <Link to="/faq" className="block text-cream/85 hover:underline">FAQ</Link>
          </div>
          <div className="text-sm space-y-2">
            <p className="font-semibold text-gold">Policies</p>
            <Link to="/policies/privacy" className="block text-cream/85 hover:underline">Privacy</Link>
            <Link to="/policies/terms" className="block text-cream/85 hover:underline">Terms</Link>
            <Link to="/policies/shipping" className="block text-cream/85 hover:underline">Shipping</Link>
            <Link to="/policies/returns" className="block text-cream/85 hover:underline">Returns</Link>
            <Link to="/policies/cancellation" className="block text-cream/85 hover:underline">Cancellation</Link>
          </div>
          <div className="text-sm space-y-2">
            <p className="font-semibold text-gold">Support</p>
            <a href={`tel:${settings?.phone}`} className="block hover:underline">{settings?.phone}</a>
            <a href={`mailto:${settings?.email}`} className="block hover:underline">{settings?.email}</a>
            <a
              href={`https://wa.me/91${settings?.whatsappNumber ?? '9772512267'}`}
              className="mt-3 inline-block rounded-full bg-gold px-4 py-2 font-semibold text-forest-dark"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>

      {cartOpen && <CartDrawer />}

      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dispatch(dismissToast(t.id))}
            className={`block max-w-xs rounded-xl px-4 py-3 text-left text-sm shadow-lg ${
              t.type === 'error' ? 'bg-discount text-white' : 'bg-forest text-cream'
            }`}
          >
            {t.message}
          </button>
        ))}
      </div>
    </div>
  );
}
