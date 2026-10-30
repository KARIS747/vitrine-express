import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store } from '../types';
import { generateQRCodeDataUrl } from '../utils/qrCode';
import { useLanguage } from '../utils/i18n';
import { X, Printer, Sparkles, MapPin, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QRPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
}

export const QRPosterModal: React.FC<QRPosterModalProps> = ({
  isOpen,
  onClose,
  store
}) => {
  const { t, language } = useLanguage();
  const [qrImageUrl, setQrImageUrl] = useState('');
  const storeUrl = `${window.location.origin}/boutique/${store.slug}`;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setQrImageUrl('');

    generateQRCodeDataUrl(storeUrl)
      .then((dataUrl) => {
        if (!cancelled) setQrImageUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) toast.error(language === 'fr' ? 'Impossible de générer le QR code' : 'Could not generate the QR code');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, storeUrl, language]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success(language === 'fr' ? 'Lien de la vitrine copié dans le presse-papier' : 'Store link copied to clipboard');
    } catch {
      toast.error(language === 'fr' ? 'Impossible de copier le lien' : 'Could not copy the link');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/70 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-elevated border border-ink-100 overflow-hidden z-10 my-auto"
        >
          {/* Header Action Bar */}
          <div className="flex items-center justify-between p-4 border-b border-ink-100 bg-warm-50 print:hidden">
            <span className="text-xs font-bold text-ink-900 uppercase tracking-wider">
              {t.storefront.qrModalTitle}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ink-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t.storefront.printPoster}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-ink-500 hover:text-ink-950 hover:bg-warm-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Poster Area */}
          <div id="printable-poster" className="p-6 sm:p-8 text-center bg-white flex flex-col items-center">
            {/* Store Logo & Branding */}
            <div className="w-16 h-16 rounded-2xl p-1 bg-white border border-ink-200 shadow-sm overflow-hidden mb-3">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center font-display font-bold text-2xl">
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="font-display font-bold text-2xl text-ink-950 tracking-tight">
              {store.name}
            </h2>

            <div className="inline-flex items-center gap-1 text-xs text-ink-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>{store.city} {store.quarter ? `• ${store.quarter}` : ''}</span>
            </div>

            {/* QR Code Container */}
            <div className="my-6 p-4 rounded-3xl bg-warm-50 border-2 border-dashed border-ink-200/90 flex flex-col items-center">
              <div className="w-[224px] h-[224px] p-3 bg-white rounded-2xl shadow-subtle border border-ink-100 flex items-center justify-center">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt={`QR Code ${store.name}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Loader2 className="w-6 h-6 text-ink-400 animate-spin" />
                )}
              </div>

              <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-ink-900">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>
                  {language === 'fr' ? "Scannez avec l'appareil photo" : 'Scan with your camera'}
                </span>
              </div>
              <p className="text-[11px] text-ink-500 max-w-xs mt-0.5">
                {t.storefront.qrModalDesc}
              </p>
            </div>

            {/* Bottom info */}
            <div className="w-full pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
              <span>WhatsApp : <strong>+{store.whatsapp_number}</strong></span>
              <span className="font-medium text-brand-700">{t.storefront.verifiedStore}</span>
            </div>
          </div>

          {/* Action Row (hidden during print) */}
          <div className="p-4 bg-warm-50 border-t border-ink-100 flex items-center justify-between gap-2 print:hidden">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl border border-ink-200 bg-white hover:bg-warm-100 text-ink-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-ink-600" />
              <span>{language === 'fr' ? 'Copier le lien public' : 'Copy public link'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.storefront.printPoster}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
