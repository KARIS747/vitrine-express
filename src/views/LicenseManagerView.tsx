import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Store } from '../types';
import { dbService, CreatedStoreAccess } from '../services/db';
import { formatDate, getDaysRemaining, formatFCFA } from '../utils/formatters';
import { downloadStoreAccessPdf } from '../utils/accessSheet';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Eye,
  EyeOff,
  FileDown,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Store as StoreIcon,
  X,
} from 'lucide-react';

interface LicenseManagerViewProps {
  onSelectStore: (store: Store) => void;
  onBackToHome: () => void;
}

const EMPTY_FORM = {
  name: '',
  whatsapp: '',
  city: 'Douala',
  quarter: '',
  pin: '',
  maxProducts: 20,
  durationMonths: 12,
};

async function copyText(text: string, successMessage: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    toast.success(successMessage);
  } catch {
    toast.error('Impossible de copier dans le presse-papiers');
  }
}

function buildOnboardingMessage(store: Store, licenseKey?: string, pinCode?: string) {
  const lines = [
    `👋 Bonjour ! Votre vitrine ${store.name} est prête sur VitrineExpress.`,
    '',
    `🏪 Votre vitrine client : ${window.location.origin}/boutique/${store.slug}`,
    `⚙️ Votre espace de gestion : ${window.location.origin}/merchant`,
    '',
    '🔐 Vos identifiants de connexion :',
    `• Clé de licence : ${licenseKey ?? store.license_key ?? '—'}`,
  ];
  if (pinCode) lines.push(`• Code PIN secret : ${pinCode}`);
  lines.push(
    '',
    `📦 Formule : jusqu'à ${store.max_products} produits`,
    `📅 Valable jusqu'au : ${formatDate(store.expires_at)}`,
    '',
    '💡 Pour démarrer :',
    '1. Connectez-vous sur votre espace de gestion.',
    '2. Ajoutez vos photos de produits, vos prix et vos arrivages.',
    '3. Imprimez votre affiche QR code pour votre comptoir !',
    '',
    'En cas de besoin, contactez Karis.',
  );
  return lines.join('\n');
}

