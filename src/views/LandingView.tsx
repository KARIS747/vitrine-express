import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Store } from '../types';
import { extractStoreSlug } from '../utils/storeLink';
import { toast } from 'sonner';
import { useLanguage } from '../utils/i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { formatFCFA } from '../utils/formatters';
import { PLAN_IDS, PLANS, PROMO_CODES } from '../utils/plans';
import {
  Loader2,
  LockKeyhole,
  MapPin,
  QrCode,
  ScanLine,
  Search,
  Store as StoreIcon,
  UserRound,
} from 'lucide-react';

const QRScannerModal = lazy(() =>
  import('../components/QRScannerModal').then((module) => ({ default: module.QRScannerModal })),
);

const ScannerFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ledger-ink/80 p-4">
    <div className="flex items-center gap-2 rounded-md border border-ledger-line bg-ledger-ink px-4 py-3 text-xs font-medium text-ledger-surface">
      <Loader2 className="h-4 w-4 animate-spin text-ledger-brass" />
      Ouverture du scanner...
    </div>
  </div>
);

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green';

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
      className={`group flex flex-col overflow-hidden rounded-md border border-ledger-line bg-ledger-surface text-left transition-colors hover:border-ledger-green disabled:cursor-wait ${FOCUS}`}
    >
      <div className="relative h-28 bg-ledger-green">
        {store.banner_url && (
          <img
            src={store.banner_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-75"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ledger-ink/55 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm border border-ledger-surface/30 bg-ledger-ink/80 px-2 py-1 font-ledger-mono text-[10px] text-ledger-surface">
          <span className="h-1.5 w-1.5 bg-ledger-green" />
          {onlineLabel}
        </span>
        {productCount > 0 && (
          <span className="absolute right-3 top-3 rounded-sm border border-ledger-surface/30 bg-ledger-ink/80 px-2 py-1 font-ledger-mono text-[10px] text-ledger-surface">
            {productCount} article{productCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div className="relative -mt-8 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ledger-line bg-ledger-paper font-registry text-lg text-ledger-green">
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
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="truncate font-registry text-base text-ledger-ink">{store.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ledger-muted">
              <MapPin className="h-3 w-3 shrink-0 text-ledger-green" />
              <span className="truncate">{location || 'Cameroun'}</span>
            </p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-ledger-muted">
          {store.tagline || store.description || fallbackDescription}
        </p>
        <div className="mt-auto flex items-center justify-between border-t border-ledger-line pt-3 text-xs font-semibold text-ledger-green">
          <span>{viewLabel}</span>
          {isOpening ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-ledger-green" />
          ) : (
            <span className="font-ledger-mono text-[10px] text-ledger-muted">/</span>
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
  const [storeFilter, setStoreFilter] = useState('');

  const openStore = async (slug: string) => {
    setPendingSlug(slug);
    setLinkError(null);
    try {
      const opened = await onOpenStoreBySlug(slug);
      if (!opened) {
        setLinkError(t.landing.storeNotFound);
        toast.error(t.landing.storeNotFound);
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
      toast.error(t.landing.qrInvalid);
      return;
    }
    void openStore(slug);
  };

  const filteredStores = useMemo(() => {
    const query = storeFilter.trim().toLowerCase();
    if (!query) return stores;
    return stores.filter((store) =>
      [store.name, store.city, store.quarter, store.tagline].some((field) =>
        String(field ?? '').toLowerCase().includes(query),
      ),
    );
  }, [stores, storeFilter]);

  const stepTitles = [t.landing.step1Title, t.landing.step2Title, t.landing.step3Title];
  const stepDescriptions = [t.landing.step1Desc, t.landing.step2Desc, t.landing.step3Desc];

  const faqCopy = t.landing.faq.map((item) => ({
    question: item.question,
    answer: item.answer
      .replace('{freeQuota}', String(PLANS.decouverte.maxProducts))
      .replace('{proPrice}', formatFCFA(PLANS.pro.price, language))
      .replace('{premiumPrice}', formatFCFA(PLANS.premium.price, language)),
  }));

  const isPending = pendingSlug !== null;
  const featuredStore = stores[0];
  const ticketName = featuredStore?.name ?? t.landing.fallbackStoreName;
  const ticketCity = featuredStore?.city ?? 'Cameroun';
  const ticketProducts = featuredStore?.current_products_count ?? PLANS.decouverte.maxProducts;
  const storeCountLabel = t.landing.storesOnline.replace('{count}', String(stores.length));

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-ledger-surface font-ledger text-ledger-ink">
      <section className="border-b border-ledger-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center lg:gap-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="border-l-2 border-ledger-green pl-3 text-sm text-ledger-green">
              {t.landing.tagline}
            </p>
            <h1 className="mt-6 font-registry text-[2.6rem] leading-[1.06] tracking-[-0.03em] text-ledger-ink sm:text-5xl lg:text-[3.65rem]">
              <span className="block">{t.landing.heroTitle}</span>
              <span className="block">{t.landing.heroHighlight}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ledger-muted">
              {t.landing.heroDescription}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onCreateStore}
                className={`min-h-11 rounded-md bg-ledger-green px-5 py-3 text-sm font-semibold text-ledger-surface transition-colors hover:bg-ledger-ink ${FOCUS}`}
              >
                {t.landing.ctaCreateStore}
              </button>
              <a
                href="#boutiques"
                className={`min-h-11 rounded-md border border-ledger-line px-5 py-3 text-sm font-semibold text-ledger-ink transition-colors hover:border-ledger-green hover:bg-ledger-paper ${FOCUS}`}
              >
                {t.landing.ctaDiscover}
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="border border-ledger-line bg-ledger-paper p-5 shadow-[6px_6px_0_#D6DCD2] sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-ledger-line pb-4">
                <div>
                  <p className="font-ledger-mono text-[11px] tracking-[0.08em] text-ledger-green">
                    {t.landing.ticketEyebrow}
                  </p>
                  <p className="mt-2 font-registry text-2xl leading-tight text-ledger-ink">
                    {ticketName}
                  </p>
                </div>
                <QrCode className="h-10 w-10 shrink-0 text-ledger-ink" strokeWidth={1.5} />
              </div>
              <div className="mt-4 space-y-2 text-sm text-ledger-muted">
                <div className="flex items-baseline justify-between gap-4">
                  <span>{t.landing.catalogLabel}</span>
                  <span className="font-ledger-mono text-ledger-ink">
                    {ticketProducts} {t.landing.itemsLabel}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>{t.landing.locationLabel}</span>
                  <span className="font-ledger-mono text-ledger-ink">{ticketCity}</span>
                </div>
              </div>
              <div className="mt-5 border-t border-dashed border-ledger-line pt-4">
                <p className="font-registry text-lg text-ledger-green">
                  {t.storefront.orderWhatsApp}
                </p>
                <p className="mt-1 text-xs text-ledger-muted">{t.landing.readyMessage}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ledger-line bg-ledger-paper">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:gap-8">
            <div>
              <p className="font-registry text-lg text-ledger-ink">
                {t.landing.clientAccessHeading}
              </p>
              <p className="mt-0.5 text-xs text-ledger-muted">{t.landing.scanQrSub}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className={`min-h-11 inline-flex items-center justify-center gap-2 rounded-md border border-ledger-ink bg-ledger-ink px-4 py-2.5 text-sm font-semibold text-ledger-surface transition-colors hover:bg-ledger-green ${FOCUS}`}
              >
                <ScanLine className="h-4 w-4" />
                {t.landing.scanQrBtn}
              </button>
              <form onSubmit={handleLinkSubmit} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(event) => {
                    setLinkInput(event.target.value);
                    setLinkError(null);
                  }}
                  placeholder={t.landing.pasteLinkPlaceholder}
                  aria-label={t.landing.pasteLinkPlaceholder}
                  className={`min-h-11 min-w-0 flex-1 rounded-md border border-ledger-line bg-ledger-surface px-3 text-sm text-ledger-ink placeholder:text-ledger-muted ${FOCUS}`}
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className={`min-h-11 rounded-md border border-ledger-line bg-ledger-surface px-4 py-2.5 text-sm font-semibold text-ledger-ink transition-colors hover:border-ledger-green disabled:opacity-60 ${FOCUS}`}
                >
                  {isPending ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    t.landing.openStoreBtn
                  )}
                </button>
              </form>
            </div>
          </div>
          {linkError && (
            <p role="alert" className="mt-3 text-sm text-ledger-red">
              {linkError}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm text-ledger-green">{t.landing.stepsSubtitle}</p>
          <h2 className="mt-3 font-registry text-3xl leading-tight tracking-[-0.02em] text-ledger-ink sm:text-4xl">
            {t.landing.stepsTitle}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ledger-muted">
            {t.landing.stepsDescription}
          </p>
        </div>
        <ol className="mt-10 grid gap-8 border-t border-ledger-line pt-6 sm:grid-cols-3">
          {stepTitles.map((title, index) => (
            <li key={title} className="flex gap-4">
              <span className="font-registry text-3xl leading-none text-ledger-brass">
                0{index + 1}
              </span>
              <div>
                <h3 className="font-registry text-base text-ledger-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ledger-muted">
                  {stepDescriptions[index]}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="boutiques" className="border-y border-ledger-line bg-ledger-paper/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-ledger-green">{t.landing.discoverTitle}</p>
              <h2 className="mt-3 font-registry text-3xl leading-tight tracking-[-0.02em] text-ledger-ink sm:text-4xl">
                {t.landing.onlineStoresHeading}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ledger-muted" />
                <input
                  type="search"
                  value={storeFilter}
                  onChange={(event) => setStoreFilter(event.target.value)}
                  placeholder={t.landing.searchStores}
                  aria-label={t.landing.searchStores}
                  className={`min-h-11 w-full rounded-md border border-ledger-line bg-ledger-surface pl-9 pr-3 text-sm text-ledger-ink placeholder:text-ledger-muted sm:w-56 ${FOCUS}`}
                />
              </label>
              <span className="inline-flex items-center gap-2 rounded-sm border border-ledger-line bg-ledger-surface px-3 py-2 text-xs text-ledger-muted">
                <span className="h-1.5 w-1.5 bg-ledger-green" />
                {storeCountLabel}
              </span>
            </div>
          </div>

          {isLoadingStores ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="overflow-hidden rounded-md border border-ledger-line bg-ledger-surface">
                  <div className="h-28 bg-ledger-paper" />
                  <div className="space-y-3 p-4">
                    <div className="h-11 w-11 rounded-md bg-ledger-paper" />
                    <div className="h-3 w-2/3 rounded bg-ledger-paper" />
                    <div className="h-3 w-1/2 rounded bg-ledger-paper" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStores.length > 0 ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isOpening={pendingSlug === store.slug}
                  isDisabled={isPending}
                  onOpen={() => void openStore(store.slug)}
                  viewLabel={t.landing.viewStore}
                  onlineLabel={t.landing.onlineLabel}
                  fallbackDescription={t.landing.fallbackDescription}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-ledger-line bg-ledger-surface p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-ledger-paper text-ledger-muted">
                <StoreIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-registry text-base text-ledger-ink">
                {t.landing.emptyStoresTitle}
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ledger-muted">
                {t.landing.emptyStoresText}
              </p>
              <button
                type="button"
                onClick={onMerchantLogin}
                className={`mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ledger-ink px-4 py-2.5 text-xs font-semibold text-ledger-surface transition-colors hover:bg-ledger-green ${FOCUS}`}
              >
                <UserRound className="h-3.5 w-3.5" />
                {t.landing.merchantSpace}
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="tarifs" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm text-ledger-green">{t.landing.pricingEyebrow}</p>
          <h2 className="mt-3 font-registry text-3xl leading-tight tracking-[-0.02em] text-ledger-ink sm:text-4xl">
            {t.landing.pricingTitle}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ledger-muted">
            {t.landing.pricingDescription}
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {PLAN_IDS.map((planId) => {
            const plan = PLANS[planId];
            return (
              <div
                key={planId}
                className={`border p-5 ${planId === 'decouverte' ? 'border-ledger-green bg-ledger-green/5' : 'border-ledger-line bg-ledger-surface'}`}
              >
                <p className="font-registry text-lg text-ledger-ink">{plan.label}</p>
                <p className="mt-3 font-registry text-3xl text-ledger-green">
                  {plan.price === 0 ? t.landing.freeLabel : formatFCFA(plan.price, language)}
                </p>
                <p className="mt-1 text-xs text-ledger-muted">
                  {plan.price === 0 ? t.landing.noTimeLimit : t.landing.perYear}
                </p>
                <p className="mt-4 border-t border-ledger-line pt-4 text-sm text-ledger-muted">
                  {plan.maxProducts === PLANS.premium.maxProducts
                    ? t.landing.upToItems.replace('{count}', String(plan.maxProducts))
                    : `${plan.maxProducts} ${t.landing.itemsLabel}`}
                </p>
                <button
                  type="button"
                  onClick={onCreateStore}
                  className={`mt-5 min-h-11 w-full rounded-md border border-ledger-line bg-ledger-surface px-4 py-2.5 text-sm font-semibold text-ledger-ink transition-colors hover:border-ledger-green ${FOCUS}`}
                >
                  {t.landing.createStoreCta}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ledger-muted">
          {t.landing.pricingNote
            .replace('{codes}', PROMO_CODES.join(', '))
            .replace('{pro}', formatFCFA(PLANS.pro.promoPrice, language))
            .replace('{premium}', formatFCFA(PLANS.premium.promoPrice, language))}
        </p>
      </section>

      <section id="faq" className="border-t border-ledger-line bg-ledger-surface">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="text-sm text-ledger-green">{t.landing.faqEyebrow}</p>
          <h2 className="mt-3 font-registry text-3xl leading-tight tracking-[-0.02em] text-ledger-ink sm:text-4xl">
            {t.landing.faqTitle}
          </h2>
          <div className="mt-8 border-t border-ledger-line">
            {faqCopy.map((item) => (
              <details key={item.question} className="group border-b border-ledger-line py-4">
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-4 font-registry text-base text-ledger-ink ${FOCUS}`}
                >
                  {item.question}
                  <span className="font-ledger-mono text-ledger-green group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ledger-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ledger-line bg-ledger-ink text-ledger-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-registry text-2xl">{t.landing.finalCtaTitle}</p>
          <button
            type="button"
            onClick={onCreateStore}
            className={`min-h-11 rounded-md bg-ledger-surface px-5 py-3 text-sm font-semibold text-ledger-ink transition-colors hover:bg-ledger-paper ${FOCUS}`}
          >
            {t.landing.ctaCreateStore}
          </button>
        </div>
      </section>

      <footer className="mt-auto border-t border-ledger-line bg-ledger-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ledger-ink font-registry text-sm text-ledger-surface">
              VE
            </div>
            <div>
              <p className="font-registry text-sm text-ledger-ink">VitrineExpress</p>
              <p className="text-[11px] text-ledger-muted">{t.landing.footerSubtitle}</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ledger-muted">
            <a href="#boutiques" className={`transition-colors hover:text-ledger-green ${FOCUS}`}>
              {t.landing.storesNav}
            </a>
            <a href="#tarifs" className={`transition-colors hover:text-ledger-green ${FOCUS}`}>
              {t.landing.plansNav}
            </a>
            <button
              type="button"
              onClick={onMerchantLogin}
              className={`inline-flex items-center gap-1.5 transition-colors hover:text-ledger-green ${FOCUS}`}
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              {t.landing.merchantSpace}
            </button>
            <LanguageSwitcher variant="footer" />
          </nav>
        </div>
        <div className="border-t border-ledger-line px-4 py-4 text-center text-[10px] text-ledger-muted">
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
