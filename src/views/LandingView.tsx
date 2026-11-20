import React, { Suspense, lazy, useState } from 'react';
import { Store } from '../types';
import { extractStoreSlug } from '../utils/storeLink';
import { toast } from 'sonner';
import { useLanguage } from '../utils/i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  UserRound,
} from 'lucide-react';

const QRScannerModal = lazy(() =>
  import('../components/QRScannerModal').then((module) => ({ default: module.QRScannerModal })),
);

const ScannerFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-xs">
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-950 px-4 py-3 text-xs font-medium text-white shadow-elevated">
      <Loader2 className="h-4 w-4 animate-spin text-brand-300" />
      Ouverture du scanner...
    </div>
  </div>
);

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
}> = ({ store, isOpening, isDisabled, onOpen, viewLabel, onlineLabel }) => {
  const productCount = Number(store.current_products_count) || 0;
  const location = [store.city, store.quarter].filter(Boolean).join(' • ');

  return (
    <button
      onClick={onOpen}
      disabled={isDisabled}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-elevated disabled:cursor-wait cursor-pointer"
    >
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950">
        <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]" />
        {store.banner_url && (
          <img
            src={store.banner_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/65 via-ink-950/5 to-transparent" />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {onlineLabel}
        </span>

        {productCount > 0 && (
          <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {productCount} article{productCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div className="relative -mt-9 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-100 bg-white font-display text-lg font-bold text-brand-700 shadow-xs ring-4 ring-white">
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
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate font-display text-sm font-bold tracking-tight text-ink-950">
              {store.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
              <MapPin className="h-3 w-3 shrink-0 text-brand-600" />
              <span className="truncate">{location || 'Cameroun'}</span>
            </p>
          </div>
        </div>

        <p className="mt-2.5 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-ink-500">
          {store.tagline || store.description || 'Découvrez les articles disponibles dans cette boutique.'}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-3">
          <span className="text-[11px] font-semibold text-brand-700">{viewLabel}</span>
          {isOpening ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-900" />
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const steps = [
    { number: '01', title: t.landing.step1Title, description: t.landing.step1Desc, icon: ScanLine },
    { number: '02', title: t.landing.step2Title, description: t.landing.step2Desc, icon: ShoppingBag },
    { number: '03', title: t.landing.step3Title, description: t.landing.step3Desc, icon: MessageCircle },
  ];

  const openStore = async (slug: string) => {
    setPendingSlug(slug);
    setLinkError(null);

    try {
      const opened = await onOpenStoreBySlug(slug);
      if (!opened) {
        const message = language === 'fr'
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
        language === 'fr'
          ? 'Ce QR code ne contient pas de lien vers une boutique VitrineExpress.'
          : 'This QR code does not link to a VitrineExpress store.',
      );
      return;
    }
    void openStore(slug);
  };

  const storeCountLabel =
    language === 'fr'
      ? `${stores.length} boutique${stores.length > 1 ? 's' : ''} en ligne`
      : `${stores.length} store${stores.length > 1 ? 's' : ''} online`;

  const waCreateMsg =
    language === 'fr'
      ? 'Bonjour%20Karis%2C%20je%20souhaite%20cr%C3%A9er%20ma%20vitrine%20en%20ligne%20sur%20VitrineExpress.'
      : 'Hello%20Karis%2C%20I%20would%20like%20to%20create%20my%20online%20store%20on%20VitrineExpress.';

  const isPending = pendingSlug !== null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-warm-50">
      <section className="relative overflow-hidden border-b border-ink-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(5,150,105,0.10),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(245,158,11,0.10),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#0E1318_0.7px,transparent_0.7px)] [background-size:18px_18px]" />

        <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-800 shadow-xs backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            {t.landing.tagline}
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl lg:text-6xl max-w-3xl mx-auto leading-[1.08]">
            {t.landing.heroTitle}{' '}
            <span className="text-emerald-600">{t.landing.heroHighlight}</span>
          </h1>

          <p className="mt-5 max-w-2xl mx-auto text-base leading-relaxed text-ink-600 sm:text-lg">
            {t.landing.heroDescription}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onCreateStore}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{language === 'fr' ? 'Créer ma vitrine gratuite' : 'Create free store'}</span>
            </button>
            <a
              href="#boutiques"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-5 py-3.5 text-sm font-semibold text-ink-800 shadow-xs transition-colors hover:bg-warm-100"
            >
              <StoreIcon className="h-4 w-4 text-ink-500" />
              <span>{t.landing.ctaDiscover}</span>
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs font-medium text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {t.landing.featureNoApp}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {t.landing.featureWhatsApp}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {t.landing.featureInstant}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            {t.landing.stepsSubtitle}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            {t.landing.stepsTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            {t.landing.stepsDescription}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="font-display text-xs font-bold tracking-wider text-ink-300">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-4 font-display text-sm font-bold text-ink-950">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="boutiques" className="border-y border-ink-100 bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                {t.landing.discoverTitle}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                {t.landing.onlineStoresHeading}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {storeCountLabel}
            </span>
          </div>

          {isLoadingStores ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
                  <div className="h-28 animate-pulse bg-warm-100" />
                  <div className="space-y-3 p-4">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-warm-100" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-warm-100" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-warm-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : stores.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isOpening={pendingSlug === store.slug}
                  isDisabled={isPending}
                  onOpen={() => void openStore(store.slug)}
                  viewLabel={language === 'fr' ? 'Voir la boutique' : 'View store'}
                  onlineLabel={language === 'fr' ? 'En ligne' : 'Online'}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-ink-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-ink-400">
                <StoreIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-ink-900">
                {t.landing.emptyStoresTitle}
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-500">
                {t.landing.emptyStoresText}
              </p>
              <button
                onClick={onMerchantLogin}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-black cursor-pointer"
              >
                <UserRound className="h-3.5 w-3.5" />
                {language === 'fr' ? 'Espace gérant' : 'Merchant space'}
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="mt-auto border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
              <StoreIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-tight text-ink-950">
                VitrineExpress
              </p>
              <p className="text-[11px] text-ink-500">
                {t.landing.footerSubtitle}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-500">
            <a href="#boutiques" className="transition-colors hover:text-ink-950">
              {language === 'fr' ? 'Boutiques' : 'Stores'}
            </a>
            <button
              onClick={onMerchantLogin}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-950 cursor-pointer"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              {language === 'fr' ? 'Espace gérant' : 'Merchant space'}
            </button>
            <LanguageSwitcher variant="footer" />
          </nav>
        </div>
        <div className="border-t border-ink-100 px-4 py-4 text-center text-[10px] text-ink-400">
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
