import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-border">/</span>}
          {item.to ? (
            <Link to={item.to} className="hover:text-forest">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SectionHeading({
  title,
  action,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <h2 className="section-title section-ornament text-3xl md:text-4xl">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card-surface px-6 py-12 text-center">
      <p className="font-display text-xl text-forest">{title}</p>
      {children && <div className="mt-3 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function PageShell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto px-4 py-8 md:py-10 ${narrow ? 'max-w-3xl' : 'max-w-7xl'}`}>{children}</div>
  );
}
