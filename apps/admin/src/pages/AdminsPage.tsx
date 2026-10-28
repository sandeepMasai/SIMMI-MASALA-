import type { UserRole } from '@simmi/shared';
import { FormEvent, useState } from 'react';
import { useAdminsQuery, useCreateAdminMutation, useUpdateAdminMutation } from '../store/api';

const ADMIN_ROLES: UserRole[] = [
  'super_admin',
  'product_manager',
  'order_manager',
  'support_manager',
];

export function AdminsPage() {
  const { data, isLoading, isError } = useAdminsQuery();
  const [createAdmin, { isLoading: creating }] = useCreateAdminMutation();
  const [updateAdmin, { isLoading: updating }] = useUpdateAdminMutation();
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setOk('');
    const fd = new FormData(e.currentTarget);
    try {
      await createAdmin({
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        password: String(fd.get('password') || ''),
        role: String(fd.get('role')) as UserRole,
      }).unwrap();
      setOk('Admin created.');
      e.currentTarget.reset();
    } catch {
      setError('Could not create admin (email may already exist, or insufficient permissions).');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Admins</h1>
      <p className="mt-1 text-sm text-muted">Manage admin accounts and roles.</p>

      <form onSubmit={(e) => void onCreate(e)} className="card mt-6 max-w-xl space-y-3 p-5">
        <h2 className="font-display text-xl text-forest">Create admin</h2>
        <div>
          <label className="block text-sm font-semibold" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="password">
            Temporary password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="support_manager"
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2"
          >
            {ADMIN_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-spice-red">{error}</p>}
        {ok && <p className="text-sm text-forest">{ok}</p>}
        <button
          type="submit"
          disabled={creating}
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {creating ? 'Creating…' : 'Create admin'}
        </button>
      </form>

      {isLoading && <p className="mt-6">Loading…</p>}
      {isError && (
        <p className="mt-6 text-spice-red">
          Could not load admins (requires admins:manage permission).
        </p>
      )}
      {!isLoading && !isError && !(data ?? []).length && (
        <p className="mt-6 text-muted">No admin users found.</p>
      )}

      <ul className="mt-6 space-y-3">
        {(data ?? []).map((admin) => (
          <li
            key={admin.id}
            className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
          >
            <div>
              <p className="font-semibold text-forest">{admin.name}</p>
              <p className="text-muted">
                {admin.email} · {admin.role} · {admin.accountStatus}
              </p>
              <p className="mt-1 text-xs text-muted">
                created {new Date(admin.createdAt).toLocaleDateString()}
                {admin.lastLoginAt
                  ? ` · last login ${new Date(admin.lastLoginAt).toLocaleString()}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={admin.role}
                disabled={updating}
                className="rounded-xl border border-border bg-white px-2 py-1"
                onChange={(e) =>
                  void updateAdmin({
                    id: admin.id,
                    body: { role: e.target.value as UserRole },
                  })
                }
              >
                {ADMIN_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={updating}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                onClick={() =>
                  void updateAdmin({
                    id: admin.id,
                    body: {
                      accountStatus: admin.accountStatus === 'active' ? 'disabled' : 'active',
                    },
                  })
                }
              >
                {admin.accountStatus === 'active' ? 'Disable' : 'Enable'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
