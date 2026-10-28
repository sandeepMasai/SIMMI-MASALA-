import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@simmi/shared';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../store/api';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';

export function RegisterPage() {
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center px-4 py-16"
      style={{
        backgroundImage:
          'linear-gradient(rgba(251,247,236,0.92), rgba(251,247,236,0.92)), url(https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1600&q=80)',
        backgroundSize: 'cover',
      }}
    >
      <div className="card-surface w-full max-w-md p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest text-cream">
            <Leaf size={22} />
          </span>
          <h1 className="font-display text-3xl text-forest">Create account</h1>
        </div>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              await registerUser(values).unwrap();
              dispatch(pushToast({ type: 'success', message: 'Account created' }));
              navigate('/account');
            } catch (err) {
              dispatch(pushToast({ type: 'error', message: err instanceof Error ? err.message : 'Registration failed' }));
            }
          })}
        >
          {(
            [
              ['name', 'Full name', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Phone (10 digits)', 'tel'],
            ] as const
          ).map(([name, label, type]) => (
            <div key={name}>
              <label className="mb-1 block text-sm font-medium" htmlFor={name}>{label}</label>
              <input id={name} type={type} className="input-field" {...register(name)} />
              {errors[name] && <p className="text-sm text-discount">{errors[name]?.message}</p>}
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} className="input-field pr-10" {...register('password')} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-discount">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-50">Register</button>
        </form>
        <p className="mt-4 text-center text-sm">
          Already have an account? <Link to="/login" className="font-semibold text-forest underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
