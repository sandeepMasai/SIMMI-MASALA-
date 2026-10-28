import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChefHat,
  Heart,
  Leaf,
  MapPin,
  Shield,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useGetContentQuery, useGetSettingsQuery } from '../store/api';

/** Replaceable brand photography placeholders — swap with official assets when available. */
const IMG = {
  // Replaceable placeholders — swap with official Simmi Masala photography when available
  hero: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=2000&q=80',
  story: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=80',
  location: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=80',
  process: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1516684669134-de6f7c34b2e3?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80',
  ],
} as const;

const SPICE_PHOTOS = [
  'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1606914501449-5a96b8aa59f9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1516684669134-de6f7c34b2e3?auto=format&fit=crop&w=400&q=80',
] as const;

const SPICES = [
  { hi: 'हल्दी', en: 'Turmeric', image: SPICE_PHOTOS[0], to: '/product/turmeric-powder' },
  { hi: 'लाल मिर्च', en: 'Red Chilli', image: SPICE_PHOTOS[1], to: '/product/red-chilli-powder' },
  { hi: 'धनिया', en: 'Coriander', image: SPICE_PHOTOS[2], to: '/product/coriander-powder' },
  { hi: 'जीरा', en: 'Cumin', image: SPICE_PHOTOS[3], to: '/shop?q=cumin' },
  { hi: 'गरम मसाला', en: 'Garam Masala', image: SPICE_PHOTOS[4], to: '/shop?q=garam' },
  { hi: 'काली मिर्च', en: 'Black Pepper', image: SPICE_PHOTOS[5], to: '/shop?q=pepper' },
  { hi: 'सौंफ', en: 'Fennel', image: SPICE_PHOTOS[2], to: '/shop' },
  { hi: 'अजवाइन', en: 'Carom', image: SPICE_PHOTOS[3], to: '/shop' },
  { hi: 'मेथी', en: 'Fenugreek', image: SPICE_PHOTOS[0], to: '/shop' },
  { hi: 'इलायची', en: 'Cardamom', image: SPICE_PHOTOS[1], to: '/shop' },
  { hi: 'लौंग', en: 'Cloves', image: SPICE_PHOTOS[4], to: '/shop' },
  { hi: 'दालचीनी', en: 'Cinnamon', image: SPICE_PHOTOS[5], to: '/shop' },
  { hi: 'राई', en: 'Mustard', image: SPICE_PHOTOS[2], to: '/shop' },
] as const;

const STORY_PILLARS = [
  { icon: ChefHat, label: 'भारतीय रसोई के लिए' },
  { icon: Users, label: 'परंपरा और आधुनिकता' },
  { icon: Heart, label: 'आपका विश्वास' },
  { icon: MapPin, label: 'अलवर, राजस्थान से' },
] as const;

const PROCESS = [
  { title: 'चयन', subtitle: 'किसानों से गुणवत्तापूर्ण मसाले', image: IMG.process[0] },
  { title: 'सफाई', subtitle: 'साफ-सुथरी तैयारी', image: IMG.process[1] },
  { title: 'पिसाई', subtitle: 'पारंपरिक तरीके से तैयार', image: IMG.process[2] },
  { title: 'पैकिंग', subtitle: 'सुरक्षित व स्वच्छ पैकिंग', image: IMG.process[3] },
] as const;

const VALUES = [
  { icon: Sparkles, title: 'बेहतर स्वाद अनुभव', subtitle: 'हर पकवान में असली मसाले का स्वाद' },
  { icon: Shield, title: 'आपका विश्वास', subtitle: 'पारदर्शिता और ईमानदारी' },
  { icon: Heart, title: 'ग्राहक केंद्रित', subtitle: 'आपकी रसोई हमारी प्राथमिकता' },
  { icon: Star, title: 'निरंतर सुधार', subtitle: 'हर दिन बेहतर बनने का प्रयास' },
] as const;

function OrnamentTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="h-px w-10 bg-gold md:w-14" aria-hidden />
      <span className="font-display text-sm font-semibold tracking-[0.2em] text-forest uppercase md:text-base">
        {children}
      </span>
      <span className="h-px w-10 bg-gold md:w-14" aria-hidden />
    </div>
  );
}

