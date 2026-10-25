import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store } from '../types';
import { StoreSettingsPayload } from '../services/db';
import { compressStoreImage } from '../utils/imageCompression';
import {
  X,
  Upload,
  Image as ImageIcon,
  Palette,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Loader2,
  Trash2,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  onSave: (settings: StoreSettingsPayload) => Promise<boolean>;
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  isOpen,
  onClose,
  store,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [phoneCall, setPhoneCall] = useState('');
  const [city, setCity] = useState('');
  const [quarter, setQuarter] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [themePrimary, setThemePrimary] = useState('#059669');
  const [themeAccent, setThemeAccent] = useState('#F59E0B');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState<'logo' | 'banner' | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(store.name ?? '');
    setTagline(store.tagline ?? '');
    setDescription(store.description ?? '');
    setWhatsappNumber(store.whatsapp_number ?? '');
    setPhoneCall(store.phone_call ?? '');
    setCity(store.city ?? '');
    setQuarter(store.quarter ?? '');
    setAddressNotes(store.address_notes ?? '');
    setLogoUrl(store.logo_url ?? '');
    setBannerUrl(store.banner_url ?? '');
    setThemePrimary(store.theme_primary || '#059669');
    setThemeAccent(store.theme_accent || '#F59E0B');
  }, [isOpen, store]);

  if (!isOpen) return null;

  const handleImageFile = async (kind: 'logo' | 'banner', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir un fichier image');
      return;
    }

    try {
      setIsCompressing(kind);
      const result = await compressStoreImage(file, kind);
      if (result.dataUrl.length > 890_000) {
        toast.error('Cette image reste trop lourde. Choisissez une image plus simple ou plus petite.');
        return;
      }
      if (kind === 'logo') {
        setLogoUrl(result.dataUrl);
      } else {
        setBannerUrl(result.dataUrl);
      }
      toast.success(`Image optimisée : ${result.originalSizeKB} Ko ➔ ${result.compressedSizeKB} Ko`);
    } catch {
      toast.error("Impossible de traiter cette image");
    } finally {
      setIsCompressing(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (name.trim().length < 2) {
      toast.error('Le nom de la boutique est obligatoire');
      return;
    }
    if (whatsappNumber.replace(/\D/g, '').length < 8) {
      toast.error('Veuillez saisir un numéro WhatsApp valide');
      return;
    }
    if (!city.trim()) {
      toast.error('Veuillez indiquer votre ville');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(themePrimary) || !/^#[0-9a-fA-F]{6}$/.test(themeAccent)) {
      toast.error('Les couleurs doivent être au format hexadécimal (#RRGGBB)');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onSave({
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        whatsappNumber: whatsappNumber.trim(),
        phoneCall: phoneCall.trim(),
        city: city.trim(),
        quarter: quarter.trim(),
        addressNotes: addressNotes.trim(),
        logoUrl,
        bannerUrl,
        themePrimary,
        themeAccent,
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderImageUpload = (
    kind: 'logo' | 'banner',
    value: string,
    setValue: (value: string) => void,
    inputRef: React.RefObject<HTMLInputElement>,
    title: string,
    hint: string,
  ) => {
    const isLogo = kind === 'logo';
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink-800">{title}</p>
            <p className="text-[11px] text-ink-400 mt-0.5">{hint}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isCompressing === kind}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-[11px] font-semibold text-ink-700 hover:bg-warm-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isCompressing === kind ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {value ? 'Remplacer' : 'Choisir'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => setValue('')}
                className="p-1.5 rounded-lg text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Supprimer l'image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleImageFile(kind, event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        <div
          className={`mt-2.5 overflow-hidden border border-ink-100 bg-warm-50 flex items-center justify-center ${
            isLogo ? 'w-20 h-20 rounded-2xl' : 'w-full aspect-[3/1] rounded-xl'
          }`}
        >
          {value ? (
            <img
              src={value}
              alt={title}
              className={isLogo ? 'w-full h-full object-cover' : 'w-full h-full object-cover'}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-ink-300">
              <ImageIcon className={isLogo ? 'w-6 h-6' : 'w-7 h-7'} />
              <span className="text-[10px] font-medium">Aucune image</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-elevated border border-ink-100 overflow-hidden z-10 my-auto flex flex-col"
        >
          <div className="flex items-center justify-between p-5 border-b border-ink-100 bg-warm-50 shrink-0">
            <div>
              <h3 className="font-display font-bold text-lg text-ink-950">
                Ma boutique
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Personnalisez l'image, les informations et les couleurs de votre vitrine.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-ink-500 hover:text-ink-950 hover:bg-warm-100 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-400 uppercase tracking-wider">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Identité visuelle
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-5">
                  {renderImageUpload(
                    'logo',
                    logoUrl,
                    setLogoUrl,
                    logoInputRef,
                    'Logo / avatar',
                    'Carré, PNG ou JPG',
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                        Nom de la boutique
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={80}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        placeholder="Ex : Kamer Kicks"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                        Slogan court
                      </label>
                      <input
                        type="text"
                        value={tagline}
                        onChange={(event) => setTagline(event.target.value)}
                        maxLength={140}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        placeholder="Ex : Sneakers authentiques à Douala"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                    Description de la boutique
                  </label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={1200}
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                    placeholder="Présentez votre boutique, vos produits et votre service..."
                  />
                  <p className="text-[10px] text-ink-400 text-right mt-1">
                    {description.length}/1200
                  </p>
                </div>

                {renderImageUpload(
                  'banner',
                  bannerUrl,
                  setBannerUrl,
                  bannerInputRef,
                  'Bannière de couverture',
                  'Format paysage recommandé',
                )}
              </section>

              <section className="space-y-4 pt-4 border-t border-ink-100">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-400 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" />
                  Contact & localisation
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Numéro WhatsApp
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(event) => setWhatsappNumber(event.target.value)}
                      maxLength={20}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="237699123456"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-ink-400" />
                        Téléphone (optionnel)
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={phoneCall}
                      onChange={(event) => setPhoneCall(event.target.value)}
                      maxLength={20}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="+237 6 99 12 34 56"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      maxLength={80}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="Douala"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                      Quartier
                    </label>
                    <input
                      type="text"
                      value={quarter}
                      onChange={(event) => setQuarter(event.target.value)}
                      maxLength={80}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      placeholder="Akwa"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                    Repère / adresse (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addressNotes}
                    onChange={(event) => setAddressNotes(event.target.value)}
                    maxLength={240}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    placeholder="Ex : Immeuble Bali, en face de la pharmacie"
                  />
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t border-ink-100">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-400 uppercase tracking-wider">
                  <Palette className="w-3.5 h-3.5" />
                  Couleurs de la vitrine
                </div>

                <p className="text-[11px] text-ink-400">
                  Choisissez des couleurs assez foncées pour garder le texte blanc lisible.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                      Couleur principale
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themePrimary}
                        onChange={(event) => setThemePrimary(event.target.value)}
                        className="w-11 h-11 rounded-xl border border-ink-200 bg-white p-1 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={themePrimary}
                        onChange={(event) => setThemePrimary(event.target.value)}
                        maxLength={7}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-ink-200 text-sm font-mono uppercase outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                      Couleur d'accent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeAccent}
                        onChange={(event) => setThemeAccent(event.target.value)}
                        className="w-11 h-11 rounded-xl border border-ink-200 bg-white p-1 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={themeAccent}
                        onChange={(event) => setThemeAccent(event.target.value)}
                        maxLength={7}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-ink-200 text-sm font-mono uppercase outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-xl p-4 text-white flex items-center justify-between gap-3"
                  style={{
                    background: `linear-gradient(135deg, ${themePrimary}, ${themeAccent})`,
                  }}
                >
                  <div>
                    <p className="text-xs font-semibold opacity-80">Aperçu</p>
                    <p className="font-display font-bold text-sm">{name || store.name}</p>
                  </div>
                  <span className="text-[11px] font-semibold bg-white/20 border border-white/30 px-2.5 py-1 rounded-lg">
                    Bouton principal
                  </span>
                </div>
              </section>

              <div className="flex items-center gap-2 text-[11px] text-ink-400 bg-warm-50 border border-ink-100 rounded-xl px-3 py-2.5">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Adresse de la vitrine : <strong>/boutique/{store.slug}</strong> (inchangée)
                </span>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-ink-100 p-4 sm:px-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isCompressing !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink-950 hover:bg-black text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
