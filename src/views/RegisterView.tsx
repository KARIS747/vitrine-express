import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store } from '../types';
import { dbService } from '../services/db';
import { toast } from 'sonner';
import { useLanguage } from '../utils/i18n';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HeartHandshake,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  Tag,
} from 'lucide-react';

interface RegisterViewProps {
  onSuccess: (store: Store) => void;
  onNavigateToLogin: () => void;
  onNavigateHome: () => void;
  onOpenStore: (slug: string) => void;
}

const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Kribi', 'Bamenda', 'Autre'];

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSuccess,
  onNavigateToLogin,
  onNavigateHome,
  onOpenStore,
}) => {
  const { language } = useLanguage();

  // Form State
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [city, setCity] = useState('Douala');
  const [quarter, setQuarter] = useState('');
  const [contactPreference, setContactPreference] = useState<'whatsapp' | 'email'>('whatsapp');
  const [contactEmail, setContactEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'decouverte' | 'pro' | 'premium'>('decouverte');
  const [promoCode, setPromoCode] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStore, setCreatedStore] = useState<Store | null>(null);
  const [createdPin, setCreatedPin] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [pendingPlanInfo, setPendingPlanInfo] = useState<{
    plan: 'decouverte' | 'pro' | 'premium';
    promoCode: string;
    promoApplied: boolean;
    priceDue: number;
  } | null>(null);

  const VALID_PROMO_CODES = useMemo(() => ['VIP237', 'PROMO10', 'EXPRESS', 'LANCEMENT', 'DOUALA', 'YAOUNDE'], []);
  const cleanPromo = promoCode.trim().toUpperCase();
  const isPromoValid = VALID_PROMO_CODES.includes(cleanPromo);
  const proPrice = isPromoValid ? 5000 : 8000;
  const premiumPrice = isPromoValid ? 14000 : 20000;

  // Slug preview computation
  const previewSlug = useMemo(() => {
    return storeName
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }, [storeName]);

  // Validation checks for individual fields
  const isNameValid = storeName.trim().length >= 2;
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const isPhoneValid = cleanPhone.length >= 8 && cleanPhone.length <= 15;
  const isEmailValid =
    contactPreference === 'whatsapp' ||
    (contactPreference === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()));
  const isPinValid = pinCode.length >= 4;
  const isPinMatch = isPinValid && pinCode === pinConfirm;

  // Calcul dynamique de la progression (0 à 100%)
  const { progress, stepStatus } = useMemo(() => {
    let score = 0;
    if (isNameValid) score += 25;
    if (isPhoneValid) score += 25;
    if (isEmailValid) score += 20;
    if (isPinMatch) score += 30;

    let status = {
      label: 'Étape 1 sur 3 · Nom commercial',
      detail: 'Indiquez le nom officiel de votre enseigne',
      icon: StoreIcon,
      color: 'text-ink-800 dark:text-ink-200',
    };

    if (score === 25) {
      status = {
        label: 'Étape 2 sur 3 · Numéro WhatsApp',
        detail: 'Numéro de réception des commandes clients',
        icon: MessageCircle,
        color: 'text-emerald-700 dark:text-emerald-400',
      };
    } else if (score >= 50 && score < 100) {
      status = {
        label: 'Étape 3 sur 3 · Code d\'accès',
        detail: 'Définissez votre code PIN secret (4 à 12 caractères)',
        icon: Lock,
        color: 'text-brand-700 dark:text-brand-400',
      };
    } else if (score === 100) {
      status = {
        label: 'Prêt pour l\'ouverture',
        detail: 'Tous les champs requis sont validés',
        icon: CheckCircle2,
        color: 'text-emerald-700 dark:text-emerald-400',
      };
    }

    return { progress: score, stepStatus: status };
  }, [isNameValid, isPhoneValid, isEmailValid, isPinMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNameValid) {
      toast.error('Veuillez entrer un nom de boutique valide (au moins 2 lettres).');
      return;
    }

    if (!isPhoneValid) {
      toast.error('Numéro WhatsApp invalide (minimum 8 chiffres).');
      return;
    }

    if (contactPreference === 'email' && !isEmailValid) {
      toast.error('Veuillez renseigner une adresse email valide.');
      return;
    }

    if (!isPinValid) {
      toast.error('Le code PIN doit comporter au moins 4 chiffres.');
      return;
    }

    if (!isPinMatch) {
      toast.error('Les deux codes PIN ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dbService.registerStore({
        storeName: storeName.trim(),
        whatsappNumber: cleanPhone,
        city,
        quarter: quarter.trim(),
        contactPreference,
        contactEmail: contactPreference === 'email' ? contactEmail.trim() : undefined,
        pinCode: pinCode.trim(),
        selectedPlan,
        promoCode: promoCode.trim(),
      });

      if (!res.success || !res.store) {
        toast.error(res.error || 'Erreur lors de la création de la boutique.');
        return;
      }

      toast.success('Boutique créée avec succès. Bienvenue sur VitrineExpress !');
      setCreatedStore(res.store);
      setCreatedPin(pinCode.trim());
      setPendingPlanInfo({
        plan: selectedPlan,
        promoCode: cleanPromo,
        promoApplied: Boolean(res.promoApplied),
        priceDue: res.priceDue ?? (selectedPlan === 'pro' ? proPrice : selectedPlan === 'premium' ? premiumPrice : 0),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyStoreUrl = () => {
    if (!createdStore) return;
    const url = `${window.location.origin}/boutique/${encodeURIComponent(createdStore.slug)}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      toast.success('Lien copié dans le presse-papier');
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  // ==========================================================
  // ÉCRAN DE CONFIRMATION (Boutique créée avec succès)
  // ==========================================================
  if (createdStore) {
    const fullStoreUrl = `${window.location.origin}/boutique/${encodeURIComponent(createdStore.slug)}`;
    const shareText = `Découvrez ma vitrine en ligne sur VitrineExpress : ${fullStoreUrl}`;
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-warm-50 dark:bg-ink-950 py-10 px-4 sm:px-6 flex items-center justify-center transition-colors">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg bg-white dark:bg-ink-900 rounded-2xl border border-ink-150 dark:border-ink-800 shadow-elevated p-6 sm:p-8 text-center relative overflow-hidden"
        >
          {/* Status Icon */}
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
            Plan Découverte actif · 8 produits
          </span>

          <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white mt-1">
            Vitrine créée avec succès
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 max-w-md mx-auto">
            Votre vitrine <strong className="text-ink-900 dark:text-white">{createdStore.name}</strong> est opérationnelle et prête à recevoir vos commandes.
          </p>

          {/* URL Box */}
          <div className="mt-6 p-4 rounded-2xl bg-warm-50 dark:bg-ink-950/70 border border-ink-150 dark:border-ink-800 text-left">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500 block mb-1">
              Votre lien public à partager :
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-brand-800 dark:text-brand-300 truncate flex-1 select-all">
                {fullStoreUrl}
              </span>
              <button
                type="button"
                onClick={copyStoreUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-ink-800 dark:text-ink-200 text-xs font-semibold hover:bg-warm-100 dark:hover:bg-ink-800 transition-colors cursor-pointer shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp share test */}
          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Partager directement dans mon statut WhatsApp</span>
          </a>

          {/* Credentials Reminder */}
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-left flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="w-full">
              <p className="font-semibold text-ink-950 dark:text-white">Vos identifiants de connexion :</p>
              <div className="mt-1 space-y-0.5 text-[11px] text-amber-900 dark:text-amber-300">
                <p>• Nom de boutique : <strong className="font-semibold text-ink-950 dark:text-white">{createdStore.name}</strong></p>
                <p>• Numéro WhatsApp : <strong className="font-semibold text-ink-950 dark:text-white">{createdStore.whatsapp_number}</strong></p>
                <p>• Code PIN secret : <strong className="font-mono text-xs text-ink-950 dark:text-white">{createdPin}</strong></p>
              </div>
            </div>
          </div>

          {/* Optionnel : Activation de forfait payant via conseiller WhatsApp */}
          {pendingPlanInfo && pendingPlanInfo.plan !== 'decouverte' && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  {pendingPlanInfo.plan === 'pro' ? 'Activation Plan Pro (30 articles)' : 'Activation Plan Premium (Illimité)'}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {pendingPlanInfo.priceDue.toLocaleString('fr-FR')} FCFA / an
                </span>
              </div>
              <p className="text-[11px] text-ink-600 dark:text-ink-400 leading-relaxed mb-3">
                Votre vitrine est active en mode découverte. Pour débloquer votre quota de {pendingPlanInfo.plan === 'pro' ? '30 articles' : 'produits illimités'}, finalisez votre souscription par Orange Money ou MTN MoMo auprès d'un conseiller VitrineExpress.
              </p>
              <a
                href={`https://wa.me/237681610040?text=${encodeURIComponent(
                  `Bonjour, je viens de créer la boutique ${createdStore.name} sur VitrineExpress et je souhaite activer le ${
                    pendingPlanInfo.plan === 'pro' ? 'Plan Pro (30 articles)' : 'Plan Premium (Illimité)'
                  }${
                    pendingPlanInfo.promoApplied ? ` avec le code promo ${pendingPlanInfo.promoCode}` : ''
                  } (${pendingPlanInfo.priceDue.toLocaleString('fr-FR')} FCFA). Voici le lien : ${fullStoreUrl}. Comment puis-je régler par Orange Money ou MTN MoMo ?`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Finaliser l'activation avec un conseiller sur WhatsApp</span>
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="mt-7 flex flex-col gap-3">
            <button
              onClick={() => onSuccess(createdStore)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
            >
              <span>Accéder à mon espace commerçant</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenStore(createdStore.slug)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 hover:bg-warm-100 dark:hover:bg-ink-800 text-ink-800 dark:text-ink-200 font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Voir la vitrine publique</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================================
  // FORMULAIRE DE CRÉATION INTERACTIF
  // ==========================================================
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-warm-50 dark:bg-ink-950 py-8 px-4 sm:px-6 transition-colors">
      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Formule Découverte · Gratuite sans engagement</span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-950 dark:text-white tracking-tight">
            Lancez votre vitrine en 1 minute
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 max-w-md mx-auto">
            Remplissez ces quelques informations. Votre catalogue WhatsApp sera disponible instantanément.
          </p>
        </div>

        {/* ==================================================== */}
        {/* INDICATEUR D'ÉTAPE ET PROGRESSION                   */}
        {/* ==================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <stepStatus.icon className={`w-4 h-4 shrink-0 ${stepStatus.color}`} />
              <div className="min-w-0">
                <span className="text-xs font-semibold text-ink-900 dark:text-white block truncate">
                  {stepStatus.label}
                </span>
                <span className="text-[11px] text-ink-500 dark:text-ink-400 block truncate">
                  {stepStatus.detail}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-ink-500 dark:text-ink-400 shrink-0 ml-3">
              {progress}%
            </span>
          </div>

          {/* Track */}
          <div className="w-full h-1.5 rounded-full bg-warm-100 dark:bg-ink-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* ==================================================== */}
        {/* APERÇU EN DIRECT DE LA VITRINE                       */}
        {/* ==================================================== */}
        <div className="mb-6 p-4 rounded-xl bg-warm-50 dark:bg-ink-900/60 border border-ink-200 dark:border-ink-800">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400 flex items-center gap-1.5">
              <StoreIcon className="w-3.5 h-3.5 text-emerald-600" />
              Aperçu en direct
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
              Formule Découverte · 8 articles
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white font-display font-semibold text-base flex items-center justify-center shrink-0">
              {storeName.trim() ? storeName.trim().charAt(0).toUpperCase() : 'V'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-semibold text-sm text-ink-950 dark:text-white truncate">
                {storeName.trim() || 'Nom de votre commerce'}
              </h2>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 truncate">
                {city} {quarter.trim() ? `• ${quarter.trim()}` : ''} · Commandes directes WhatsApp
              </p>
              <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                /boutique/{previewSlug || 'identifiant'}
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* FORMULAIRE                                           */}
        {/* ==================================================== */}
        <div className="bg-white dark:bg-ink-900 rounded-3xl border border-ink-100 dark:border-ink-800 shadow-elevated p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Nom de la boutique */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="store-name" className="text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider">
                  Nom officiel de votre commerce *
                </label>
                {isNameValid && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="w-3 h-3" /> Parfait
                  </motion.span>
                )}
              </div>
              <div className="relative">
                <StoreIcon className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="store-name"
                  type="text"
                  required
                  placeholder="Ex: Douala Kicks, Glamour Beauté, Chez Mama..."
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 transition-colors"
                />
              </div>
            </div>

            {/* 2. Numéro WhatsApp */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="store-whatsapp" className="text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider">
                  Numéro WhatsApp pour recevoir vos commandes *
                </label>
                {isPhoneValid && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="w-3 h-3" /> Numéro valide
                  </motion.span>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="store-whatsapp"
                  type="tel"
                  required
                  placeholder="Ex: 699123456 ou 237699123456"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 transition-colors"
                />
              </div>
              <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">
                Vos clients cliqueront dessus pour vous envoyer directement leur panier de commande WhatsApp.
              </p>
            </div>

            {/* 3. Ville & Quartier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="store-city" className="block text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider mb-1.5">
                  Ville *
                </label>
                <select
                  id="store-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs text-ink-900 dark:text-white focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 cursor-pointer transition-colors"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c} className="dark:bg-ink-900">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="store-quarter" className="block text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider mb-1.5">
                  Quartier (optionnel)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="store-quarter"
                    type="text"
                    placeholder="Ex: Akwa, Mokolo, Deido..."
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* 4. Préférence de contact (WhatsApp ou Email) */}
            <div className="pt-3 border-t border-ink-100 dark:border-ink-800">
              <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider mb-1">
                Comment préférez-vous être contacté ? *
              </label>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 mb-3">
                Pour l'assistance technique, les conseils gratuits et vos futures options Pro :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setContactPreference('whatsapp')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    contactPreference === 'whatsapp'
                      ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-ink-200 dark:border-ink-700 hover:border-ink-300 bg-white dark:bg-ink-900'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    contactPreference === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-warm-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300'
                  }`}>
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-ink-950 dark:text-white block">Par WhatsApp</span>
                    <span className="text-[10px] text-ink-500 dark:text-ink-400">Direct et immédiat</span>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setContactPreference('email')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    contactPreference === 'email'
                      ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/30 ring-2 ring-brand-600/20 shadow-xs'
                      : 'border-ink-200 dark:border-ink-700 hover:border-ink-300 bg-white dark:bg-ink-900'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    contactPreference === 'email' ? 'bg-brand-600 text-white' : 'bg-warm-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300'
                  }`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-ink-950 dark:text-white block">Par Email</span>
                    <span className="text-[10px] text-ink-500 dark:text-ink-400">Courrier électronique</span>
                  </div>
                </motion.button>
              </div>

              {/* Champ Email animé */}
              <AnimatePresence>
                {contactPreference === 'email' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 overflow-hidden"
                  >
                    <label htmlFor="contact-email" className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                      Votre adresse email de contact *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="contact-email"
                        type="email"
                        required
                        placeholder="votre-boutique@gmail.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 5. Code PIN Secret */}
            <div className="pt-3 border-t border-ink-100 dark:border-ink-800">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider">
                  Votre code PIN secret *
                </label>
                {isPinMatch && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="w-3 h-3" /> Codes conformes
                  </motion.span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 mb-3">
                Un code à 4 chiffres (ex: 1234) pour accéder à votre espace marchand sur votre téléphone.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      required
                      maxLength={12}
                      placeholder="Code PIN (4 chiffres)"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      required
                      maxLength={12}
                      placeholder="Confirmez le code PIN"
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Choix de la formule */}
            <div className="pt-3 border-t border-ink-100 dark:border-ink-800">
              <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider mb-1">
                Choisissez votre formule de départ
              </label>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 mb-3">
                Commencez gratuitement ou optez pour une formule avec plus de capacité.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Découverte */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('decouverte')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    selectedPlan === 'decouverte'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                      : 'border-ink-200 dark:border-ink-800 hover:border-ink-300 dark:hover:border-ink-700 bg-warm-50/30 dark:bg-ink-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-ink-950 dark:text-white">Découverte</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                      0 FCFA
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">8 articles</p>
                  <p className="text-[10px] text-ink-500 dark:text-ink-400 mt-1">Catalogue WhatsApp gratuit à vie</p>
                </button>

                {/* Pro */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    selectedPlan === 'pro'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                      : 'border-ink-200 dark:border-ink-800 hover:border-ink-300 dark:hover:border-ink-700 bg-warm-50/30 dark:bg-ink-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-ink-950 dark:text-white">Plan Pro</span>
                    {isPromoValid ? (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <span className="line-through text-ink-400 mr-1">8 000</span>
                        5 000 FCFA
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-ink-700 dark:text-ink-300">
                        8 000 FCFA/an
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">30 articles</p>
                  <p className="text-[10px] text-ink-500 dark:text-ink-400 mt-1">Boutiques en croissance</p>
                </button>

                {/* Premium */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('premium')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    selectedPlan === 'premium'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                      : 'border-ink-200 dark:border-ink-800 hover:border-ink-300 dark:hover:border-ink-700 bg-warm-50/30 dark:bg-ink-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-ink-950 dark:text-white">Premium</span>
                    {isPromoValid ? (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <span className="line-through text-ink-400 mr-1">20 000</span>
                        14 000 FCFA
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-ink-700 dark:text-ink-300">
                        20 000 FCFA/an
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Articles illimités</p>
                  <p className="text-[10px] text-ink-500 dark:text-ink-400 mt-1">Grands catalogues</p>
                </button>
              </div>
            </div>

            {/* 7. Code promo (optionnel) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="promo-code" className="text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider">
                  Code promo ou invitation (optionnel)
                </label>
                {isPromoValid && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3" /> -3 000 FCFA sur Pro / -6 000 FCFA sur Premium
                  </span>
                )}
              </div>
              <div className="relative">
                <Tag className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="promo-code"
                  type="text"
                  placeholder="Ex: VIP237 ou PROMO10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-xs font-mono uppercase text-ink-900 dark:text-white placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 dark:bg-ink-950 transition-colors"
                />
              </div>
            </div>

            {/* Bouton de soumission */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création de votre vitrine en cours...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedPlan === 'decouverte'
                        ? 'Créer ma vitrine (8 articles gratuits)'
                        : selectedPlan === 'pro'
                        ? `Créer ma vitrine · Plan Pro (${proPrice.toLocaleString('fr-FR')} FCFA/an)`
                        : `Créer ma vitrine · Plan Premium (${premiumPrice.toLocaleString('fr-FR')} FCFA/an)`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Réassurance */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-ink-500 dark:text-ink-400 pt-1">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sans carte bancaire
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <StoreIcon className="w-3.5 h-3.5 text-emerald-600" /> 8 articles inclus
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Commandes WhatsApp
              </span>
            </div>

            {/* Lien connexion si déjà inscrit */}
            <div className="text-center pt-2 border-t border-ink-100 dark:border-ink-800">
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Vous avez déjà une boutique enregistrée ?{' '}
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="font-semibold text-brand-700 dark:text-brand-400 hover:underline underline-offset-2 cursor-pointer"
                >
                  Se connecter à l'espace marchand
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