export function AboutPage() {
  const { data } = useGetSettingsQuery();
  const { data: aboutContent } = useGetContentQuery('about');
  const aboutBlocks = (aboutContent?.blocks ?? {}) as {
    heading?: string;
    tagline?: string;
    body?: string;
    imageUrl?: string;
  };
  const tagline = aboutBlocks.tagline || data?.tagline || 'हर रसोई की पहचान';
  const place = [data?.addressLine1, data?.city, data?.state].filter(Boolean).join(', ');
  const cityLabel = data?.city && data?.state ? `${data.city}, ${data.state}` : 'Alwar, Rajasthan';

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="relative min-h-[min(78vh,680px)] overflow-hidden">
        <img
          src={IMG.hero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,247,236,0.55)_0%,rgba(251,247,236,0.72)_45%,rgba(251,247,236,0.92)_100%)]" />
        <div className="relative mx-auto flex min-h-[min(78vh,680px)] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
          <div className="animate-fade-up rounded-3xl bg-cream/88 px-6 py-10 shadow-[var(--shadow-card)] backdrop-blur-md md:px-12 md:py-12">
            <OrnamentTitle>About</OrnamentTitle>
            <h1 className="mt-4 font-display text-5xl font-semibold text-forest md:text-6xl lg:text-7xl">
              {aboutBlocks.heading || 'Simmi Masala'}
            </h1>
            <p className="animate-fade-up-delay mt-5 flex flex-wrap items-center justify-center gap-3 font-hindi text-xl text-forest md:text-2xl">
              <Leaf className="text-gold" size={18} aria-hidden />
              <span>— {tagline} —</span>
              <Leaf className="text-gold" size={18} aria-hidden />
            </p>
            <p className="mt-5 max-w-xl font-hindi text-base leading-relaxed text-ink/85 md:text-lg">
              अलवर की धरती से आपकी रसोई तक — शुद्ध मसाले, पारंपरिक स्वाद, और हर घर की पहचान।
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.95fr_auto]">
          <div className="animate-fade-up">
            <div className="mb-4 flex items-center gap-2 text-forest">
              <Leaf className="text-gold" size={22} />
              <h2 className="font-hindi text-2xl font-bold md:text-3xl">हमारी कहानी</h2>
            </div>
            <p className="font-display text-xl font-semibold text-forest md:text-2xl">
              गाँव से रसोई तक की यात्रा
            </p>
            <div className="mt-5 space-y-4 font-hindi text-[15px] leading-relaxed text-ink/85 md:text-base">
              <p>
                सिम्मी मसाला की शुरुआत {place || 'Village Salpuri, Alwar, Rajasthan'} से हुई — जहाँ मसालों की
                खुशबू और पारंपरिक स्वाद पीढ़ियों से रसोई का हिस्सा रहे हैं।
              </p>
              <p>
                हमारा उद्देश्य है हर भारतीय घर तक शुद्ध और सुगंधित मसाले पहुँचाना, ताकि हर पकवान में
                असली स्वाद झलके। यह कहानी व्यवसाय द्वारा साझा किए गए स्थान और ब्रांड परिचय पर आधारित है।
              </p>
              {aboutBlocks.body ? (
                <p className="whitespace-pre-wrap text-sm text-muted">{aboutBlocks.body}</p>
              ) : data?.policies.about ? (
                <p className="whitespace-pre-wrap text-sm text-muted">{data.policies.about}</p>
              ) : null}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-fade-up-delay">
            <div className="absolute -inset-2 rounded-[1.75rem] border-2 border-gold/50" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.5rem] shadow-[var(--shadow-card)]">
              <img
                src={aboutBlocks.imageUrl || IMG.story}
                alt="Rajasthan architecture near Alwar — replaceable brand photo"
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-forest shadow">
                <MapPin size={16} className="text-gold-deep" />
                {cityLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-center gap-4 lg:flex-col lg:gap-5">
            {STORY_PILLARS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex w-20 flex-col items-center gap-2 text-center lg:w-24">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-forest text-cream shadow-soft lg:h-16 lg:w-16">
                  <Icon size={22} />
                </span>
                <p className="font-hindi text-[11px] leading-snug text-forest md:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Spices */}
      <section className="border-y border-border bg-white py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-hindi text-3xl font-bold text-forest md:text-4xl">हमारे मसाले</h2>
            <p className="mt-2 text-sm text-muted md:text-base">Authentic taste of the Indian kitchen</p>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
              {SPICES.map((spice) => (
                <Link
                  key={spice.en}
                  to={spice.to}
                  className="group text-center transition hover:-translate-y-0.5"
                >
                  <div className="mx-auto aspect-square overflow-hidden rounded-2xl border border-border bg-cream shadow-soft">
                    <img
                      src={spice.image}
                      alt={`${spice.en} — placeholder photography`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-2 font-hindi text-sm font-bold text-forest">{spice.hi}</p>
                  <p className="text-xs text-muted">{spice.en}</p>
                </Link>
              ))}
              <Link
                to="/shop"
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gold bg-cream/60 text-forest transition hover:bg-gold/15 sm:aspect-auto sm:min-h-[140px]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-forest-dark">
                  <ArrowRight size={20} />
                </span>
                <span className="text-sm font-semibold">See more spices</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-hindi text-2xl font-bold text-forest md:text-3xl">
            हमारी प्रक्रिया — खेत से आपकी रसोई तक
          </h2>
          <p className="mt-2 text-sm text-muted">From farm to your kitchen</p>
        </div>
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:gap-4">
          {PROCESS.map((step, i) => (
            <div key={step.title} className="flex items-center gap-4 md:flex-1 md:flex-col md:gap-0">
              <div className="flex flex-col items-center text-center">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-[3px] border-gold shadow-card md:h-36 md:w-36">
                  <img
                    src={step.image}
                    alt={`${step.title} — process illustration placeholder`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="mt-4 font-hindi text-lg font-bold text-forest">{step.title}</p>
                <p className="mt-1 max-w-[11rem] font-hindi text-xs text-muted md:text-sm">{step.subtitle}</p>
              </div>
              {i < PROCESS.length - 1 && (
                <ArrowRight
                  className="shrink-0 text-gold md:mt-[-3.5rem] md:rotate-0"
                  size={28}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Location + Values */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:pb-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative min-h-[260px] overflow-hidden rounded-2xl">
            <img
              src={IMG.location}
              alt="Our location — Rajasthan landscape placeholder"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-forest-dark/55" />
            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 text-cream md:p-8">
              <p className="font-hindi text-sm tracking-wide text-gold">हमारा स्थान</p>
              <h3 className="mt-1 font-display text-2xl font-semibold md:text-3xl">Our Location</h3>
              <p className="mt-2 font-hindi text-sm md:text-base">
                {place || 'Village Salpuri, Alwar, Rajasthan'}
                {data?.postalCode ? ` ${data.postalCode}` : ''}
              </p>
              <Link to="/contact" className="btn-gold mt-5 w-fit">
                Contact Us <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft md:p-8">
            <h3 className="font-hindi text-2xl font-bold text-forest">हमारे मूल्य</h3>
            <p className="mt-1 text-sm text-muted">Our values</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {VALUES.map(({ icon: Icon, title, subtitle }) => (
                <div key={title} className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-deep">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="font-hindi text-sm font-bold text-forest">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
