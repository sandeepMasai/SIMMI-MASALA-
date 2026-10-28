import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useLoginMutation } from '../store/api';

function loginErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Login failed';
  const e = error as {
    status?: number | string;
    data?: { error?: { message?: string; code?: string } };
    error?: string;
  };
  const apiMessage = e.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (e.status === 'FETCH_ERROR' || e.error === 'TypeError: Failed to fetch') {
    return 'Cannot reach API. Is the backend running on port 4000?';
  }
  if (e.data?.error?.code === 'CSRF_INVALID') {
    return 'Security token expired. Refresh the page and try again.';
  }
  return 'Invalid email or password';
}

export function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<{ email: string; password: string }>({
    defaultValues: {
      email: 'admin@gmail.com',
      password: '',
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest-dark px-4">
      <form
        className="card w-full max-w-md space-y-4 p-8"
        onSubmit={handleSubmit(async (values) => {
          await login(values).unwrap();
          navigate('/');
        })}
      >
        <div className="text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest text-cream">
            <Leaf />
          </span>
          <h1 className="font-display text-3xl text-forest">Admin Panel</h1>
          <p className="mt-1 text-sm text-muted">No public registration. Use the seeded Super Admin.</p>
        </div>
        <input
          type="email"
          placeholder="Email"
          autoComplete="username"
          className="w-full rounded-xl border border-border px-3 py-2.5"
          {...register('email', { required: true })}
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-xl border border-border px-3 py-2.5"
          {...register('password', { required: true })}
        />
        {error && <p className="text-sm text-spice-red">{loginErrorMessage(error)}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-forest py-3 font-semibold text-cream hover:bg-forest-soft disabled:opacity-60"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
