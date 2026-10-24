import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store } from '../types';
import { X, Printer, Download, Sparkles, MapPin, Share2 } from 'lucide-react';
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
  if (!isOpen) return null;

  const storeUrl = `${window.location.origin}?store=${store.slug}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=1&color=14-19-24&data=${encodeURIComponent(storeUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Lien de la vitrine copié dans le presse-papier !");
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
              Affiche Comptoir & QR Code
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ink-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-ink-500 hover:text-ink-950 hover:bg-warm-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Poster Area (formatted for shop counter / door / packaging) */}
          <div id="printable-poster" className="p-6 sm:p-8 text-center bg-white flex flex-col items-center">
            {/* Store Logo & Branding */}
            <div className="w-16 h-16 rounded-2xl p-1 bg-white border border-ink-200 shadow-sm overflow-hidden mb-3">
              <img
                src={store.logo_url || 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80'}
                alt={store.name}
                className="w-full h-full object-cover rounded-xl"
              />
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
              <div className="p-3 bg-white rounded-2xl shadow-subtle border border-ink-100">
                <img
                  src={qrImageUrl}
                  alt={`QR Code ${store.name}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>

              <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-ink-900">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Scannez avec l'appareil photo</span>
              </div>
              <p className="text-[11px] text-ink-500 max-w-xs mt-0.5">
                Consultez nos articles en stock, arrivages et commandez en 1 clic sur WhatsApp !
              </p>
            </div>

            {/* Bottom info */}
            <div className="w-full pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
              <span>WhatsApp : <strong>+{store.whatsapp_number}</strong></span>
              <span className="font-medium text-brand-700">Vitrine vérifiée</span>
            </div>
          </div>

          {/* Action Row (hidden during print) */}
          <div className="p-4 bg-warm-50 border-t border-ink-100 flex items-center justify-between gap-2 print:hidden">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl border border-ink-200 bg-white hover:bg-warm-100 text-ink-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-ink-600" />
              <span>Copier le lien public</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer l'affiche</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
