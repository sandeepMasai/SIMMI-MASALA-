import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useLogoutMutation, useMeQuery } from '../store/api';
import { isAdminRole } from '@simmi/shared';
import { Leaf, Menu, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  ['/', 'Dashboard'],
  ['/products', 'Products'],
  ['/categories', 'Categories'],
  ['/inventory', 'Inventory'],
  ['/orders', 'Orders'],
  ['/customers', 'Customers'],
  ['/coupons', 'Coupons'],
  ['/content', 'Content'],
  ['/reports', 'Reports'],
  ['/admins', 'Admins'],
  ['/audit', 'Audit'],
  ['/settings', 'Settings'],
] as const;

export function AdminShell() {
  const { data, isLoading, isError } = useMeQuery();
  const [logout] = useLogoutMutation();
  const [open, setOpen] = useState(false);

  if (isLoading) return <p className="p-10">Loading…</p>;
  if (isError || !data?.user || !isAdminRole(data.user.role)) {
    return <Navigate to="/login" replace />;
  }

  const Nav = (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-forest-dark">
          <Leaf size={18} />
        </span>
        <div>
          <p className="font-display text-lg leading-none">Simmi Admin</p>
          <p className="mt-1 text-[11px] opacity-70">{data.user.role}</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-2 pb-6">
        {nav.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-gold text-forest-dark' : 'text-cream/90 hover:bg-white/10'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          className="mt-4 rounded-xl px-3 py-2.5 text-left text-sm text-cream/80 hover:bg-white/10"
          onClick={() => void logout()}
        >
          Logout
        </button>
      </nav>
    </>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-forest-dark text-cream md:block">{Nav}</aside>
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 md:hidden">
          <p className="font-display text-lg text-forest">Simmi Admin</p>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && <div className="bg-forest-dark text-cream md:hidden">{Nav}</div>}
        <main className="flex-1 p-4 md:p-6">{<Outlet />}</main>
      </div>
    </div>
  );
}
