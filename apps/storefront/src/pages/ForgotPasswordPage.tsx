import { useState } from 'react';
import { apiFetch } from '../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl text-spice-red">Reset password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const res = await apiFetch<{ message: string; emailConfigured: boolean; devToken?: string }>(
              '/auth/forgot-password',
              { method: 'POST', json: { email } },
            );
            setMessage(
              res.emailConfigured
                ? res.message
                : `${res.message} Email is not configured.${res.devToken ? ` Dev token: ${res.devToken}` : ''}`,
            );
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Request failed');
          } finally {
            setLoading(false);
          }
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-md border border-earth/20 px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-spice-red py-3 font-semibold text-cream"
        >
          Send reset link
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-earth">{message}</p>}
    </div>
  );
}
