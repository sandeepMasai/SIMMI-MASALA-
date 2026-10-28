import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useGetSettingsQuery } from '../store/api';
import { Breadcrumbs, PageShell } from '../components/ui';

export { AboutPage } from './AboutPage';

export function ContactPage() {
  const { data } = useGetSettingsQuery();
  const [status, setStatus] = useState('');
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('Thanks — your message was recorded locally for demo. Connect an inbox endpoint to deliver it.');
  };

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <h1 className="section-title section-ornament mb-8 text-4xl">Contact Us</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card-surface flex gap-3 p-4">
            <MapPin className="text-forest" />
            <p>
              {data?.addressLine1}, {data?.city}, {data?.state} {data?.postalCode}
            </p>
          </div>
          <div className="card-surface flex gap-3 p-4">
            <Phone className="text-forest" />
            <a href={`tel:${data?.phone}`}>{data?.phone}</a>
          </div>
          <div className="card-surface flex gap-3 p-4">
            <Mail className="text-forest" />
            <a href={`mailto:${data?.email}`}>{data?.email}</a>
          </div>
          <a
            href={`https://wa.me/91${data?.whatsappNumber ?? '9772512267'}`}
            className="btn-gold inline-flex"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
        <form className="card-surface space-y-3 p-5" onSubmit={onSubmit}>
          <input required name="name" placeholder="Your name" className="input-field" />
          <input required type="email" name="email" placeholder="Email" className="input-field" />
          <input name="phone" placeholder="Phone" className="input-field" />
          <textarea required name="message" rows={5} placeholder="Message" className="input-field" />
          <button type="submit" className="btn-primary w-full">Send Message</button>
          {status && <p className="text-sm text-muted">{status}</p>}
        </form>
      </div>
    </PageShell>
  );
}

export function FaqPage() {
  const { data } = useGetSettingsQuery();
  return (
    <PageShell narrow>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'FAQ' }]} />
      <h1 className="section-title text-4xl">FAQ</h1>
      <p className="mt-3 rounded-xl bg-gold/15 p-3 text-sm">{data?.draftPolicyNotice}</p>
      <p className="mt-6 whitespace-pre-wrap leading-relaxed">{data?.policies.faq}</p>
    </PageShell>
  );
}

export function PolicyPage() {
  const { policy = 'privacy' } = useParams();
  const { data } = useGetSettingsQuery();
  const links = [
    ['privacy', 'Privacy Policy'],
    ['terms', 'Terms and Conditions'],
    ['shipping', 'Shipping Policy'],
    ['returns', 'Return and Refund Policy'],
    ['cancellation', 'Cancellation Policy'],
  ] as const;
  const map: Record<string, { title: string; body?: string }> = {
    privacy: { title: 'Privacy Policy', body: data?.policies.privacy },
    terms: { title: 'Terms and Conditions', body: data?.policies.terms },
    shipping: { title: 'Shipping Policy', body: data?.policies.shipping },
    returns: { title: 'Return and Refund Policy', body: data?.policies.returns },
    cancellation: { title: 'Cancellation Policy', body: data?.policies.cancellation },
  };
  const page = map[policy] ?? map.privacy!;

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: page.title }]} />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="card-surface h-fit p-3 text-sm">
          {links.map(([slug, label]) => (
            <Link
              key={slug}
              to={`/policies/${slug}`}
              className={`block rounded-lg px-3 py-2 ${policy === slug ? 'bg-forest text-cream' : 'hover:bg-cream'}`}
            >
              {label}
            </Link>
          ))}
        </aside>
        <article className="card-surface p-6">
          <h1 className="section-title text-3xl">{page.title}</h1>
          <p className="mt-3 rounded-xl bg-gold/15 p-3 text-sm">{data?.draftPolicyNotice}</p>
          <p className="mt-6 whitespace-pre-wrap leading-relaxed text-ink">{page.body}</p>
        </article>
      </div>
    </PageShell>
  );
}

export function NotFoundPage() {
  return (
    <PageShell narrow>
      <div className="py-16 text-center">
        <h1 className="section-title text-4xl">Page not found</h1>
        <Link to="/" className="btn-primary mt-6 inline-flex">Go home</Link>
      </div>
    </PageShell>
  );
}

export function AddressesPage() {
  return (
    <PageShell narrow>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Account', to: '/account' }, { label: 'Addresses' }]} />
      <h1 className="section-title text-3xl">Address book</h1>
      <p className="mt-4 text-muted">
        Add or select a shipping address during checkout. Saved addresses sync through the Addresses API for logged-in customers.
      </p>
      <Link to="/checkout" className="btn-primary mt-6 inline-flex">Go to checkout</Link>
    </PageShell>
  );
}
