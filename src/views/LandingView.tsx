import React, { Suspense, lazy, useState } from 'react';
import { Store } from '../types';
import { extractStoreSlug } from '../utils/storeLink';
import { toast } from 'sonner';
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
  QrCode,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
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
  onAdmin: () => void;
}

const steps = [
  {
    number: '01',
    title: 'Scannez ou ouvrez le lien',
    description: 'Le QR code de la boutique vous emmène directement sur son catalogue.',
    icon: ScanLine,
  },
  {
    number: '02',
    title: 'Parcourez les articles',
    description: 'Photos, prix, disponibilité et arrivages : tout est clair en un coup d’œil.',
    icon: ShoppingBag,
  },
  {
    number: '03',
    title: 'Commandez sur WhatsApp',
    description: 'Un article vous plaît ? La conversation s’ouvre avec le message déjà prêt.',
    icon: MessageCircle,
  },
];

const StoreCard: React.FC<{
  store: Store;
  isOpening: boolean;
  isDisabled: boolean;
  onOpen: () => void;
}> = ({ store, isOpening, isDisabled, onOpen }) => {
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
          En ligne
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
          <span className="text-[11px] font-semibold text-brand-700">Voir la boutique</span>
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
  onAdmin,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const openStore = async (slug: string) => {
    setPendingSlug(slug);
    setLinkError(null);

    try {
      const opened = await onOpenStoreBySlug(slug);
      if (!opened) {
        const message = 'Boutique introuvable ou indisponible pour le moment.';
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
      setLinkError("Ce lien ne correspond pas à une boutique VitrineExpress. Vérifiez le lien ou son QR code.");
      return;
    }

    void openStore(slug);
  };

  const handleDetected = (value: string) => {
    const slug = extractStoreSlug(value);
    if (!slug) {
      toast.error("Ce QR code ne contient pas de lien vers une boutique VitrineExpress.");
      return;
    }
    void openStore(slug);
  };

  const storeCountLabel = `${stores.length} boutique${stores.length > 1 ? 's' : ''} en ligne`;
  const isPending = pendingSlug !== null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-warm-50">
      <section className="relative overflow-hidden border-b border-ink-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(5,150,105,0.10),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(245,158,11,0.10),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#0E1318_0.7px,transparent_0.7px)] [background-size:18px_18px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pb-16 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-brand-800 shadow-xs backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              Le commerce de proximité, en ligne
            </div>

            <h1 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-[1.04] tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
              Votre boutique,
              <br />
              <span className="text-brand-700">prête à être partagée.</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">
              Un catalogue élégant, un lien simple et un QR code à scanner. Vos clients découvrent
              vos produits et vous écrivent directement sur WhatsApp, sans installer d’application.
            </p>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                Sans application
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                Commande WhatsApp
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                Mise à jour instantanée
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="https://wa.me/237681610040?text=Bonjour%20Karis%2C%20je%20souhaite%20cr%C3%A9er%20ma%20vitrine%20en%20ligne%20sur%20VitrineExpress."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                Créer ma boutique sur WhatsApp
              </a>
              <a
                href="#boutiques"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-semibold text-ink-800 shadow-xs transition-colors hover:bg-warm-100"
              >
                <StoreIcon className="h-3.5 w-3.5" />
                Découvrir les boutiques
              </a>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-950 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                J’ai un QR code
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-brand-200/50 via-transparent to-amber-200/40 blur-xl" />
            <div className="relative rounded-[2rem] border border-ink-100 bg-white p-5 shadow-elevated sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                    Accès client
                  </p>
                  <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-ink-950">
                    Entrer dans une boutique
                  </h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>

              <button
                onClick={() => setIsScannerOpen(true)}
                className="group mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-ink-950 p-3.5 text-left text-white shadow-card transition-colors hover:bg-black cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-400/20 bg-brand-500/15 text-brand-300">
                    <ScanLine className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Scanner un QR code</span>
                    <span className="mt-0.5 block text-[11px] text-white/50">
                      Avec la caméra ou une photo
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
              </button>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-ink-100" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  ou
                </span>
                <span className="h-px flex-1 bg-ink-100" />
              </div>

              <form onSubmit={handleLinkSubmit}>
                <label
                  htmlFor="store-link"
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500"
                >
                  Coller le lien de la boutique
                </label>
                <div className="mt-2 flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                    <input
                      id="store-link"
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      value={linkInput}
                      onChange={(event) => {
                        setLinkInput(event.target.value);
                        if (linkError) setLinkError(null);
                      }}
                      placeholder="https://.../boutique/..."
                      className="w-full rounded-xl border border-ink-200 bg-warm-50/60 py-2.5 pl-9 pr-3 text-xs text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending || !linkInput.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Ouvrir</span>
                  </button>
                </div>
                {linkError && (
                  <p role="alert" className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-red-600">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{linkError}</span>
                  </p>
                )}
              </form>

              <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/70 p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-900">Vous êtes boutiquier ?</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
                      Gérez votre catalogue, vos prix et vos arrivages.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onMerchantLogin}
                  className="mt-3 inline-flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[11px] font-semibold text-ink-900 shadow-xs transition-colors hover:bg-warm-50 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <LockKeyhole className="h-3.5 w-3.5 text-brand-700" />
                    Se connecter à mon espace
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-ink-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            Simple pour vos clients
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            Un lien, un catalogue, une conversation WhatsApp.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Pas de compte à créer, pas d’application à installer. Vos clients arrivent directement
            sur votre vitrine et commandent là où ils sont déjà.
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
                À découvrir
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
                Boutiques en ligne
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
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-ink-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-ink-400">
                <StoreIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-ink-900">
                Les premières vitrines arrivent bientôt
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-500">
                Vous êtes commerçant ? Connectez-vous à votre espace pour mettre votre catalogue
                en ligne.
              </p>
              <button
                onClick={onMerchantLogin}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-black cursor-pointer"
              >
                <UserRound className="h-3.5 w-3.5" />
                Espace gérant
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-6 text-white shadow-elevated sm:p-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">
                Vous voulez votre propre vitrine ?
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Lancez votre boutique en ligne à 5 000 FCFA / an
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/70">
                Idéal pour exposer vos articles, partager votre catalogue sur WhatsApp et poser votre affiche QR code en boutique. Je configure votre espace personnel en quelques minutes.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="https://wa.me/237681610040?text=Bonjour%20Karis%2C%20je%20veux%20cr%C3%A9er%20ma%20vitrine%20en%20ligne%20sur%20VitrineExpress."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold text-ink-950 transition-colors hover:bg-emerald-400"
                >
                  <MessageCircle className="h-4 w-4" />
                  Créer ma boutique sur WhatsApp
                </a>
                <a
                  href="tel:+237681610040"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <Phone className="h-3.5 w-3.5" />
                  +237 681 610 040
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xs">
              <p className="text-xs font-semibold text-white">Commerçant déjà inscrit ?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                Connectez-vous pour ajouter un article, changer un prix ou annoncer un nouvel arrivage.
              </p>
              <button
                onClick={onMerchantLogin}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-ink-950 transition-colors hover:bg-brand-50 cursor-pointer"
              >
                Ouvrir mon espace gérant
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
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
                Vitrines WhatsApp pour les commerçants du Cameroun.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-600">
            <a
              href="https://wa.me/237681610040"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>WhatsApp : +237 681 610 040</span>
            </a>
            <a
              href="mailto:karisdev369@gmail.com"
              className="inline-flex items-center gap-1.5 hover:text-ink-950 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-ink-400" />
              <span>karisdev369@gmail.com</span>
            </a>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-500">
            <a href="#boutiques" className="transition-colors hover:text-ink-950">
              Boutiques
            </a>
            <button
              onClick={onMerchantLogin}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-950 cursor-pointer"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              Espace gérant
            </button>
            <button
              onClick={onAdmin}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-950 cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Administration
            </button>
          </nav>
        </div>
        <div className="border-t border-ink-100 px-4 py-4 text-center text-[10px] text-ink-400">
          © {new Date().getFullYear()} VitrineExpress • Développé par Karis (+237 681 610 040 • karisdev369@gmail.com)
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
