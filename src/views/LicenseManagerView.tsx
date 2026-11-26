import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Store } from '../types';
import { dbService, AdminAnalytics, CreatedStoreAccess } from '../services/db';
import { formatDate, formatFCFA } from '../utils/formatters';
import { downloadStoreAccessPdf } from '../utils/accessSheet';
import {
  clampMonths,
  isPromoCode,
  PLAN_IDS,
  PLANS,
  planFromQuota,
  planLabel,
  planPrice,
  proratedPrice,
  type PlanId,
} from '../utils/plans';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
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
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
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
  plan: 'decouverte' as PlanId,
  promoCode: '',
  maxProducts: PLANS.decouverte.maxProducts,
  durationMonths: 12,
};

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ledger-paper';

const FIELD =
  'w-full min-h-11 rounded-md border border-ledger-line bg-white px-3 text-sm text-ledger-ink outline-none transition-colors focus:border-ledger-green focus:ring-2 focus:ring-ledger-green/15';

const LABEL = 'block text-sm font-medium text-ledger-ink mb-1.5';

type StoreStatus = 'active' | 'expired' | 'suspended';
type StatusFilter = 'all' | 'active' | 'expiring' | 'suspended';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'green' | 'red' | 'brass';
  onConfirm: () => void;
}

function daysUntil(dateString?: string | null): number {
  if (!dateString) return 0;
  const target = new Date(dateString).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function getStoreStatus(store: Store): StoreStatus {
  if (!store.is_active) return 'suspended';
  if (new Date(store.expires_at).getTime() <= Date.now()) return 'expired';
  return 'active';
}

function shortSerial(store: Store): string {
  const key = (store.license_key ?? '').replace(/[^a-z0-9]/gi, '');
  if (key.length >= 4) return key.slice(-4).toUpperCase();
  const id = store.id.replace(/[^a-z0-9]/gi, '');
  return id.slice(-4).toUpperCase() || '0000';
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

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

function buildOnboardingMessage(store: Store, _licenseKey?: string, pinCode?: string) {
  const plan = store.plan ?? planFromQuota(store.max_products);
  const lines = [
    `Bonjour, votre vitrine ${store.name} est activée sur VitrineExpress.`,
    '',
    `Vitrine publique : ${window.location.origin}/boutique/${store.slug}`,
    `Espace de gestion : ${window.location.origin}/merchant`,
    '',
    'Identifiants d\'accès commerçant :',
    `Identifiant : ${store.name} (ou ${store.whatsapp_number})`,
  ];
  if (pinCode) lines.push(`Code PIN secret : ${pinCode}`);
  lines.push(
    '',
    `Formule : ${planLabel(plan)}`,
    `Quota : jusqu'à ${store.max_products} articles`,
    `Validité : jusqu'au ${formatDate(store.expires_at)}`,
    '',
    'Premiers pas recommandés :',
    '1. Connectez-vous sur votre espace de gestion.',
    '2. Publiez vos photos de produits, prix et arrivages.',
    '3. Téléchargez votre affiche QR code pour votre comptoir.',
    '',
    'Support technique : l\'équipe VitrineExpress sur WhatsApp.',
  );
  return lines.join('\n');
}

const StatusStamp: React.FC<{ status: StoreStatus }> = ({ status }) => {
  const map: Record<StoreStatus, { label: string; className: string }> = {
    active: { label: 'Actif', className: 'border-ledger-green/40 bg-ledger-green-soft text-ledger-green' },
    expired: { label: 'Expiré', className: 'border-ledger-red/40 bg-ledger-red-soft text-ledger-red' },
    suspended: { label: 'Suspendu', className: 'border-ledger-line bg-ledger-paper text-ledger-muted' },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${className}`}>
      {label}
    </span>
  );
};

const ExpiryMeter: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const days = daysUntil(expiresAt);
  const width = Math.max(0, Math.min(100, (days / 365) * 100));
  const tone = days <= 0 ? 'bg-ledger-red' : days < 30 ? 'bg-ledger-brass' : 'bg-ledger-green';
  return (
    <div
      className="mt-2 h-1.5 w-full bg-ledger-line/70"
      role="img"
      aria-label={days > 0 ? `${days} jours restants` : 'Licence échue'}
    >
      <div className={`h-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
};

const QuotaMeter: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const ratio = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const tone = current >= max ? 'bg-ledger-red' : current / Math.max(max, 1) >= 0.8 ? 'bg-ledger-brass' : 'bg-ledger-green';
  return (
    <div
      className="mt-2 h-1.5 w-full bg-ledger-line/70"
      role="img"
      aria-label={`${current} articles sur ${max}`}
    >
      <div className={`h-full ${tone}`} style={{ width: `${ratio}%` }} />
    </div>
  );
};

export const LicenseManagerView: React.FC<LicenseManagerViewProps> = ({
  onSelectStore,
  onBackToHome,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => dbService.isAdminAuthenticated());
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics>({
    totals: {
      landingOpens: 0,
      storeCreated: 0,
      whatsappClicks: 0,
      stores: 0,
      storesWithProducts: 0,
    },
    campaigns: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createdAccess, setCreatedAccess] = useState<CreatedStoreAccess | null>(null);
  const [pdfTarget, setPdfTarget] = useState<Store | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [quotaTarget, setQuotaTarget] = useState<Store | null>(null);
  const [quotaValue, setQuotaValue] = useState('8');
  const [renewTarget, setRenewTarget] = useState<Store | null>(null);
  const [renewPlan, setRenewPlan] = useState<PlanId>('decouverte');
  const [renewMonths, setRenewMonths] = useState('12');
  const [renewPromo, setRenewPromo] = useState('');
  const [renewOperator, setRenewOperator] = useState('');
  const [renewReference, setRenewReference] = useState('');
  const [renewNote, setRenewNote] = useState('');

  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifTargetStoreId, setNotifTargetStoreId] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'success' | 'warning' | 'tip'>('info');
  const [notifLinkUrl, setNotifLinkUrl] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error('Veuillez renseigner un titre et un message');
      return;
    }

    setIsSendingNotif(true);
    try {
      const result = await dbService.sendAdminNotification({
        storeId: notifTargetStoreId || null,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
        linkUrl: notifLinkUrl.trim() || undefined,
      });

      if (result.success) {
        toast.success(notifTargetStoreId ? 'Notification ciblée envoyée' : 'Notification diffusée à toutes les boutiques');
        setIsNotifModalOpen(false);
        setNotifTitle('');
        setNotifMessage('');
        setNotifLinkUrl('');
        setNotifTargetStoreId('');
      } else {
        toast.error(result.error ?? "Erreur lors de l'envoi");
      }
    } finally {
      setIsSendingNotif(false);
    }
  };

  const loadAnalytics = useCallback(async () => {
    const result = await dbService.getAdminAnalytics();
    if (result.success && result.analytics) {
      setAnalytics(result.analytics);
    }
  }, []);

  const loadStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [result] = await Promise.all([dbService.getAdminStores(), loadAnalytics()]);
    if (result.success) {
      setStores(result.stores);
    } else {
      setError(result.error ?? 'Erreur de chargement');
      if (!dbService.isAdminAuthenticated()) {
        setIsAuthenticated(false);
      }
    }
    setIsLoading(false);
  }, [loadAnalytics]);

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
      toast.success('Registre déverrouillé');
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
    if (form.maxProducts < 1 || form.maxProducts > PLANS.premium.maxProducts) {
      toast.error(`Entrez un quota entre 1 et ${PLANS.premium.maxProducts} articles`);
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
        plan: form.plan,
        promoCode: form.promoCode.trim(),
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
      if (!dbService.isAdminAuthenticated()) setIsAuthenticated(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (store: Store) => {
    const isActive = Boolean(store.is_active);
    setActionId(store.id);
    try {
      const result = await dbService.toggleStoreStatus(store.id);
      if (result.success && result.store) {
        setStores((current) => current.map((item) => item.id === store.id ? { ...item, ...result.store } : item));
        toast.success(isActive ? `${store.name} suspendue` : `${store.name} réactivée`);
      } else {
        toast.error(result.error ?? 'Erreur de mise à jour');
        if (!dbService.isAdminAuthenticated()) setIsAuthenticated(false);
      }
    } finally {
      setActionId(null);
    }
  };

  const updatePlan = (plan: PlanId) =>
    setForm((current) => ({
      ...current,
      plan,
      maxProducts: PLANS[plan].maxProducts,
      promoCode: plan === 'decouverte' ? '' : current.promoCode,
    }));

  const openRenewDialog = (store: Store) => {
    setMenuOpenId(null);
    setRenewTarget(store);
    setRenewPlan(store.plan ?? planFromQuota(store.max_products));
    setRenewMonths('12');
    setRenewPromo('');
    setRenewOperator('');
    setRenewReference('');
    setRenewNote('');
  };

  const submitRenew = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!renewTarget) return;

    const target = renewTarget;
    const months = clampMonths(renewMonths);
    const promo = isPromoCode(renewPromo) ? renewPromo.trim().toUpperCase() : '';
    const expected = proratedPrice(renewPlan, months, Boolean(promo));

    setRenewTarget(null);
    setActionId(target.id);
    try {
      const result = await dbService.renewStoreLicense(target.id, months, {
        plan: renewPlan,
        promoCode: promo || undefined,
        paymentOperator: renewOperator.trim() || undefined,
        paymentReference: renewReference.trim() || undefined,
        note: renewNote.trim() || undefined,
      });
      if (result.success && result.store) {
        setStores((current) => current.map((item) => item.id === target.id ? { ...item, ...result.store } : item));
        toast.success(
          `Licence de ${target.name} prolongée de ${months} mois · ${formatFCFA(result.amountPaid ?? expected)} encaissés`,
        );
      } else {
        toast.error(result.error ?? 'Erreur de renouvellement');
        if (!dbService.isAdminAuthenticated()) setIsAuthenticated(false);
      }
    } finally {
      setActionId(null);
    }
  };

  const handleUpdateQuota = async (store: Store, newQuota: number) => {
    setActionId(store.id);
    try {
      const result = await dbService.updateStoreQuota(store.id, newQuota);
      if (result.success && result.store) {
        setStores((current) => current.map((item) => item.id === store.id ? { ...item, ...result.store } : item));
        toast.success(`Quota de ${store.name} ajusté à ${newQuota} articles`);
        if (result.warning) toast.warning(result.warning);
      } else {
        toast.error(result.error ?? 'Erreur de mise à jour du quota');
        if (!dbService.isAdminAuthenticated()) setIsAuthenticated(false);
      }
    } finally {
      setActionId(null);
    }
  };

  const handleResetPin = async (store: Store) => {
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
        if (!dbService.isAdminAuthenticated()) setIsAuthenticated(false);
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
      if (!dbService.isAdminAuthenticated()) setIsAuthenticated(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const requestToggleStatus = (store: Store) => {
    const isActive = Boolean(store.is_active);
    setMenuOpenId(null);
    setConfirmRequest({
      title: isActive ? 'Suspendre cette vitrine ?' : 'Réactiver cette vitrine ?',
      message: isActive
        ? `${store.name} ne sera plus accessible publiquement jusqu'à réactivation.`
        : `${store.name} redeviendra accessible publiquement.`,
      confirmLabel: isActive ? 'Suspendre' : 'Réactiver',
      tone: isActive ? 'red' : 'green',
      onConfirm: () => void handleToggleStatus(store),
    });
  };

  const requestResetPin = (store: Store) => {
    setMenuOpenId(null);
    setConfirmRequest({
      title: 'Générer un nouveau PIN ?',
      message: `L'ancien PIN de ${store.name} ne fonctionnera plus. Le nouveau PIN s'affichera une seule fois.`,
      confirmLabel: 'Générer le PIN',
      tone: 'red',
      onConfirm: () => void handleResetPin(store),
    });
  };

  const openQuotaDialog = (store: Store) => {
    setMenuOpenId(null);
    setQuotaTarget(store);
    setQuotaValue(String(store.max_products || PLANS.decouverte.maxProducts));
  };

  const submitQuota = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quotaTarget) return;
    const newQuota = parseInt(quotaValue.trim(), 10);
    if (Number.isNaN(newQuota) || newQuota < 1 || newQuota > PLANS.premium.maxProducts) {
      toast.error(`Veuillez entrer un nombre valide entre 1 et ${PLANS.premium.maxProducts} articles`);
      return;
    }
    const target = quotaTarget;
    setQuotaTarget(null);
    void handleUpdateQuota(target, newQuota);
  };

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const priority: Record<StoreStatus, number> = { expired: 0, active: 1, suspended: 2 };
    return stores
      .filter((store) => {
        const days = daysUntil(store.expires_at);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'suspended' && !store.is_active) ||
          (statusFilter === 'expiring' && Boolean(store.is_active) && days < 30) ||
          (statusFilter === 'active' && Boolean(store.is_active) && days >= 30);
        if (!matchesStatus) return false;
        if (!query) return true;
        return (
          store.name.toLowerCase().includes(query) ||
          store.city.toLowerCase().includes(query) ||
          store.slug.toLowerCase().includes(query) ||
          (store.whatsapp_number ?? '').includes(query) ||
          (store.license_key ?? '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const statusDiff = priority[getStoreStatus(a)] - priority[getStoreStatus(b)];
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      });
  }, [searchQuery, statusFilter, stores]);

  const enRegleCount = stores.filter((store) => Boolean(store.is_active) && daysUntil(store.expires_at) >= 30).length;
  const aEcheanceCount = stores.filter((store) => Boolean(store.is_active) && daysUntil(store.expires_at) < 30).length;
  const suspenduesCount = stores.filter((store) => !store.is_active).length;
  const recordedRevenue = stores.reduce((total, store) => total + (Number(store.price_paid) || 0), 0);
  const outstandingRevenue = stores.reduce((total, store) => total + (Number(store.amount_due) || 0), 0);
  const hasActiveFilter = statusFilter !== 'all' || searchQuery.trim().length > 0;

  const segments: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'active', label: 'En règle', count: enRegleCount },
    { key: 'expiring', label: 'À échéance', count: aEcheanceCount },
    { key: 'suspended', label: 'Suspendues', count: suspenduesCount },
  ];

  if (!isAuthenticated) {
    return (
      <div className="flex-1 min-h-[calc(100vh-3.5rem)] bg-ledger-paper font-ledger text-ledger-ink flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button
            onClick={onBackToHome}
            className={`inline-flex items-center gap-1.5 text-sm text-ledger-muted hover:text-ledger-ink transition-colors mb-6 cursor-pointer ${FOCUS}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </button>

          <div className="border border-ledger-line bg-ledger-surface">
            <div className="border-b border-ledger-line px-6 py-6">
              <div className="flex items-center gap-2 text-ledger-green">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-medium">Administration</span>
              </div>
              <h1 className="font-registry font-semibold text-3xl tracking-tight mt-3">
                Registre des licences
              </h1>
              <p className="text-sm text-ledger-muted mt-1.5 leading-relaxed">
                Espace d'administration VitrineExpress. Saisissez la clé configurée sur le serveur
                pour gérer les boutiques et les échéances.
              </p>
            </div>

            <form onSubmit={handleLogin} className="px-6 py-6 space-y-4">
              <div>
                <label htmlFor="admin-key" className={LABEL}>
                  Clé administrateur
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-ledger-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-key"
                    type={showAdminKey ? 'text' : 'password'}
                    value={adminKeyInput}
                    onChange={(event) => setAdminKeyInput(event.target.value)}
                    placeholder="Saisir la clé"
                    autoComplete="current-password"
                    autoFocus
                    className={`${FIELD} pl-10 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminKey((visible) => !visible)}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-md text-ledger-muted hover:text-ledger-ink hover:bg-ledger-paper cursor-pointer ${FOCUS}`}
                    aria-label={showAdminKey ? 'Masquer la clé' : 'Afficher la clé'}
                  >
                    {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="remember-admin"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-ledger-line text-ledger-green focus:ring-ledger-green/40 accent-ledger-green cursor-pointer"
                />
                <label htmlFor="remember-admin" className="text-sm text-ledger-muted select-none cursor-pointer">
                  Rester connecté sur cet appareil
                </label>
              </div>

              {error && (
                <div className="px-3.5 py-2.5 rounded-md bg-ledger-red-soft border border-ledger-red/30 text-sm text-ledger-red leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn || !adminKeyInput.trim()}
                className={`w-full inline-flex items-center justify-center gap-2 min-h-11 rounded-md bg-ledger-green text-white text-sm font-semibold transition-colors hover:bg-ledger-green/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${FOCUS}`}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Déverrouiller le registre'
                )}
              </button>
            </form>
          </div>

          <p className="mt-4 text-xs text-ledger-muted text-center">
            Accès réservé à l'équipe VitrineExpress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-ledger-paper font-ledger text-ledger-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3 text-sm text-ledger-muted">
          <button
            onClick={onBackToHome}
            className={`inline-flex items-center gap-1.5 hover:text-ledger-ink transition-colors cursor-pointer ${FOCUS}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="whitespace-nowrap">Retour à l'accueil</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="font-registry text-base text-ledger-ink whitespace-nowrap">{todayLabel()}</span>
            <button
              onClick={handleLogout}
              className={`inline-flex items-center gap-1.5 hover:text-ledger-ink transition-colors cursor-pointer ${FOCUS}`}
            >
              <LogOut className="w-4 h-4" />
              <span className="whitespace-nowrap">Verrouiller</span>
            </button>
          </div>
        </div>

        <header className="mt-4 border-b-2 border-ledger-ink pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-registry font-semibold text-3xl sm:text-4xl tracking-tight">
                Registre des licences
              </h1>
              <p className="text-sm text-ledger-muted mt-1.5 max-w-md leading-relaxed">
                Créez les vitrines, transmettez les accès et suivez les échéances.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsNotifModalOpen(true)}
                className={`inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md border border-ledger-line bg-ledger-surface text-sm font-medium text-ledger-ink transition-colors hover:bg-ledger-paper cursor-pointer ${FOCUS}`}
              >
                <Bell className="w-4 h-4 text-ledger-brass" />
                Diffuser une notification
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className={`inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md bg-ledger-green text-white text-sm font-semibold transition-colors hover:bg-ledger-green/90 cursor-pointer ${FOCUS}`}
              >
                <Plus className="w-4 h-4" />
                Créer une boutique
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 border-b border-ledger-line">
          {segments.map((segment, index) => {
            const isActive = statusFilter === segment.key;
            return (
              <button
                key={segment.key}
                onClick={() => setStatusFilter((current) => current === segment.key ? 'all' : segment.key)}
                aria-pressed={isActive}
                className={`text-left py-4 sm:px-5 transition-colors cursor-pointer ${index > 0 ? 'border-l border-ledger-line pl-4 sm:pl-5' : 'pr-4 sm:pr-5'} ${isActive ? 'bg-ledger-surface' : 'hover:bg-ledger-surface/60'} ${FOCUS}`}
              >
                <span className="block font-registry text-2xl sm:text-3xl leading-none tabular-nums">
                  {segment.count}
                </span>
                <span className="block text-xs sm:text-sm text-ledger-muted mt-1.5">{segment.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 border-b border-ledger-line sm:grid-cols-4">
          {[
            { label: 'Liens ouverts', value: analytics.totals.landingOpens },
            { label: 'Inscriptions', value: analytics.totals.storeCreated },
            { label: 'Boutiques avec produit', value: analytics.totals.storesWithProducts },
            { label: 'Clics WhatsApp', value: analytics.totals.whatsappClicks },
          ].map((metric, index) => (
            <div
              key={metric.label}
              className={`py-3 sm:px-5 ${index > 0 ? 'border-l border-ledger-line pl-4 sm:pl-5' : 'pr-4 sm:pr-0'} ${index > 1 ? 'border-t border-ledger-line sm:border-t-0' : ''}`}
            >
              <span className="block font-registry text-xl leading-none tabular-nums text-ledger-green">
                {metric.value}
              </span>
              <span className="block text-[11px] text-ledger-muted mt-1">{metric.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3 text-xs text-ledger-muted border-b border-ledger-line">
          <span>
            {filteredStores.length} boutique{filteredStores.length > 1 ? 's' : ''} affichée{filteredStores.length > 1 ? 's' : ''}
          </span>
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-ledger-brass" />
              Encaissé :
              <span className="text-ledger-ink font-medium tabular-nums">
                {recordedRevenue > 0 ? formatFCFA(recordedRevenue) : '—'}
              </span>
            </span>
            {outstandingRevenue > 0 && (
              <span className="inline-flex items-center gap-1.5 text-ledger-red">
                <AlertTriangle className="w-3.5 h-3.5" />
                Reste dû :
                <span className="font-medium tabular-nums">{formatFCFA(outstandingRevenue)}</span>
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 py-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-ledger-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nom, téléphone, clé, ville..."
              className={`${FIELD} pl-9`}
            />
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilter && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className={`min-h-11 px-3 text-sm text-ledger-muted hover:text-ledger-ink transition-colors cursor-pointer ${FOCUS}`}
              >
                Effacer
              </button>
            )}
            <button
              onClick={() => void loadStores()}
              disabled={isLoading}
              className={`h-11 w-11 inline-flex items-center justify-center rounded-md border border-ledger-line bg-ledger-surface text-ledger-muted hover:text-ledger-ink hover:bg-ledger-paper transition-colors disabled:opacity-50 cursor-pointer ${FOCUS}`}
              title="Rafraîchir"
              aria-label="Rafraîchir la liste"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 p-4 rounded-md bg-ledger-red-soft border border-ledger-red/30">
            <div className="flex items-start gap-2.5 text-sm text-ledger-red">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => void loadStores()}
              className={`text-sm font-semibold text-ledger-red hover:opacity-80 underline underline-offset-2 cursor-pointer shrink-0 ${FOCUS}`}
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="border border-ledger-line bg-ledger-surface">
          <div className="hidden lg:grid grid-cols-[minmax(0,1.7fr)_120px_minmax(0,1.35fr)_120px_200px] gap-4 px-5 py-2.5 border-b border-ledger-line text-xs text-ledger-muted">
            <span>Boutique</span>
            <span>Statut</span>
            <span>Échéance</span>
            <span>Quota</span>
            <span className="text-right">Actions</span>
          </div>

          {isLoading && stores.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <div className="w-7 h-7 border-2 border-ledger-line border-t-ledger-green rounded-full animate-spin mb-3" />
              <span className="text-sm text-ledger-muted">Chargement du registre...</span>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-11 h-11 border border-ledger-line bg-ledger-paper text-ledger-muted flex items-center justify-center mb-3">
                <StoreIcon className="w-5 h-5" />
              </div>
              <p className="font-registry text-lg text-ledger-ink">
                {stores.length === 0 ? 'Aucune boutique au registre' : 'Aucun résultat'}
              </p>
              <p className="text-sm text-ledger-muted mt-1 max-w-xs leading-relaxed">
                {stores.length === 0
                  ? 'Créez la première vitrine pour démarrer votre activité.'
                  : 'Modifiez la recherche ou retirez le filtre de statut.'}
              </p>
            </div>
          ) : (
            <div>
              {filteredStores.map((store) => {
                const status = getStoreStatus(store);
                const days = daysUntil(store.expires_at);
                const currentProducts = store.current_products_count ?? 0;
                const isBusy = actionId === store.id;
                const isMenuOpen = menuOpenId === store.id;
                const canPreview = Boolean(store.is_active) && days > 0;

                return (
                  <div
                    key={store.id}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_120px_minmax(0,1.35fr)_120px_200px] gap-4 lg:gap-4 px-4 sm:px-5 py-4 border-b border-ledger-line last:border-b-0 hover:bg-ledger-paper/60 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 shrink-0 border border-ledger-line bg-ledger-paper flex items-center justify-center overflow-hidden">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-registry font-semibold text-lg text-ledger-ink">
                            {store.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <h2 className="font-registry text-lg leading-tight text-ledger-ink truncate">
                            {store.name}
                          </h2>
                          <span className="font-ledger-mono text-[11px] text-ledger-muted shrink-0">
                            #{shortSerial(store)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ledger-muted mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {store.city}{store.quarter ? `, ${store.quarter}` : ''}
                          </span>
                        </div>
                        <div className="mt-0.5 font-ledger-mono text-[11px] text-ledger-muted">
                          {planLabel(store.plan ?? planFromQuota(store.max_products))} · {store.max_products} articles
                        </div>
                        <button
                          onClick={() => void copyText(store.license_key ?? '', 'Clé de licence copiée')}
                          className={`mt-1.5 inline-flex items-center gap-1 font-ledger-mono text-[11px] text-ledger-muted hover:text-ledger-ink transition-colors cursor-pointer ${FOCUS}`}
                          title="Copier la clé de licence"
                        >
                          <Copy className="w-3 h-3" />
                          {store.license_key ?? 'Sans clé'}
                        </button>
                      </div>
                    </div>

                      <div className="lg:pt-1 flex flex-col gap-1">
                        <StatusStamp status={status} />
                        {Number(store.amount_due) > 0 && (
                          <span className="text-[11px] text-ledger-red font-medium">
                            {formatFCFA(Number(store.amount_due))} dû
                          </span>
                        )}
                      </div>

                    <div className="lg:pt-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-ledger-mono text-sm tabular-nums text-ledger-ink">
                          {formatDate(store.expires_at)}
                        </span>
                        <span className={`text-xs tabular-nums ${days <= 0 ? 'text-ledger-red font-medium' : days < 30 ? 'text-ledger-brass font-medium' : 'text-ledger-muted'}`}>
                          {days > 0 ? `${days} j` : 'Échu'}
                        </span>
                      </div>
                      <ExpiryMeter expiresAt={store.expires_at} />
                      {Number(store.amount_due) > 0 && (
                        <span className="mt-0.5 text-[11px] text-ledger-red font-medium">
                          {formatFCFA(Number(store.amount_due))} à encaisser
                        </span>
                      )}
                    </div>

                    <div className="lg:pt-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-ledger-mono text-sm tabular-nums text-ledger-ink">
                          {currentProducts} / {store.max_products}
                        </span>
                      </div>
                      <QuotaMeter current={currentProducts} max={store.max_products} />
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end">
                      <button
                        onClick={() => openRenewDialog(store)}
                        disabled={isBusy}
                        className={`inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-md border border-ledger-brass/60 bg-ledger-brass-soft/40 text-ledger-brass text-sm font-semibold transition-colors hover:bg-ledger-brass-soft disabled:opacity-50 cursor-pointer ${FOCUS}`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                        Renouveler
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(isMenuOpen ? null : store.id)}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          aria-label={`Autres actions pour ${store.name}`}
                          className={`h-11 w-11 inline-flex items-center justify-center rounded-md border border-ledger-line text-ledger-muted hover:text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                            <div
                              role="menu"
                              className="absolute right-0 top-full mt-1 z-40 w-60 rounded-md border border-ledger-line bg-ledger-surface py-1 shadow-lg"
                            >
                              <button
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  onSelectStore(store);
                                }}
                                disabled={!canPreview}
                                title={!canPreview ? "Voir la vitrine nécessite une boutique active et en cours de validité" : "Voir la vitrine"}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-10 text-sm text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${Boolean(canPreview) ? 'text-ledger-ink hover:bg-ledger-paper' : 'text-ledger-muted'} ${FOCUS}`}
                              >
                                <StoreIcon className="w-4 h-4 text-ledger-muted" />
                                Voir la vitrine
                              </button>
                              <button
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  void copyText(buildOnboardingMessage(store), 'Message d’accueil copié');
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-10 text-sm text-left text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                                title="Copier le lien et la clé (le PIN n'est plus réaffiché)"
                              >
                                <MessageSquare className="w-4 h-4 text-ledger-green" />
                                Copier les accès
                              </button>
                              <button
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setPdfTarget(store);
                                }}
                                disabled={!store.license_key}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-10 text-sm text-left text-ledger-ink hover:bg-ledger-paper transition-colors disabled:opacity-50 cursor-pointer ${FOCUS}`}
                              >
                                <FileDown className="w-4 h-4 text-ledger-muted" />
                                Fiche d'accès PDF
                              </button>
                              <button
                                role="menuitem"
                                onClick={() => openQuotaDialog(store)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-10 text-sm text-left text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                              >
                                <Package className="w-4 h-4 text-ledger-muted" />
                                Modifier le quota
                              </button>
                              <button
                                role="menuitem"
                                onClick={() => requestResetPin(store)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-10 text-sm text-left text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                              >
                                <KeyRound className="w-4 h-4 text-ledger-muted" />
                                Générer un nouveau PIN
                              </button>
                              <div className="my-1 border-t border-ledger-line" />
                              <button
                                role="menuitem"
                                onClick={() => requestToggleStatus(store)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 min-h-10 text-sm text-left transition-colors cursor-pointer hover:bg-ledger-paper ${Boolean(store.is_active) ? 'text-ledger-red' : 'text-ledger-green'} ${FOCUS}`}
                              >
                                {Boolean(store.is_active) ? (
                                  <AlertTriangle className="w-4 h-4" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                {Boolean(store.is_active) ? 'Suspendre la vitrine' : 'Réactiver la vitrine'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex sm:justify-end">
          <div className="absolute inset-0 bg-ledger-ink/40" onClick={() => setIsCreateOpen(false)} />
          <div className="relative flex h-full w-full sm:max-w-md flex-col bg-ledger-surface border-l border-ledger-line">
            <div className="flex items-start justify-between gap-3 border-b border-ledger-line px-5 py-4">
              <div>
                <h2 className="font-registry font-semibold text-xl text-ledger-ink">Créer une boutique</h2>
                <p className="text-xs text-ledger-muted mt-1">
                  Une licence annuelle et une catégorie par défaut sont générées.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className={`h-9 w-9 inline-flex items-center justify-center rounded-md text-ledger-muted hover:text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <label className={LABEL} htmlFor="store-name">Nom de la boutique</label>
                <input
                  id="store-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ex : Kamer Kicks Akwa"
                  required
                  className={FIELD}
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="store-whatsapp">Numéro WhatsApp</label>
                <input
                  id="store-whatsapp"
                  type="tel"
                  value={form.whatsapp}
                  onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                  placeholder="237699000000"
                  required
                  className={FIELD}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="store-city">Ville</label>
                  <select
                    id="store-city"
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                    className={FIELD}
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
                  <label className={LABEL} htmlFor="store-quarter">Quartier</label>
                  <input
                    id="store-quarter"
                    type="text"
                    value={form.quarter}
                    onChange={(event) => setForm({ ...form, quarter: event.target.value })}
                    placeholder="Ex : Akwa"
                    className={FIELD}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL}>Formule</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLAN_IDS.map((planId) => {
                    const definition = PLANS[planId];
                    const active = form.plan === planId;
                    return (
                      <button
                        key={planId}
                        type="button"
                        onClick={() => updatePlan(planId)}
                        aria-pressed={active}
                        className={`flex flex-col items-center justify-center min-h-11 rounded-md border text-center cursor-pointer ${FOCUS} ${
                          active
                            ? 'border-ledger-green bg-ledger-green/10 text-ledger-ink'
                            : 'border-ledger-line bg-white text-ledger-muted hover:bg-ledger-paper'
                        }`}
                      >
                        <span className="text-xs font-semibold font-ledger-mono">{definition.label}</span>
                        <span className="text-[10px] text-ledger-muted">
                          {definition.maxProducts} art. · {definition.price > 0 ? formatFCFA(definition.price) : 'Gratuit'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.plan !== 'decouverte' && (
                <div>
                  <label className={LABEL} htmlFor="store-promo">Code promo (optionnel)</label>
                  <input
                    id="store-promo"
                    type="text"
                    value={form.promoCode}
                    onChange={(event) => setForm({ ...form, promoCode: event.target.value.toUpperCase() })}
                    placeholder="Ex : VIP237"
                    className={`${FIELD} font-ledger-mono`}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LABEL} htmlFor="store-pin">PIN</label>
                  <input
                    id="store-pin"
                    type="text"
                    value={form.pin}
                    onChange={(event) => setForm({ ...form, pin: event.target.value })}
                    placeholder="Auto"
                    minLength={4}
                    maxLength={12}
                    className={`${FIELD} font-ledger-mono`}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="store-quota">Quota</label>
                  <input
                    id="store-quota"
                    type="number"
                    min={1}
                    max={PLANS.premium.maxProducts}
                    value={form.maxProducts}
                    onChange={(event) => setForm({ ...form, maxProducts: Number(event.target.value) })}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="store-months">Mois</label>
                  <input
                    id="store-months"
                    type="number"
                    min={1}
                    max={36}
                    value={form.durationMonths}
                    onChange={(event) => setForm({ ...form, durationMonths: Number(event.target.value) })}
                    className={FIELD}
                  />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-3 p-3 rounded-md bg-ledger-paper border border-ledger-line text-xs text-ledger-ink leading-relaxed">
                <span className="font-ledger-mono shrink-0">Résumé</span>
                <span>{planLabel(form.plan)} · {formatFCFA(planPrice(form.plan, isPromoCode(form.promoCode)))} · {form.maxProducts} articles · {form.durationMonths} mois</span>
              </div>

              <div className="p-3 rounded-md bg-ledger-paper border border-ledger-line text-xs text-ledger-muted leading-relaxed">
                Le lien de la vitrine sera <span className="font-ledger-mono text-ledger-ink">/boutique/identifiant</span>,
                généré automatiquement à partir du nom.
              </div>

              </div>
              <div className="flex items-center gap-2 border-t border-ledger-line px-5 py-4 bg-ledger-surface">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className={`flex-1 min-h-11 rounded-md border border-ledger-line text-sm font-medium text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 rounded-md bg-ledger-green text-white text-sm font-semibold transition-colors hover:bg-ledger-green/90 disabled:opacity-50 cursor-pointer ${FOCUS}`}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Créer la boutique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-ledger-ink/50" onClick={() => setCreatedAccess(null)} />
          <div className="relative w-full max-w-md bg-ledger-surface border border-ledger-line my-auto">
            <div className="border-b border-ledger-line px-6 py-5">
              <div className="flex items-center justify-between text-[11px] font-ledger-mono text-ledger-muted">
                <span>Acte d'accès</span>
                <span>#{shortSerial(createdAccess.store)}</span>
              </div>
              <h2 className="font-registry font-semibold text-2xl text-ledger-ink mt-2">
                {createdAccess.store.name} est en ligne
              </h2>
              <p className="text-sm text-ledger-muted mt-1">Transmettez ces accès au commerçant.</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <dl className="border-y border-dashed border-ledger-line divide-y divide-dashed divide-ledger-line">
                <div className="py-2.5">
                  <dt className="text-sm text-ledger-muted">Vitrine</dt>
                  <dd className="text-xs font-ledger-mono text-ledger-ink break-all mt-1">
                    {window.location.origin}/boutique/{createdAccess.store.slug}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ledger-muted shrink-0">Clé de licence</dt>
                  <dd className="text-xs font-ledger-mono text-ledger-ink break-all text-right">
                    {createdAccess.licenseKey}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ledger-muted shrink-0">Code PIN</dt>
                  <dd className="text-sm font-ledger-mono text-ledger-ink">{createdAccess.pinCode}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ledger-muted shrink-0">Validité</dt>
                  <dd className="text-xs font-ledger-mono text-ledger-ink">
                    {formatDate(createdAccess.expiresAt)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ledger-muted shrink-0">Formule</dt>
                  <dd className="text-xs text-ledger-ink">
                    {createdAccess.plan ? `${planLabel(createdAccess.plan)} · ${formatFCFA(createdAccess.pricePaid ?? 0)}` : '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ledger-muted shrink-0">Quota</dt>
                  <dd className="text-xs font-ledger-mono text-ledger-ink">
                    {createdAccess.store.max_products} articles
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-ledger-muted leading-relaxed">
                Le PIN ne sera plus affiché en clair par la suite. Conservez cette fiche ou transmettez-la
                immédiatement.
              </p>

              <button
                onClick={() => void handleDownloadAccessPdf(
                  createdAccess.store,
                  createdAccess.licenseKey,
                  createdAccess.pinCode,
                  createdAccess.expiresAt,
                )}
                disabled={isGeneratingPdf}
                className={`w-full inline-flex items-center justify-center gap-2 min-h-11 rounded-md bg-ledger-brass text-ledger-ink text-sm font-semibold transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${FOCUS}`}
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Télécharger la fiche PDF
              </button>

              <div className="flex flex-col sm:flex-row gap-2">
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
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 rounded-md bg-ledger-green text-white text-sm font-semibold transition-colors hover:bg-ledger-green/90 cursor-pointer ${FOCUS}`}
                >
                  <MessageCircle className="w-4 h-4" />
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
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-11 rounded-md border border-ledger-line text-sm font-medium text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                >
                  <Copy className="w-4 h-4" />
                  Copier les accès
                </button>
              </div>

              <button
                onClick={() => setCreatedAccess(null)}
                className={`w-full min-h-10 text-sm text-ledger-muted hover:text-ledger-ink transition-colors cursor-pointer ${FOCUS}`}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            onClick={() => {
              if (!isGeneratingPdf) setPdfTarget(null);
            }}
            className="fixed inset-0 bg-ledger-ink/50"
          />
          <div className="relative w-full max-w-md bg-ledger-surface border border-ledger-line my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-ledger-line px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-ledger-brass-soft text-ledger-brass border border-ledger-brass/30 flex items-center justify-center shrink-0">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-registry font-semibold text-xl text-ledger-ink">Fiche d'accès PDF</h2>
                  <p className="text-xs text-ledger-muted mt-0.5">{pdfTarget.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPdfTarget(null)}
                disabled={isGeneratingPdf}
                className={`h-9 w-9 inline-flex items-center justify-center rounded-md text-ledger-muted hover:text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer disabled:opacity-50 ${FOCUS}`}
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-ledger-muted leading-relaxed">
                Cette fiche contient le lien de la vitrine, la clé de licence, les instructions
                de gestion et la mention de confidentialité.
              </p>

              <dl className="border-y border-dashed border-ledger-line divide-y divide-dashed divide-ledger-line">
                <div className="py-2.5">
                  <dt className="text-sm text-ledger-muted">Lien public</dt>
                  <dd className="text-xs font-ledger-mono text-ledger-ink break-all mt-1">
                    {window.location.origin}/boutique/{pdfTarget.slug}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-sm text-ledger-muted shrink-0">Clé de licence</dt>
                  <dd className="text-xs font-ledger-mono text-ledger-ink break-all text-right">
                    {pdfTarget.license_key ?? 'Non disponible'}
                  </dd>
                </div>
              </dl>

              <div className="p-3 rounded-md bg-ledger-brass-soft border border-ledger-brass/30 text-xs text-ledger-ink leading-relaxed">
                Le PIN actuel n'est jamais réaffiché. Pour l'inclure dans le PDF, un nouveau PIN
                sera généré et l'ancien ne fonctionnera plus.
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => void handlePdfWithNewPin()}
                  disabled={isGeneratingPdf || !pdfTarget.license_key}
                  className={`w-full inline-flex items-center justify-center gap-2 min-h-11 rounded-md bg-ledger-brass text-ledger-ink text-sm font-semibold transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${FOCUS}`}
                >
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {isGeneratingPdf ? 'Génération...' : 'Nouveau PIN et fiche PDF'}
                </button>

                <button
                  onClick={() => void handlePdfWithoutPin()}
                  disabled={isGeneratingPdf || !pdfTarget.license_key}
                  className={`w-full inline-flex items-center justify-center gap-2 min-h-11 rounded-md border border-ledger-line text-sm font-medium text-ledger-ink hover:bg-ledger-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${FOCUS}`}
                >
                  <FileDown className="w-4 h-4" />
                  Télécharger sans PIN
                </button>

                <button
                  onClick={() => setPdfTarget(null)}
                  disabled={isGeneratingPdf}
                  className={`w-full min-h-10 text-sm text-ledger-muted hover:text-ledger-ink transition-colors cursor-pointer disabled:opacity-50 ${FOCUS}`}
                >
                  Annuler
                </button>
              </div>

              <p className="text-[11px] text-ledger-muted leading-relaxed text-center">
                Le PDF se termine par une note de confidentialité.
              </p>
            </div>
          </div>
        </div>
      )}

      {confirmRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ledger-ink/50" onClick={() => setConfirmRequest(null)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-sm bg-ledger-surface border border-ledger-line p-6"
          >
            <h2 id="confirm-title" className="font-registry font-semibold text-xl text-ledger-ink">
              {confirmRequest.title}
            </h2>
            <p className="text-sm text-ledger-muted mt-2 leading-relaxed">{confirmRequest.message}</p>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setConfirmRequest(null)}
                className={`flex-1 min-h-11 rounded-md border border-ledger-line text-sm font-medium text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  confirmRequest.onConfirm();
                  setConfirmRequest(null);
                }}
                className={`flex-1 min-h-11 rounded-md text-sm font-semibold transition-colors hover:brightness-95 cursor-pointer ${FOCUS} ${
                  confirmRequest.tone === 'red'
                    ? 'bg-ledger-red text-white'
                    : confirmRequest.tone === 'green'
                      ? 'bg-ledger-green text-white'
                      : 'bg-ledger-brass text-ledger-ink'
                }`}
              >
                {confirmRequest.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {quotaTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ledger-ink/50" onClick={() => setQuotaTarget(null)} />
          <form
            onSubmit={submitQuota}
            className="relative w-full max-w-sm bg-ledger-surface border border-ledger-line p-6"
          >
            <h2 className="font-registry font-semibold text-xl text-ledger-ink">Modifier le quota</h2>
            <p className="text-sm text-ledger-muted mt-2 leading-relaxed">
              {quotaTarget.name} peut publier jusqu'à {quotaTarget.max_products} articles actuellement.
            </p>
            <div className="mt-4">
              <label htmlFor="quota-input" className={LABEL}>
                Nouveau quota d'articles
              </label>
              <input
                id="quota-input"
                type="number"
                min={1}
                max={500}
                value={quotaValue}
                onChange={(event) => setQuotaValue(event.target.value)}
                autoFocus
                className={FIELD}
              />
              <p className="text-xs text-ledger-muted mt-1.5">Entre 1 et {PLANS.premium.maxProducts} articles.</p>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setQuotaTarget(null)}
                className={`flex-1 min-h-11 rounded-md border border-ledger-line text-sm font-medium text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
              >
                Annuler
              </button>
              <button
                type="submit"
                className={`flex-1 min-h-11 rounded-md bg-ledger-green text-white text-sm font-semibold transition-colors hover:bg-ledger-green/90 cursor-pointer ${FOCUS}`}
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {renewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ledger-ink/50" onClick={() => setRenewTarget(null)} />
          <form
            onSubmit={submitRenew}
            className="relative w-full max-w-sm bg-ledger-surface border border-ledger-line p-6 space-y-4"
          >
            <h2 className="font-registry font-semibold text-xl text-ledger-ink">Renouveler la licence</h2>
            <p className="text-sm text-ledger-muted leading-relaxed">
              {renewTarget.name} sera prolongée. Ce renouvellement ne réactive pas une boutique suspendue.
            </p>
            {Number(renewTarget.amount_due) > 0 && (
              <p className="text-xs text-ledger-red">
                Solde dû actuel : {formatFCFA(Number(renewTarget.amount_due))}
              </p>
            )}

            <div>
              <label className={LABEL}>Formule</label>
              <div className="grid grid-cols-3 gap-2">
                {PLAN_IDS.map((planId) => {
                  const definition = PLANS[planId];
                  const active = renewPlan === planId;
                  return (
                    <button
                      key={planId}
                      type="button"
                      onClick={() => setRenewPlan(planId)}
                      aria-pressed={active}
                      className={`flex flex-col items-center justify-center min-h-11 rounded-md border text-center cursor-pointer ${FOCUS} ${
                        active
                          ? 'border-ledger-green bg-ledger-green/10 text-ledger-ink'
                          : 'border-ledger-line bg-white text-ledger-muted hover:bg-ledger-paper'
                      }`}
                    >
                      <span className="text-xs font-semibold font-ledger-mono">{definition.label}</span>
                      <span className="text-[10px] text-ledger-muted">
                        {definition.maxProducts} art. · {definition.price > 0 ? formatFCFA(definition.price) : 'Gratuit'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {renewPlan !== 'decouverte' && (
              <div>
                <label className={LABEL} htmlFor="renew-promo">Code promo (optionnel)</label>
                <input
                  id="renew-promo"
                  type="text"
                  value={renewPromo}
                  onChange={(event) => setRenewPromo(event.target.value.toUpperCase())}
                  placeholder="Ex : VIP237"
                  className={`${FIELD} font-ledger-mono`}
                />
              </div>
            )}

            <div className="border-t border-ledger-line pt-4 space-y-3">
              <p className="text-xs text-ledger-muted">
                Renseignez ces informations si le règlement a déjà été reçu sur WhatsApp.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="renew-operator">Opérateur (optionnel)</label>
                  <select
                    id="renew-operator"
                    value={renewOperator}
                    onChange={(event) => setRenewOperator(event.target.value)}
                    className={FIELD}
                  >
                    <option value="">Non précisé</option>
                    <option value="MTN MoMo">MTN MoMo</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Virement">Virement</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="renew-reference">Référence (optionnelle)</label>
                  <input
                    id="renew-reference"
                    type="text"
                    value={renewReference}
                    onChange={(event) => setRenewReference(event.target.value)}
                    placeholder="Ex : TXN-123456"
                    className={`${FIELD} font-ledger-mono`}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="renew-note">Note interne (optionnelle)</label>
                <input
                  id="renew-note"
                  type="text"
                  value={renewNote}
                  onChange={(event) => setRenewNote(event.target.value)}
                  placeholder="Ex : capture reçue sur WhatsApp"
                  className={FIELD}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL} htmlFor="renew-months">Mois</label>
                <input
                  id="renew-months"
                  type="number"
                  min={1}
                  max={36}
                  value={renewMonths}
                  onChange={(event) => setRenewMonths(event.target.value)}
                  autoFocus
                  className={FIELD}
                />
              </div>
              <div className="flex flex-col justify-center px-1">
                <span className="text-sm text-ledger-ink font-medium">
                  {formatFCFA(proratedPrice(renewPlan, clampMonths(renewMonths), isPromoCode(renewPromo)))}
                </span>
                <span className="text-[11px] text-ledger-muted">Montant à encaisser</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className={`flex-1 min-h-11 rounded-md border border-ledger-line text-sm font-medium text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={Boolean(renewTarget && actionId === renewTarget.id)}
                className={`flex-1 min-h-11 rounded-md bg-ledger-brass text-ledger-ink text-sm font-semibold transition-colors hover:brightness-95 disabled:opacity-50 cursor-pointer ${FOCUS}`}
              >
                Enregistrer le renouvellement
              </button>
            </div>
          </form>
        </div>
      )}

      {isNotifModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-ledger-ink/50" onClick={() => setIsNotifModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-ledger-surface border border-ledger-line my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-ledger-line px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-ledger-brass-soft text-ledger-brass flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-registry font-semibold text-xl text-ledger-ink">
                    Diffuser une notification
                  </h2>
                  <p className="text-xs text-ledger-muted mt-0.5">
                    Envoyez un message in-app aux commerçants.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifModalOpen(false)}
                className={`h-9 w-9 inline-flex items-center justify-center rounded-md text-ledger-muted hover:text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="px-5 py-5 space-y-4">
              <div>
                <label htmlFor="notif-target" className={LABEL}>Destinataire</label>
                <select
                  id="notif-target"
                  value={notifTargetStoreId}
                  onChange={(e) => setNotifTargetStoreId(e.target.value)}
                  className={FIELD}
                >
                  <option value="">Toutes les boutiques</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="notif-type" className={LABEL}>Type</label>
                  <select
                    id="notif-type"
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value as typeof notifType)}
                    className={FIELD}
                  >
                    <option value="info">Information</option>
                    <option value="tip">Conseil de vente</option>
                    <option value="warning">Alerte</option>
                    <option value="success">Succès</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notif-link" className={LABEL}>Lien optionnel</label>
                  <input
                    id="notif-link"
                    type="url"
                    placeholder="https://..."
                    value={notifLinkUrl}
                    onChange={(e) => setNotifLinkUrl(e.target.value)}
                    className={FIELD}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notif-title" className={LABEL}>Titre</label>
                <input
                  id="notif-title"
                  type="text"
                  required
                  placeholder="Ex : Conseil du weekend pour vos commandes WhatsApp"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="notif-message" className={LABEL}>Message</label>
                <textarea
                  id="notif-message"
                  required
                  rows={3}
                  placeholder="Rédigez votre message aux commerçants..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className={`${FIELD} py-2.5 resize-none`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNotifModalOpen(false)}
                  className={`flex-1 min-h-11 rounded-md border border-ledger-line text-sm font-medium text-ledger-ink hover:bg-ledger-paper transition-colors cursor-pointer ${FOCUS}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSendingNotif}
                  className={`flex-1 min-h-11 rounded-md bg-ledger-green text-white text-sm font-semibold transition-colors hover:bg-ledger-green/90 disabled:opacity-50 cursor-pointer ${FOCUS}`}
                >
                  {isSendingNotif ? 'Envoi...' : 'Envoyer la notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
