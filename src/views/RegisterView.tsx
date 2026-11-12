import React, { useState } from 'react';
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
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
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

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStore, setCreatedStore] = useState<Store | null>(null);
  const [createdPin, setCreatedPin] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Slug preview computation
  const previewSlug = storeName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim() || storeName.trim().length < 2) {
      toast.error('Veuillez entrer un nom de boutique valide (au moins 2 lettres).');
      return;
    }

    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      toast.error('Numéro WhatsApp invalide (minimum 8 chiffres).');
      return;
    }

    if (contactPreference === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!contactEmail.trim() || !emailRegex.test(contactEmail.trim())) {
        toast.error('Veuillez renseigner une adresse email valide.');
        return;
      }
    }

    if (!pinCode || pinCode.length < 4) {
      toast.error('Le code PIN doit comporter au moins 4 chiffres.');
      return;
    }

    if (pinCode !== pinConfirm) {
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

      toast.success('Félicitations ! Votre boutique est prête ! 🎉');
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
      toast.success('Lien de la boutique copié !');
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  // ==========================================================
  // ÉCRAN DE SUCCÈS (Boutique créée avec succès)
  // ==========================================================
  if (createdStore) {
    const fullStoreUrl = `${window.location.origin}/boutique/${encodeURIComponent(createdStore.slug)}`;

    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-warm-50 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-ink-100 shadow-elevated p-6 sm:p-8 text-center animate-fade-in">
          {/* Confetti / Icon */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Plan Découverte Activé (8 produits)
          </span>

          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink-950 mt-1">
            Félicitations !
          </h1>
          <p className="text-sm text-ink-600 mt-2 max-w-md mx-auto">
            Votre vitrine <strong className="text-ink-900">{createdStore.name}</strong> est officiellement en ligne et prête à recevoir vos premiers articles.
          </p>

          {/* URL Box */}
          <div className="mt-6 p-4 rounded-2xl bg-warm-50 border border-ink-150 text-left">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 block mb-1">
              Votre lien public à partager sur WhatsApp :
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-brand-800 truncate flex-1 select-all">
                {fullStoreUrl}
              </span>
              <button
                type="button"
                onClick={copyStoreUrl}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-ink-200 text-ink-700 text-xs font-semibold hover:bg-warm-100 transition-colors cursor-pointer shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* Credentials Reminder */}
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-left flex items-start gap-3 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gardez votre code PIN secret :</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Code PIN : <strong className="font-mono text-sm text-ink-950">{createdPin}</strong> · Il vous permet de vous reconnecter à tout moment sur votre téléphone.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-col gap-3">
            <button
              onClick={() => onSuccess(createdStore)}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
            >
              <span>Accéder à mon espace & ajouter mes 8 produits</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenStore(createdStore.slug)}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl border border-ink-200 bg-white hover:bg-warm-100 text-ink-800 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Voir ma vitrine comme un client</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // FORMULAIRE DE CRÉATION
  // ==========================================================
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-warm-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Offre Découverte · 100% Gratuite</span>
          </div>

          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-950 tracking-tight">
            Créez votre vitrine en 1 minute
          </h1>
          <p className="text-sm text-ink-600 mt-2 max-w-md mx-auto">
            Présentez vos produits à vos clients et recevez vos commandes directement sur WhatsApp. Zéro frais caché.
          </p>
        </div>

        {/* Cadre de formule gratuite */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-brand-500/10 to-transparent border border-emerald-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-950">Plan Découverte Inclus</p>
              <p className="text-[11px] text-ink-600">
                Jusqu'à <strong>8 produits gratuits</strong> · Panier WhatsApp · Lien & QR code
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
            0 FCFA
          </span>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-3xl border border-ink-100 shadow-elevated p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Nom de la boutique */}
            <div>
              <label htmlFor="store-name" className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Nom officiel de votre boutique *
              </label>
              <div className="relative">
                <StoreIcon className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="store-name"
                  type="text"
                  required
                  placeholder="Ex: Glamour Fashion, Douala Sneakers, Chez Mama..."
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50"
                />
              </div>

              {previewSlug && (
                <p className="text-[11px] text-ink-500 mt-1.5 flex items-center gap-1">
                  <span className="text-ink-400">Votre lien sera :</span>
                  <span className="font-mono text-brand-700 font-medium">/boutique/{previewSlug}</span>
                </p>
              )}
            </div>

            {/* 2. Numéro WhatsApp */}
            <div>
              <label htmlFor="store-whatsapp" className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Numéro WhatsApp pour recevoir vos commandes *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="store-whatsapp"
                  type="tel"
                  required
                  placeholder="Ex: 699123456 ou 237699123456"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50"
                />
              </div>
              <p className="text-[11px] text-ink-400 mt-1">
                Vos clients cliqueront dessus pour vous envoyer directement leur panier de commande.
              </p>
            </div>

            {/* 3. Ville & Quartier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="store-city" className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                  Ville *
                </label>
                <select
                  id="store-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-ink-200 text-xs text-ink-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50 cursor-pointer"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="store-quarter" className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
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
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50"
                  />
                </div>
              </div>
            </div>

            {/* 4. Préférence de contact (WhatsApp ou Email) */}
            <div className="pt-2 border-t border-ink-100">
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
                Comment préférez-vous être contacté ? *
              </label>
              <p className="text-[11px] text-ink-500 mb-3">
                Pour l'assistance technique, les conseils et vos futures options de mise à niveau :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setContactPreference('whatsapp')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    contactPreference === 'whatsapp'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-ink-200 hover:border-ink-300 bg-white'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    contactPreference === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-warm-100 text-ink-600'
                  }`}>
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-ink-950 block">Par WhatsApp</span>
                    <span className="text-[10px] text-ink-500">Contact rapide et direct</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setContactPreference('email')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    contactPreference === 'email'
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/20 shadow-xs'
                      : 'border-ink-200 hover:border-ink-300 bg-white'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    contactPreference === 'email' ? 'bg-brand-600 text-white' : 'bg-warm-100 text-ink-600'
                  }`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-ink-950 block">Par Email</span>
                    <span className="text-[10px] text-ink-500">Réception par boîte mail</span>
                  </div>
                </button>
              </div>

              {/* Champ Email si préférence email choisie */}
              {contactPreference === 'email' && (
                <div className="mt-3 animate-fade-in">
                  <label htmlFor="contact-email" className="block text-xs font-medium text-ink-700 mb-1">
                    Votre adresse email *
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
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Code PIN Secret */}
            <div className="pt-2 border-t border-ink-100">
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                Choisissez un code PIN secret *
              </label>
              <p className="text-[11px] text-ink-500 mb-3">
                Ce code PIN (4 à 6 chiffres) protégera l'accès à votre espace marchand pour gérer vos stocks.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      maxLength={12}
                      placeholder="Ex: 1234"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      maxLength={12}
                      placeholder="Confirmer le code PIN"
                      value={pinConfirm}
                      onChange={(e) => setPinConfirm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 bg-warm-50/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton de soumission */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création de votre vitrine...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Créer ma boutique gratuite (8 produits)</span>
                  </>
                )}
              </button>
            </div>

            {/* Lien connexion si déjà inscrit */}
            <div className="text-center pt-2">
              <p className="text-xs text-ink-500">
                Vous avez déjà une boutique ?{' '}
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2 cursor-pointer"
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
