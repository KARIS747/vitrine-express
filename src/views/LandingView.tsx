import React, { Suspense, lazy, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store } from '../types';
import { extractStoreSlug } from '../utils/storeLink';
import { toast } from 'sonner';
import { useLanguage } from '../utils/i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { HeroLiveDemo } from '../components/landing/HeroLiveDemo';
import { BentoShowcase } from '../components/landing/BentoShowcase';
import { PricingSection } from '../components/landing/PricingSection';
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  LockKeyhole,
  MapPin,
  MessageCircle,
  QrCode,
  ScanLine,
  Search,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  UserRound,
  Zap,
} from 'lucide-react';

const QRScannerModal = lazy(() =>
  import('../components/QRScannerModal').then((module) => ({ default: module.QRScannerModal })),
);

const ScannerFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-xs">
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900 px-5 py-3.5 text-xs font-medium text-white shadow-2xl">
      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
      Ouverture du scanner...
    </div>
  </div>
);

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500';

interface LandingViewProps {
  stores: Store[];
  isLoadingStores: boolean;
  onOpenStoreBySlug: (slug: string) => Promise<boolean>;
  onMerchantLogin: () => void;
  onCreateStore: () => void;
}

const StoreCard: React.FC<{
  store: Store;
  isOpening: boolean;
  isDisabled: boolean;
  onOpen: () => void;
  viewLabel: string;
  onlineLabel: string;
  fallbackDescription: string;
}> = ({ store, isOpening, isDisabled, onOpen, viewLabel, onlineLabel, fallbackDescription }) => {
  const productCount = Number(store.current_products_count) || 0;
  const location = [store.city, store.quarter].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isDisabled}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-ink-200/80 bg-white text-left shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-elevated disabled:cursor-wait dark:border-ink-800 dark:bg-ink-900 ${FOCUS}`}
    >
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#083022] via-[#0B4632] to-[#065F46]">
        {store.banner_url && (
          <img
            src={store.banner_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/20 to-transparent" />

        <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-ink-950/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {onlineLabel}
        </span>

        {productCount > 0 && (
          <span className="absolute right-3.5 top-3.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-950 backdrop-blur-md">
            {productCount} article{productCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3.5">
          <div className="relative -mt-10 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-emerald-50 font-display text-xl font-extrabold text-emerald-700 shadow-card dark:border-ink-900 dark:bg-emerald-950 dark:text-emerald-300">
            {store.name.charAt(0).toUpperCase()}
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-bold text-ink-950 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
              {store.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">{location || 'Cameroun'}</span>
            </p>
          </div>
        </div>

        <p className="mt-3.5 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-ink-600 dark:text-ink-300">
          {store.tagline || store.description || fallbackDescription}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3.5 text-xs font-bold text-emerald-700 dark:border-ink-800 dark:text-emerald-400">
          <span>{viewLabel}</span>
          {isOpening ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-transform group-hover:translate-x-0.5 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export const LandingView: React.FC<LandingViewProps> = ({
  stores,
  isLoadingStores,
  onOpenStoreBySlug,
  onMerchantLogin,
  onCreateStore,
}) => {
  const { t, language } = useLanguage();
  const isFr = language === 'fr';

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const openStore = async (slug: string) => {
    setPendingSlug(slug);
    setLinkError(null);

    try {
      const opened = await onOpenStoreBySlug(slug);
      if (!opened) {
        const message = isFr
          ? 'Boutique introuvable ou indisponible pour le moment.'
          : 'Store not found or currently unavailable.';
        setLinkError(message);
        toast.error(message);
      }
    } finally {
      setPendingSlug(null);
    }
  };

  const handleLinkSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const slug = extractStoreSlug(linkInput);

    if (!slug) {
      setLinkError(t.landing.invalidLinkError);
      return;
    }

    void openStore(slug);
  };

  const handleDetected = (value: string) => {
    const slug = extractStoreSlug(value);
    if (!slug) {
      toast.error(
        isFr
          ? 'Ce QR code ne contient pas de lien vers une boutique VitrineExpress.'
          : 'This QR code does not link to a VitrineExpress store.',
      );
      return;
    }
    void openStore(slug);
  };

  const filteredStores = useMemo(() => {
    const query = storeFilter.trim().toLowerCase();
    if (!query) return stores;
    return stores.filter((s) =>
      [s.name, s.city, s.quarter, s.tagline].some((field) =>
        String(field ?? '').toLowerCase().includes(query),
      ),
    );
  }, [stores, storeFilter]);

  const steps = isFr
    ? [
        {
          number: '01',
          icon: Zap,
          title: 'Créez votre boutique en 60s',
          desc: 'Renseignez le nom, votre numéro WhatsApp et un code PIN. Votre lien public est généré à la seconde.',
        },
        {
          number: '02',
          icon: ShoppingBag,
          title: 'Ajoutez vos produits & prix',
          desc: 'Prenez une photo, fixez le prix en FCFA et indiquez le stock ou la date de prochain arrivage.',
        },
        {
          number: '03',
          icon: MessageCircle,
          title: 'Partagez & encaissez sur WhatsApp',
          desc: 'Postez votre lien en statut ou imprimez votre affiche QR. Vos clients vous envoient des commandes propres.',
        },
      ]
    : [
        {
          number: '01',
          icon: Zap,
          title: 'Launch your store in 60s',
          desc: 'Enter your shop name, WhatsApp number, and a secret PIN. Your public link goes live instantly.',
        },
        {
          number: '02',
          icon: ShoppingBag,
          title: 'Add products & prices',
          desc: 'Upload photos, set prices, and mark availability or upcoming restock dates.',
        },
        {
          number: '03',
          icon: MessageCircle,
          title: 'Share & get orders on WhatsApp',
          desc: 'Put your link on your bio/status or print your QR poster. Receive clean, structured orders.',
        },
      ];

  const faqs = isFr
    ? [
        {
          q: 'Ai-je besoin de compétences techniques ou d’un ordinateur ?',
          a: 'Non. Tout se fait depuis votre téléphone en moins d’une minute : création de la boutique, ajout de photos, modification des prix et téléchargement de votre affiche QR.',
        },
        {
          q: 'Prenez-vous une commission sur mes ventes ?',
          a: 'Jamais. 0% de commission. Vos clients vous commandent directement sur votre WhatsApp et vous paient selon vos moyens habituels (MTN MoMo, Orange Money, espèces, virement).',
        },
        {
          q: 'Combien coûte l’ouverture d’une boutique ?',
          a: 'Le plan Découverte est totalement gratuit (jusqu’à 8 articles) sans limite de temps et sans carte bancaire. Vous pouvez passer au plan Pro (8 000 FCFA/an) ou Premium (20 000 FCFA/an) quand votre catalogue grandit.',
        },
        {
          q: 'Comment mes clients accèdent-ils à ma vitrine ?',
          a: 'Par votre lien personnalisé (ex: vitrine-express.pages.dev/boutique/ma-boutique) ou en scannant votre affiche QR code. Ils n’ont aucune application à installer.',
        },
      ]
    : [
        {
          q: 'Do I need technical skills or a laptop?',
          a: 'Not at all. Everything runs smoothly from your smartphone in under a minute: create your shop, upload photos, update prices, and download your QR poster.',
        },
        {
          q: 'Do you charge any commission on my sales?',
          a: 'Never. 0% commission. Customers send orders straight to your WhatsApp and pay you directly using your preferred methods.',
        },
        {
          q: 'How much does it cost to start?',
          a: 'The Découverte plan is completely free forever (up to 8 items) with no credit card needed. Upgrade to Pro (8,000 FCFA/year) or Premium (20,000 FCFA/year) whenever your catalog expands.',
        },
        {
          q: 'How do shoppers open my storefront?',
          a: 'Via your custom link or by scanning your printed QR code poster. No app download or customer account is required.',
        },
      ];

  const isPending = pendingSlug !== null;
  const featuredStore = stores[0];
  const storeCountLabel = isFr
    ? `${stores.length} boutique${stores.length > 1 ? 's' : ''} en ligne`
    : `${stores.length} store${stores.length > 1 ? 's' : ''} online`;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-[#F7F6F2] text-ink-950 transition-colors dark:bg-ink-950 dark:text-ink-100">
      {/* =========================================================
          1. HERO SHOWCASE (Deep Emerald Obsidian Canvas)
         ========================================================= */}
      <section className="relative overflow-hidden bg-[#061510] pb-24 pt-12 text-white sm:pb-28 sm:pt-16 lg:pt-20">
        {/* Subtle architectural grid & radial glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-0 h-[380px] w-[380px] rounded-full bg-amber-400/15 blur-[120px]"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:gap-14">
          {/* Left Hero Copy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span>
                {isFr
                  ? 'Vitrines WhatsApp nouvelle génération • 0% de commission'
                  : 'Next-gen WhatsApp storefronts • 0% commission'}
              </span>
            </div>

            <h1 className="mt-6 font-display text-[2.45rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.7rem]">
              {isFr ? (
                <>
                  Transformez votre WhatsApp en{' '}
                  <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                    boutique qui vend 24h/24.
                  </span>
                </>
              ) : (
                <>
                  Turn your WhatsApp into a{' '}
                  <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                    24/7 selling storefront.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-emerald-100/80 sm:text-lg">
              {t.landing.heroDescription}
            </p>

            {/* Primary CTA Cluster */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onCreateStore}
                className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_-8px_rgba(16,185,129,0.55)] transition-all hover:-translate-y-0.5 hover:from-emerald-400 hover:to-emerald-500 ${FOCUS}`}
              >
                <Sparkles className="h-4 w-4 text-amber-200" />
                <span>{t.landing.ctaCreateStore}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <a
                href="#boutiques"
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-emerald-400/50 hover:bg-white/10 ${FOCUS}`}
              >
                <StoreIcon className="h-4 w-4 text-emerald-300" />
                <span>{t.landing.ctaDiscover}</span>
                {stores.length > 0 && (
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                    {stores.length}
                  </span>
                )}
              </a>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={onMerchantLogin}
                className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200/80 transition-colors hover:text-white ${FOCUS}`}
              >
                <LockKeyhole className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {isFr ? 'Vous avez déjà une boutique ? Accéder à l’espace gérant →' : 'Already have a store? Open merchant portal →'}
                </span>
              </button>
            </div>

            {/* Crisp Metrics Strip */}
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">60s</p>
                <p className="mt-0.5 text-xs text-emerald-200/75">
                  {isFr ? 'Pour être en ligne' : 'To launch live'}
                </p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-amber-300 sm:text-3xl">0 FCFA</p>
                <p className="mt-0.5 text-xs text-emerald-200/75">
                  {isFr ? 'Plan Découverte' : 'Starter plan'}
                </p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-emerald-400 sm:text-3xl">0%</p>
                <p className="mt-0.5 text-xs text-emerald-200/75">
                  {isFr ? 'Commission / vente' : 'Sales commission'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Hero Interactive Simulator */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
          >
            <HeroLiveDemo
              storeName={featuredStore?.name}
              storeCity={featuredStore?.city}
              language={language}
              onCreateStore={onCreateStore}
            />
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          2. FLOATING CLIENT ACCESS DOCK (QR + Link + Quick Pills)
         ========================================================= */}
      <section className="relative z-20 mx-auto -mt-12 w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl border border-ink-200/90 bg-white p-5 shadow-elevated dark:border-ink-800 dark:bg-ink-900 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] md:items-center md:gap-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink-950 dark:text-white">
                  {t.landing.clientAccessHeading}
                </h2>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                  {t.landing.scanQrSub}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 dark:bg-white dark:text-ink-950 dark:hover:bg-emerald-400 ${FOCUS}`}
              >
                <ScanLine className="h-4 w-4" />
                <span>{t.landing.scanQrBtn}</span>
              </button>

              <form onSubmit={handleLinkSubmit} className="flex min-w-0 flex-1 gap-2">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(event) => {
                    setLinkInput(event.target.value);
                    setLinkError(null);
                  }}
                  placeholder={t.landing.pasteLinkPlaceholder}
                  aria-label={t.landing.pasteLinkPlaceholder}
                  className={`min-h-11 min-w-0 flex-1 rounded-xl border border-ink-200 bg-ink-50/70 px-3.5 text-sm text-ink-950 placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-950 dark:text-white ${FOCUS}`}
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className={`min-h-11 shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 ${FOCUS}`}
                >
                  {isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.landing.openStoreBtn}
                </button>
              </form>
            </div>
          </div>

          {linkError && (
            <p role="alert" className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">
              {linkError}
            </p>
          )}

          {stores.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3.5 dark:border-ink-800">
              <span className="text-[11px] font-semibold text-ink-400 dark:text-ink-500">
                {isFr ? 'Accès rapide :' : 'Quick access:'}
              </span>
              {stores.slice(0, 4).map((store) => (
                <button
                  key={store.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => void openStore(store.slug)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-800 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:border-emerald-500"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{store.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          3. HOW IT WORKS (3-Step Visual Flow)
         ========================================================= */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            {isFr ? 'Simple du début à la fin' : 'Effortless from start to finish'}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950 dark:text-white sm:text-4xl">
            {isFr
              ? 'En ligne en 3 étapes, sans aucun casse-tête.'
              : 'Live in 3 simple steps.'}
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                className="relative rounded-3xl border border-ink-200/80 bg-white p-6 shadow-subtle dark:border-ink-800 dark:bg-ink-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-3xl font-extrabold text-ink-200 dark:text-ink-800">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-ink-950 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          4. BEFORE / AFTER & BENTO FEATURE SHOWCASE
         ========================================================= */}
      <BentoShowcase language={language} onCreateStore={onCreateStore} />

      {/* =========================================================
          5. LIVE STORES DIRECTORY (#boutiques)
         ========================================================= */}
      <section id="boutiques" className="mt-20 border-y border-ink-200/70 bg-white/60 py-20 dark:border-ink-800 dark:bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                {t.landing.discoverTitle}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950 dark:text-white sm:text-4xl">
                {t.landing.onlineStoresHeading}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {stores.length > 3 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                  <input
                    type="search"
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    placeholder={isFr ? 'Filtrer par nom ou ville...' : 'Filter by name or city...'}
                    className={`h-9 rounded-xl border border-ink-200 bg-white pl-8 pr-3 text-xs text-ink-900 placeholder:text-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white ${FOCUS}`}
                  />
                </div>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {storeCountLabel}
              </span>
            </div>
          </div>

          {isLoadingStores ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-3xl border border-ink-200/80 bg-white dark:border-ink-800 dark:bg-ink-900"
                >
                  <div className="h-36 animate-pulse bg-ink-100 dark:bg-ink-800" />
                  <div className="space-y-3 p-5">
                    <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStores.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isOpening={pendingSlug === store.slug}
                  isDisabled={isPending}
                  onOpen={() => void openStore(store.slug)}
                  viewLabel={isFr ? 'Visiter la vitrine' : 'Visit storefront'}
                  onlineLabel={isFr ? 'En ligne' : 'Online'}
                  fallbackDescription={
                    isFr
                      ? 'Découvrez le catalogue et commandez en un clic sur WhatsApp.'
                      : 'Browse the catalog and order in one tap on WhatsApp.'
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-subtle dark:border-ink-800 dark:bg-ink-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <StoreIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-950 dark:text-white">
                {storeFilter ? (isFr ? 'Aucune boutique correspondante' : 'No matching store') : t.landing.emptyStoresTitle}
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                {storeFilter
                  ? isFr
                    ? 'Essayez un autre nom ou une autre ville.'
                    : 'Try another store name or city.'
                  : t.landing.emptyStoresText}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                {storeFilter ? (
                  <button
                    type="button"
                    onClick={() => setStoreFilter('')}
                    className={`rounded-xl border border-ink-200 px-4 py-2.5 text-xs font-bold text-ink-800 hover:bg-ink-50 dark:border-ink-700 dark:text-white ${FOCUS}`}
                  >
                    {isFr ? 'Tout afficher' : 'Show all'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onCreateStore}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 ${FOCUS}`}
                  >
                    <UserRound className="h-4 w-4" />
                    {t.landing.ctaCreateStore}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          6. PRICING SECTION
         ========================================================= */}
      <PricingSection language={language} onSelectPlan={onCreateStore} />

      {/* =========================================================
          7. FAQ ACCORDION
         ========================================================= */}
      <section id="faq" className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            FAQ
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950 dark:text-white">
            {isFr ? 'Questions fréquentes' : 'Frequently asked questions'}
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-ink-200/90 bg-white transition-colors dark:border-ink-800 dark:bg-ink-900"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left ${FOCUS}`}
                >
                  <span className="font-display text-sm font-bold text-ink-950 dark:text-white sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-ink-100 px-5 pb-4 pt-3 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:text-ink-300">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          8. FINAL CONVERSION BANNER
         ========================================================= */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061812] via-[#0B2D21] to-[#064E3B] px-6 py-12 text-center text-white shadow-elevated sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-emerald-400/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-amber-400/15 blur-3xl"
          />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {isFr
                ? 'Prêt à donner une vraie vitrine à votre boutique ?'
                : 'Ready to give your business a real storefront?'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-100/85 sm:text-base">
              {isFr
                ? 'Créez votre catalogue gratuit maintenant, testez-le sur votre téléphone et partagez votre lien dès aujourd’hui.'
                : 'Create your free catalog now, preview it on your phone, and share your link today.'}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onCreateStore}
                className={`inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#061812] shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-emerald-50 ${FOCUS}`}
              >
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>{t.landing.ctaCreateStore}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onMerchantLogin}
                className={`inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15 ${FOCUS}`}
              >
                <UserRound className="h-4 w-4" />
                <span>{isFr ? 'Espace gérant' : 'Merchant space'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          9. FOOTER
         ========================================================= */}
      <footer className="mt-auto border-t border-ink-200/80 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 font-display text-sm font-extrabold text-white shadow-xs">
              VE
            </div>
            <div>
              <p className="font-display text-sm font-bold text-ink-950 dark:text-white">
                VitrineExpress
              </p>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                {t.landing.footerSubtitle}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-ink-600 dark:text-ink-300">
            <a href="#boutiques" className={`transition-colors hover:text-emerald-600 ${FOCUS}`}>
              {isFr ? 'Boutiques' : 'Stores'}
            </a>
            <a href="#tarifs" className={`transition-colors hover:text-emerald-600 ${FOCUS}`}>
              {isFr ? 'Tarifs' : 'Pricing'}
            </a>
            <a href="#faq" className={`transition-colors hover:text-emerald-600 ${FOCUS}`}>
              FAQ
            </a>
            <button
              type="button"
              onClick={onMerchantLogin}
              className={`inline-flex items-center gap-1.5 transition-colors hover:text-emerald-600 ${FOCUS}`}
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              {isFr ? 'Espace gérant' : 'Merchant space'}
            </button>
            <LanguageSwitcher variant="footer" />
          </nav>
        </div>
        <div className="border-t border-ink-100 px-4 py-4 text-center text-[11px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
          © {new Date().getFullYear()} {t.landing.footerDesignedBy}
        </div>
      </footer>

      {isScannerOpen && (
        <Suspense fallback={<ScannerFallback />}>
          <QRScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onDetected={handleDetected}
          />
        </Suspense>
      )}
    </div>
  );
};
