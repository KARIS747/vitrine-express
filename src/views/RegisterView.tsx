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
  Flame,
  HeartHandshake,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  PartyPopper,
  Phone,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Zap,
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

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStore, setCreatedStore] = useState<Store | null>(null);
  const [createdPin, setCreatedPin] = useState('');
  const [isCopied, setIsCopied] = useState(false);

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
  const { progress, cheerMessage } = useMemo(() => {
    let score = 0;
    if (isNameValid) score += 25;
    if (isPhoneValid) score += 25;
    if (isEmailValid) score += 20;
    if (isPinMatch) score += 30;

    let cheer = {
      text: '👋 Bienvenue ! Donnez un nom à votre boutique pour commencer.',
      icon: Sparkles,
      color: 'text-brand-700 dark:text-brand-400',
    };

    if (score === 25) {
      cheer = {
        text: '✨ Magnifique nom ! Vos clients vont vite vous repérer.',
        icon: Flame,
        color: 'text-amber-600 dark:text-amber-400',
      };
    } else if (score === 50) {
      cheer = {
        text: '📲 Super ! Vos futures commandes WhatsApp arriveront ici.',
        icon: MessageCircle,
        color: 'text-emerald-600 dark:text-emerald-400',
      };
    } else if (score === 70) {
      cheer = {
        text: '💪 Tu y es presque, courage ! Plus qu’un petit code secret.',
        icon: Zap,
        color: 'text-indigo-600 dark:text-indigo-400',
      };
    } else if (score === 100) {
      cheer = {
        text: '🎉 Tout est parfait ! Votre vitrine gratuite est prête à ouvrir.',
        icon: PartyPopper,
        color: 'text-emerald-600 dark:text-emerald-400',
      };
    }

    return { progress: score, cheerMessage: cheer };
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
      });

      if (!res.success || !res.store) {
        toast.error(res.error || 'Erreur lors de la création de la boutique.');
        return;
      }

      toast.success('Félicitations ! Votre vitrine est prête ! 🎉');
      setCreatedStore(res.store);
      setCreatedPin(pinCode.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyStoreUrl = () => {
    if (!createdStore) return;
    const url = `${window.location.origin}/boutique/${encodeURIComponent(createdStore.slug)}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      toast.success('Lien copié dans le presse-papier !');
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  // ==========================================================
  // ÉCRAN DE CÉLÉBRATION (Boutique créée avec succès)
  // ==========================================================
  if (createdStore) {
    const fullStoreUrl = `${window.location.origin}/boutique/${encodeURIComponent(createdStore.slug)}`;
    const shareText = `Découvrez ma vitrine en ligne sur VitrineExpress : ${fullStoreUrl}`;
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-warm-50 dark:bg-ink-950 py-10 px-4 sm:px-6 flex items-center justify-center transition-colors">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, type: 'spring' }}
          className="w-full max-w-lg bg-white dark:bg-ink-900 rounded-3xl border border-ink-100 dark:border-ink-800 shadow-elevated p-6 sm:p-8 text-center relative overflow-hidden"
        >
          {/* Confetti background accent */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Celebratory Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/25"
          >
            <PartyPopper className="w-10 h-10 animate-bounce" />
          </motion.div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Plan Découverte Activé (8 produits)
          </span>

          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink-950 dark:text-white mt-1">
            Félicitations ! 🎉
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 max-w-md mx-auto">
            Votre vitrine <strong className="text-ink-900 dark:text-white">{createdStore.name}</strong> est officiellement née et accessible au public !
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
            <div>
              <p className="font-semibold">Code secret pour administrer vos articles :</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Code PIN : <strong className="font-mono text-sm text-ink-950 dark:text-white">{createdPin}</strong> · Conservez-le précieusement.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSuccess(createdStore)}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Ajouter mes 8 premiers articles</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <button
              onClick={() => onOpenStore(createdStore.slug)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 hover:bg-warm-100 dark:hover:bg-ink-800 text-ink-800 dark:text-ink-200 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Voir ma vitrine comme un client</span>
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
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-3 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Plan Découverte · 100% Gratuit à vie</span>
          </motion.div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-950 dark:text-white tracking-tight">
            Lancez votre vitrine en 1 minute
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 max-w-md mx-auto">
            Remplissez ces quelques informations. Votre catalogue WhatsApp sera disponible instantanément.
          </p>
        </div>

        {/* ==================================================== */}
        {/* BARRE D'ENCOURAGEMENT & DE PROGRESSION DYNAMIQUE     */}
        {/* ==================================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-2xl bg-white dark:bg-ink-900 border border-ink-150 dark:border-ink-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <cheerMessage.icon className={`w-4 h-4 ${cheerMessage.color}`} />
              <span className={`text-xs font-bold ${cheerMessage.color}`}>
                {cheerMessage.text}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-ink-500 dark:text-ink-400">
              {progress}%
            </span>
          </div>

          {/* Track */}
          <div className="w-full h-2 rounded-full bg-warm-100 dark:bg-ink-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-brand-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* ==================================================== */}
        {/* APERÇU EN TEMPS RÉEL DE LA VITRINE                   */}
        {/* ==================================================== */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 dark:from-emerald-950/20 via-brand-50/50 dark:via-brand-950/20 to-warm-50 dark:to-ink-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Aperçu en direct de votre vitrine
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              8 produits inclus
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-700 text-white font-display font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
              {storeName.trim() ? storeName.trim().charAt(0).toUpperCase() : 'V'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-sm text-ink-950 dark:text-white truncate">
                {storeName.trim() || 'Le Nom de Votre Boutique'}
              </h2>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 truncate">
                {city} {quarter.trim() ? `• ${quarter.trim()}` : ''} · Panier WhatsApp actif
              </p>
              <p className="text-[10px] font-mono text-brand-700 dark:text-brand-300 truncate">
                /boutique/{previewSlug || 'votre-boutique'}
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

            {/* Bouton de soumission */}
            <div className="pt-4">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={!isSubmitting ? { scale: 1.01 } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                className={`w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-white font-semibold text-sm shadow-md transition-all cursor-pointer ${
                  progress === 100
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:opacity-50 disabled:cursor-wait`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création de votre vitrine en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Ouvrir ma boutique gratuite (8 produits)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>

            {/* Réassurance */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-ink-500 dark:text-ink-400 pt-1">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Gratuit
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Prêt en 30 secondes
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