export const LicenseManagerView: React.FC<LicenseManagerViewProps> = ({
  onSelectStore,
  onBackToHome,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(dbService.getAdminKey()));
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createdAccess, setCreatedAccess] = useState<CreatedStoreAccess | null>(null);
  const [pdfTarget, setPdfTarget] = useState<Store | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const loadStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await dbService.getAdminStores();
    if (result.success) {
      setStores(result.stores);
    } else {
      setError(result.error ?? 'Erreur de chargement');
      if (!dbService.getAdminKey()) {
        setIsAuthenticated(false);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) void loadStores();
  }, [isAuthenticated, loadStores]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminKeyInput.trim()) return;

    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await dbService.loginAdmin(adminKeyInput.trim(), rememberDevice);
      if (!result.success) {
        setError(result.error ?? 'Clé administrateur invalide');
        toast.error(result.error ?? 'Clé administrateur invalide');
        return;
      }
      setStores(result.stores ?? []);
      setIsAuthenticated(true);
      setAdminKeyInput('');
      toast.success('Administration déverrouillée');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    dbService.clearAdminKey();
    setIsAuthenticated(false);
    setStores([]);
    setError(null);
  };

  const handleCreateStore = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.whatsapp.trim()) {
      toast.error('Renseignez le nom et le numéro WhatsApp de la boutique');
      return;
    }
    if (form.pin.trim() && form.pin.trim().length < 4) {
      toast.error('Le code PIN doit contenir au moins 4 caractères');
      return;
    }

    setIsCreating(true);
    try {
      const access = await dbService.createStoreByAdmin({
        name: form.name.trim(),
        whatsappNumber: form.whatsapp.trim(),
        city: form.city,
        quarter: form.quarter.trim(),
        pinCode: form.pin,
        maxProducts: form.maxProducts,
        durationMonths: form.durationMonths,
      });

      setStores((current) => [access.store, ...current]);
      setCreatedAccess(access);
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success(`Boutique ${access.store.name} créée`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de création';
      toast.error(message);
      if (!dbService.getAdminKey()) setIsAuthenticated(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (store: Store) => {
    const isActive = Boolean(store.is_active);
    if (isActive && !window.confirm(`Suspendre temporairement la vitrine ${store.name} ?`)) {
      return;
    }

    setActionId(store.id);
    try {
      const result = await dbService.toggleStoreStatus(store.id);
      if (result.success && result.store) {
        setStores((current) => current.map((item) => item.id === store.id ? { ...item, ...result.store } : item));
        toast.success(isActive ? `${store.name} suspendue` : `${store.name} réactivée`);
      } else {
        toast.error(result.error ?? 'Erreur de mise à jour');
        if (!dbService.getAdminKey()) setIsAuthenticated(false);
      }
    } finally {
      setActionId(null);
    }
  };

  const handleRenew = async (store: Store) => {
    if (!window.confirm(`Prolonger la licence de ${store.name} de 12 mois (5 000 FCFA) ?`)) {
      return;
    }

    setActionId(store.id);
    try {
      const result = await dbService.renewStoreLicense(store.id, 12);
      if (result.success && result.store) {
        setStores((current) => current.map((item) => item.id === store.id ? { ...item, ...result.store } : item));
        toast.success(`Licence de ${store.name} prolongée de 12 mois`);
      } else {
        toast.error(result.error ?? 'Erreur de renouvellement');
        if (!dbService.getAdminKey()) setIsAuthenticated(false);
      }
    } finally {
      setActionId(null);
    }
  };

  const handleResetPin = async (store: Store) => {
    if (!window.confirm(`Générer un nouveau PIN pour ${store.name} ? L'ancien PIN ne fonctionnera plus.`)) {
      return;
    }

    setActionId(store.id);
    try {
      const result = await dbService.resetStorePin(store.id);
      if (result.success && result.store && result.pinCode) {
        setStores((current) => current.map((item) => item.id === store.id ? { ...item, ...result.store } : item));
        setCreatedAccess({
          store: result.store,
          licenseKey: result.store.license_key ?? '',
          pinCode: result.pinCode,
          expiresAt: result.store.expires_at,
        });
        toast.success(`Nouveau PIN généré pour ${store.name}`);
      } else {
        toast.error(result.error ?? 'Erreur de réinitialisation du PIN');
        if (!dbService.getAdminKey()) setIsAuthenticated(false);
      }
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadAccessPdf = async (
    store: Store,
    licenseKey: string,
    pinCode?: string | null,
    expiresAt?: string | null,
  ) => {
    if (!licenseKey) {
      toast.error('Clé de licence indisponible pour cette boutique');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await downloadStoreAccessPdf({ store, licenseKey, pinCode, expiresAt });
      toast.success('Fiche PDF téléchargée');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de générer la fiche PDF';
      toast.error(message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePdfWithoutPin = async () => {
    if (!pdfTarget) return;
    const target = pdfTarget;
    setPdfTarget(null);
    await handleDownloadAccessPdf(target, target.license_key ?? '', null);
  };

  const handlePdfWithNewPin = async () => {
    if (!pdfTarget) return;
    const target = pdfTarget;

    setIsGeneratingPdf(true);
    try {
      const result = await dbService.resetStorePin(target.id);
      if (!result.success || !result.store || !result.pinCode) {
        throw new Error(result.error ?? 'Erreur de réinitialisation du PIN');
      }

      setStores((current) => current.map((item) => (
        item.id === target.id ? { ...item, ...result.store } : item
      )));
      setPdfTarget(null);

      const licenseKey = result.store.license_key ?? target.license_key ?? '';
      if (!licenseKey) {
        throw new Error('Clé de licence indisponible pour cette boutique');
      }

      const access: CreatedStoreAccess = {
        store: result.store,
        licenseKey,
        pinCode: result.pinCode,
        expiresAt: result.store.expires_at,
      };
      setCreatedAccess(access);

      await downloadStoreAccessPdf({
        store: result.store,
        licenseKey,
        pinCode: result.pinCode,
        expiresAt: result.store.expires_at,
      });
      toast.success('Nouveau PIN généré et fiche PDF téléchargée');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de générer la fiche PDF';
      toast.error(message);
      if (!dbService.getAdminKey()) setIsAuthenticated(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return stores;
    return stores.filter((store) =>
      store.name.toLowerCase().includes(query) ||
      store.city.toLowerCase().includes(query) ||
      store.slug.toLowerCase().includes(query),
    );
  }, [searchQuery, stores]);

  const activeStoresCount = stores.filter((store) => Boolean(store.is_active)).length;
  const expiredStoresCount = stores.filter(
    (store) => new Date(store.expires_at).getTime() <= Date.now(),
  ).length;
  const estimatedRevenue = stores.reduce(
    (total, store) => total + (Number(store.price_paid) || 5000),
    0,
  );

  if (!isAuthenticated) {
    return (
      <div className="flex-1 min-h-[calc(100vh-3.5rem)] bg-warm-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-950 transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </button>

          <div className="bg-white rounded-3xl border border-ink-100 shadow-elevated p-7 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h1 className="font-display font-bold text-2xl text-ink-950 tracking-tight">
              Administration
            </h1>
            <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">
              Cet espace est réservé à Karis. Saisissez la clé administrateur configurée
              sur le serveur pour gérer les boutiques et les licences.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showAdminKey ? 'text' : 'password'}
                  value={adminKeyInput}
                  onChange={(event) => setAdminKeyInput(event.target.value)}
                  placeholder="Clé administrateur"
                  autoComplete="current-password"
                  autoFocus
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-ink-200 text-sm text-ink-950 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-700 cursor-pointer"
                  aria-label={showAdminKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="remember-admin"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-ink-300 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="remember-admin"
                  className="text-xs text-ink-600 select-none cursor-pointer"
                >
                  Mémoriser sur cet appareil (rester connecté)
                </label>
              </div>

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn || !adminKeyInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Déverrouiller'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-warm-50 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-950 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-ink-600 hover:text-ink-950 hover:bg-warm-100 border border-ink-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Verrouiller
          </button>
        </div>

        <div className="bg-ink-950 text-white rounded-3xl p-6 sm:p-8 border border-ink-800 shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[11px] font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Karis · Licence Manager
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
              Boutiques et licences
            </h1>
            <p className="text-xs sm:text-sm text-white/45 mt-1.5 max-w-lg leading-relaxed">
              Créez les vitrines de vos clients, transmettez leurs accès et gardez le
              contrôle sur les échéances et les quotas.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-ink-950 font-bold text-sm transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Créer une boutique
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-ink-100 shadow-subtle flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">
                Boutiques
              </span>
              <span className="font-display font-bold text-xl text-ink-950">{stores.length}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-ink-100 shadow-subtle flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">
                Actives
              </span>
              <span className="font-display font-bold text-xl text-ink-950">{activeStoresCount}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-ink-100 shadow-subtle flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">
                Échéances dépassées
              </span>
              <span className="font-display font-bold text-xl text-ink-950">{expiredStoresCount}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-ink-100 shadow-subtle flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">
                Licences encaissées
              </span>
              <span className="font-display font-bold text-lg text-ink-950">
                {formatFCFA(estimatedRevenue)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-2.5 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => void loadStores()}
              className="text-[11px] font-semibold text-red-800 hover:text-red-950 underline underline-offset-2 cursor-pointer shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-ink-100 shadow-subtle overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-ink-100 bg-warm-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg text-ink-950">
                Boutiques souscrites
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                {filteredStores.length} boutique{filteredStores.length > 1 ? 's' : ''} affichée{filteredStores.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher..."
                  className="w-full sm:w-52 pl-8 pr-3 py-2 rounded-lg border border-ink-200 text-xs outline-none focus:border-ink-400 bg-white"
                />
              </div>
              <button
                onClick={() => void loadStores()}
                disabled={isLoading}
                className="p-2 rounded-lg border border-ink-200 text-ink-500 hover:text-ink-950 hover:bg-warm-100 transition-colors disabled:opacity-50 cursor-pointer"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {isLoading && stores.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-[3px] border-ink-200 border-t-amber-500 rounded-full animate-spin mb-3" />
              <span className="text-xs text-ink-500">Chargement des boutiques...</span>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-warm-100 text-ink-400 flex items-center justify-center mb-3">
                <StoreIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-ink-900">
                {stores.length === 0 ? 'Aucune boutique pour le moment' : 'Aucun résultat'}
              </p>
              <p className="text-xs text-ink-500 mt-1 max-w-xs">
                {stores.length === 0
                  ? 'Créez la première vitrine pour démarrer votre activité.'
                  : 'Essayez avec un autre nom, une ville ou un identifiant.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100/80">
              {filteredStores.map((store) => {
                const isActive = Boolean(store.is_active);
                const daysLeft = getDaysRemaining(store.expires_at);
                const isExpired = new Date(store.expires_at).getTime() <= Date.now();
                const isBusy = actionId === store.id;

                return (
                  <div
                    key={store.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-warm-50/40 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center font-display font-bold text-lg shrink-0 overflow-hidden">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          store.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-semibold text-sm sm:text-base text-ink-950 truncate">
                            {store.name}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive && !isExpired
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {isExpired ? 'Expirée' : isActive ? 'Active' : 'Suspendue'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-ink-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {store.city}{store.quarter ? ` · ${store.quarter}` : ''}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {store.current_products_count ?? 0}/{store.max_products}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(store.expires_at)}
                            <span className={daysLeft < 30 ? 'text-amber-700 font-semibold' : ''}>
                              ({daysLeft} j)
                            </span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <button
                            onClick={() => void copyText(store.license_key ?? '', 'Clé de licence copiée')}
                            className="font-mono text-[10px] bg-warm-100 hover:bg-warm-200 text-ink-700 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Copier la clé de licence"
                          >
                            {store.license_key ?? 'Clé non disponible'}
                          </button>
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-warm-100 text-ink-700 px-1.5 py-0.5 rounded">
                            <KeyRound className="w-2.5 h-2.5" />
                            PIN sécurisé
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
                      <button
                        onClick={() => onSelectStore(store)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-warm-100 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Vitrine
                      </button>

                      <button
                        onClick={() => void copyText(
                          buildOnboardingMessage(store),
                          'Message d’accueil copié',
                        )}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-warm-100 text-xs font-semibold transition-colors cursor-pointer"
                        title="Copier le lien et la clé (le PIN n'est plus réaffiché)"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Accès
                      </button>

                      <button
                        onClick={() => setPdfTarget(store)}
                        disabled={isBusy || !store.license_key}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-warm-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        title="Générer la fiche d'accès PDF"
                      >
                        <FileDown className="w-3.5 h-3.5 text-brand-600" />
                        PDF
                      </button>

                      <button
                        onClick={() => void handleRenew(store)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                        +1 an
                      </button>

                      <button
                        onClick={() => void handleResetPin(store)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-200 text-ink-700 hover:bg-warm-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        title="Générer un nouveau PIN"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        PIN
                      </button>

                      <button
                        onClick={() => void handleToggleStatus(store)}
                        disabled={isBusy}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 cursor-pointer ${
                          isActive
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                        }`}
                      >
                        {isActive ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            onClick={() => setIsCreateOpen(false)}
            className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-ink-100 shadow-elevated overflow-hidden my-auto">
            <div className="flex items-start justify-between p-5 border-b border-ink-100 bg-warm-50">
              <div>
                <h3 className="font-display font-bold text-lg text-ink-950">
                  Créer une boutique
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Une licence annuelle et une catégorie par défaut seront générées.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-full text-ink-500 hover:text-ink-950 hover:bg-warm-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-5 sm:p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
                  Nom de la boutique *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ex: Kamer Kicks Akwa"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
                  Numéro WhatsApp *
                </label>
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                  placeholder="237699000000"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
                    Ville
                  </label>
                  <select
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink-200 text-sm outline-none bg-white focus:border-amber-500"
                  >
                    <option value="Douala">Douala</option>
                    <option value="Yaoundé">Yaoundé</option>
                    <option value="Bafoussam">Bafoussam</option>
                    <option value="Garoua">Garoua</option>
                    <option value="Kribi">Kribi</option>
                    <option value="Buea">Buea</option>
                    <option value="Limbe">Limbe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
                    Quartier
                  </label>
                  <input
                    type="text"
                    value={form.quarter}
                    onChange={(event) => setForm({ ...form, quarter: event.target.value })}
                    placeholder="Ex: Akwa"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
                    PIN
                  </label>
                  <input
                    type="text"
                    value={form.pin}
                    onChange={(event) => setForm({ ...form, pin: event.target.value })}
                    placeholder="Auto"
                    minLength={4}
                    maxLength={12}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink-200 text-sm font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
                    Quota
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={form.maxProducts}
                    onChange={(event) => setForm({ ...form, maxProducts: Number(event.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1">
                    Mois
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={form.durationMonths}
                    onChange={(event) => setForm({ ...form, durationMonths: Number(event.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-ink-100 text-[11px] text-ink-500 leading-relaxed">
                Le lien de la vitrine sera <span className="font-mono text-ink-700">/boutique/identifiant</span>,
                généré automatiquement à partir du nom.
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-warm-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Créer la boutique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-ink-100 shadow-elevated overflow-hidden my-auto">
            <div className="p-6 text-center border-b border-ink-100 bg-warm-50">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-ink-950">
                {createdAccess.store.name} est en ligne
              </h3>
              <p className="text-xs text-ink-500 mt-1">
                Transmettez ces accès au commerçant.
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3 rounded-xl bg-warm-50 border border-ink-100">
                <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block mb-1">
                  Vitrine client
                </span>
                <span className="text-xs font-mono text-ink-800 break-all">
                  {window.location.origin}/boutique/{createdAccess.store.slug}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-warm-50 border border-ink-100">
                  <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block mb-1">
                    Clé de licence
                  </span>
                  <span className="text-xs font-mono text-ink-800 break-all">
                    {createdAccess.licenseKey}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-warm-50 border border-ink-100">
                  <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block mb-1">
                    Code PIN
                  </span>
                  <span className="text-xs font-mono text-ink-800">
                    {createdAccess.pinCode}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-ink-500 leading-relaxed">
                Expiration : {formatDate(createdAccess.expiresAt)} · Quota : {createdAccess.store.max_products} articles.
                Ces identifiants ne sont plus affichés en clair côté client.
              </p>

              <button
                onClick={() => void handleDownloadAccessPdf(
                  createdAccess.store,
                  createdAccess.licenseKey,
                  createdAccess.pinCode,
                  createdAccess.expiresAt,
                )}
                disabled={isGeneratingPdf}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                Télécharger la fiche PDF
              </button>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href={`https://wa.me/${createdAccess.store.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                    buildOnboardingMessage(
                      createdAccess.store,
                      createdAccess.licenseKey,
                      createdAccess.pinCode,
                    )
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Envoyer par WhatsApp
                </a>
                <button
                  onClick={() => void copyText(
                    buildOnboardingMessage(
                      createdAccess.store,
                      createdAccess.licenseKey,
                      createdAccess.pinCode,
                    ),
                    'Message d’accueil copié',
                  )}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copier les accès
                </button>
              </div>

              <button
                onClick={() => setCreatedAccess(null)}
                className="w-full py-2 text-[11px] font-medium text-ink-400 hover:text-ink-700 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            onClick={() => {
              if (!isGeneratingPdf) setPdfTarget(null);
            }}
            className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl border border-ink-100 shadow-elevated overflow-hidden my-auto">
            <div className="flex items-start justify-between p-5 border-b border-ink-100 bg-warm-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-ink-950">
                    Fiche d'accès PDF
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {pdfTarget.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPdfTarget(null)}
                disabled={isGeneratingPdf}
                className="p-1.5 rounded-full text-ink-500 hover:text-ink-950 hover:bg-warm-100 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <p className="text-xs text-ink-500 leading-relaxed">
                Cette fiche contient le lien de la vitrine, la clé de licence, les
                instructions de gestion et la mention de confidentialité.
              </p>

              <div className="p-3 rounded-xl bg-warm-50 border border-ink-100 space-y-2">
                <div>
                  <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">
                    Lien public
                  </span>
                  <span className="text-[11px] font-mono text-ink-800 break-all">
                    {window.location.origin}/boutique/{pdfTarget.slug}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">
                    Clé de licence
                  </span>
                  <span className="text-[11px] font-mono text-ink-800 break-all">
                    {pdfTarget.license_key ?? 'Non disponible'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                Le PIN actuel n'est jamais réaffiché. Pour l'inclure dans le PDF, un
                nouveau PIN sera généré et l'ancien ne fonctionnera plus.
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => void handlePdfWithNewPin()}
                  disabled={isGeneratingPdf || !pdfTarget.license_key}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  {isGeneratingPdf ? 'Génération...' : 'Nouveau PIN + fiche PDF'}
                </button>

                <button
                  onClick={() => void handlePdfWithoutPin()}
                  disabled={isGeneratingPdf || !pdfTarget.license_key}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Télécharger sans PIN
                </button>

                <button
                  onClick={() => setPdfTarget(null)}
                  disabled={isGeneratingPdf}
                  className="w-full py-2 text-[11px] font-medium text-ink-400 hover:text-ink-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>

              <p className="text-[10px] text-ink-400 leading-relaxed text-center">
                Le PDF se termine par une note « Document confidentiel ».
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
