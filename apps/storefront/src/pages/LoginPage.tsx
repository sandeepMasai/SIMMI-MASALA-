import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@simmi/shared';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';

export function LoginPage() {
  const [login, { isLoading }] = useLoginMutation();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center px-4 py-16"
      style={{
        backgroundImage:
          'linear-gradient(rgba(251,247,236,0.92), rgba(251,247,236,0.92)), url(https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=80)',
        backgroundSize: 'cover',
      }}
    >
      <div className="card-surface w-full max-w-md p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest text-cream">
            <Leaf size={22} />
          </span>
          <h1 className="font-display text-3xl text-forest">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to Simmi Masala</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              await login(values).unwrap();
              dispatch(pushToast({ type: 'success', message: 'Logged in' }));
              navigate('/account');
            } catch (err) {
              dispatch(pushToast({ type: 'error', message: err instanceof Error ? err.message : 'Login failed' }));
            }
          })}
        >
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">Email</label>
            <input id="email" type="email" className="input-field" {...register('email')} />
            {errors.email && <p className="text-sm text-discount">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} className="input-field pr-10" {...register('password')} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShow((s) => !s)} aria-label="Toggle password">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-discount">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-50">Login</button>
        </form>
        <p className="mt-4 text-center text-sm">
          New here? <Link to="/register" className="font-semibold text-forest underline">Create an account</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/forgot-password" className="text-muted underline">Forgot password</Link>
        </p>
      </div>
    </div>
  );
}
