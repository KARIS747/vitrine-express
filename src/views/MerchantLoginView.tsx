import React, { useState } from 'react';
import { Store } from '../types';
import { dbService } from '../services/db';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Loader2,
  ShieldCheck,
  Store as StoreIcon,
} from 'lucide-react';

interface MerchantLoginViewProps {
  onLoginSuccess: (store: Store) => void;
  onBack: () => void;
}

export const MerchantLoginView: React.FC<MerchantLoginViewProps> = ({
  onLoginSuccess,
  onBack,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!licenseKey.trim() || !pinCode.trim()) {
      setError('Renseignez votre clé de licence et votre code PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dbService.loginMerchant(licenseKey.trim(), pinCode.trim());
      if (!result.success || !result.store) {
        setError(result.error ?? 'Identifiants invalides.');
        toast.error(result.error ?? 'Identifiants invalides.');
        return;
      }
      onLoginSuccess(result.store);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-3.5rem)] grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-ink-950 text-white p-10 xl:p-14">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-white/70">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            Espace professionnel sécurisé
          </div>
          <h1 className="font-display font-bold text-4xl xl:text-5xl leading-[1.1] tracking-tight mt-6 max-w-md">
            Votre boutique,
            <br />
            <span className="text-brand-400">toujours à jour.</span>
          </h1>
          <p className="text-sm text-white/55 leading-relaxed mt-5 max-w-sm">
            Gérez votre catalogue, vos prix et vos arrivages en quelques secondes.
            Vos clients voient immédiatement les changements sur votre vitrine.
          </p>
        </div>

        <div className="relative space-y-4 max-w-sm">
          {[
            "Un catalogue clair, pensé pour WhatsApp",
            "Les arrivages affichés avec leur date",
            "Un lien et un QR code à partager",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm text-white/70">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              </span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center bg-warm-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-950 transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </button>

          <div className="bg-white rounded-3xl border border-ink-100 shadow-elevated p-6 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center mb-5">
              <StoreIcon className="w-6 h-6" />
            </div>

            <h2 className="font-display font-bold text-2xl text-ink-950 tracking-tight">
              Espace gérant
            </h2>
            <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">
              Connectez-vous avec la clé de licence et le code PIN transmis lors de la
              création de votre boutique.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1.5">
                  Clé de licence
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(event) => setLicenseKey(event.target.value)}
                    placeholder="LIC-XXXX-XXXXXX"
                    autoCapitalize="characters"
                    autoComplete="username"
                    spellCheck={false}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-ink-200 text-sm text-ink-950 font-mono tracking-wide outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-600 uppercase tracking-wider mb-1.5">
                  Code PIN
                </label>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pinCode}
                    onChange={(event) => setPinCode(event.target.value)}
                    placeholder="••••"
                    autoComplete="current-password"
                    inputMode="numeric"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-ink-200 text-sm text-ink-950 font-mono tracking-[0.25em] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-400 hover:text-ink-700 cursor-pointer"
                    aria-label={showPin ? 'Masquer le code PIN' : 'Afficher le code PIN'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-ink-950 hover:bg-black text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Accéder à mon espace'
                )}
              </button>
            </form>

            <p className="text-[11px] text-ink-400 mt-5 leading-relaxed">
              Vos accès sont confidentiels. Si vous les avez perdus, contactez Karis
              pour les récupérer.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
