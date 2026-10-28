import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useGetContentQuery, useGetProductsQuery, useGetSettingsQuery } from '../store/api';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { SectionHeading } from '../components/ui';

const HERO_BG = '/images/simmi-hero-bg.png';

const CATEGORIES = [
  { nameEn: 'Turmeric Powder', nameHi: 'हल्दी पाउडर', to: '/product/turmeric-powder', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=700&q=80', tint: 'from-amber-500/80' },
  { nameEn: 'Red Chilli Powder', nameHi: 'लाल मिर्च पाउडर', to: '/product/red-chilli-powder', image: 'https://images.unsplash.com/photo-1583454110551-21d2be4e0e89?auto=format&fit=crop&w=700&q=80', tint: 'from-red-700/80' },
  { nameEn: 'Coriander Powder', nameHi: 'धनिया पाउडर', to: '/product/coriander-powder', image: 'https://images.unsplash.com/photo-1599909533730-f9aedb8e0b6f?auto=format&fit=crop&w=700&q=80', tint: 'from-lime-700/80' },
  { nameEn: 'Garam Masala', nameHi: 'गरम मसाला', to: '/shop?q=garam', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=80', tint: 'from-orange-900/80', soon: true },
  { nameEn: 'Cumin', nameHi: 'जीरा', to: '/shop?q=cumin', image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=700&q=80', tint: 'from-yellow-800/80', soon: true },
  { nameEn: 'Black Pepper', nameHi: 'काली मिर्च', to: '/shop?q=pepper', image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=700&q=80', tint: 'from-stone-800/80', soon: true },
  { nameEn: 'Whole Spices', nameHi: 'साबुत मसाले', to: '/shop', image: 'https://images.unsplash.com/photo-1606914501449-5a96b8aa59f9?auto=format&fit=crop&w=700&q=80', tint: 'from-emerald-900/80', soon: true },
  { nameEn: 'Other Spices', nameHi: 'अन्य मसाले', to: '/shop', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=80', tint: 'from-forest/80', soon: true },
] as const;

const VALUE_PROPS = [
  { title: '100% Pure Spices', subtitle: 'Natural & Fresh', icon: Leaf },
  { title: 'Traditional Quality', subtitle: 'Authentic Taste', icon: Sparkles },
  { title: 'Hygienically Packed', subtitle: 'Safe & Clean', icon: PackageCheck },
  { title: 'Direct from Rajasthan', subtitle: 'Village Salpuri, Alwar', icon: ShieldCheck },
  { title: 'Fast & Safe Delivery', subtitle: 'Across India', icon: Truck },
] as const;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'turmeric', label: 'Turmeric', match: 'turmeric' },
  { id: 'chilli', label: 'Red Chilli', match: 'chilli' },
  { id: 'coriander', label: 'Coriander', match: 'coriander' },
] as const;

export function HomePage() {
  const { data: settings } = useGetSettingsQuery();
  const { data: heroContent } = useGetContentQuery('home.hero');
  const heroBlocks = (heroContent?.blocks ?? {}) as {
    heading?: string;
    tagline?: string;
    subheading?: string;
    imageUrl?: string;
  };
  const { data, isLoading } = useGetProductsQuery({ page: 1 });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const products = data?.items ?? [];
  const filtered = useMemo(() => {
    if (filter === 'all') return products;
    const f = FILTERS.find((x) => x.id === filter);
    if (!f || !('match' in f)) return products;
    return products.filter(
      (p) => p.slug.includes(f.match) || p.nameEn.toLowerCase().includes(f.match),
    );
  }, [products, filter]);

  return (
    <div>
      <section
        className="relative min-h-[420px] overflow-hidden bg-cover bg-center bg-no-repeat md:min-h-[560px] lg:min-h-[640px]"
        style={{
          backgroundImage: `url('${heroBlocks.imageUrl?.trim() || HERO_BG}')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/10" />
        <div className="relative z-10 mx-auto flex min-h-[420px] max-w-7xl items-center px-6 md:min-h-[560px] lg:min-h-[640px]">
          <div className="animate-fade-up max-w-xl rounded-3xl bg-cream/95 p-6 text-forest shadow-[var(--shadow-card)] md:p-8">
            <p className="font-display text-4xl font-semibold tracking-tight text-forest md:text-6xl">
              {heroBlocks.heading || 'Simmi Masala'}
            </p>
            <p className="mt-3 font-display text-xl text-gold-deep md:text-2xl">
              {heroBlocks.subheading || 'Pure Spices, Pure Life'}
            </p>
            <p className="font-hindi mt-2 text-lg text-forest">
              {heroBlocks.tagline || settings?.tagline || 'हर रसोई की पहचान'}
            </p>
            <Link to="/shop" className="btn-primary mt-6 px-8 py-3">
              Shop Now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-5">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-cream text-forest">
                <v.icon size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-forest">{v.title}</p>
                <p className="text-xs text-muted">{v.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHeading
          title="Shop by Category"
          action={
            <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:underline">
              View All <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c.nameEn} to={c.to} className="group relative overflow-hidden rounded-2xl shadow-md">
              <img src={c.image} alt={c.nameEn} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              <div className={`absolute inset-0 bg-gradient-to-t ${c.tint} to-transparent`} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-cream">
                <div>
                  <p className="font-display text-lg leading-tight">{c.nameEn}</p>
                  <p className="font-hindi text-sm opacity-90">{c.nameHi}</p>
                  {'soon' in c && c.soon && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-gold">Coming soon</p>
                  )}
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-forest">
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="section-title section-ornament text-3xl md:text-4xl">Our Best Sellers</h2>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    filter === f.id ? 'bg-gold text-forest-dark' : 'bg-cream text-ink hover:bg-cream-dark'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
            {filtered.map((p, idx) => (
              <ProductCard key={p.id} product={p} badge={idx === 0 ? 'Best Seller' : undefined} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
