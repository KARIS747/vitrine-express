import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X, Share2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Détection si déjà installé en mode autonome (PWA / Standalone)
    const checkStandalone = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    // 2. Écoute de l'événement standard d'installation Chrome / Android / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    // 3. Détection de confirmation d'installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Détection iOS (Safari)
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos) {
        setShowIosGuide(true);
      } else {
        // Déjà installé ou navigateur desktop
        setIsDismissed(true);
      }
    }
  };

  // Ne rien afficher si l'application est déjà installée ou fermée manuellement
  if (isInstalled || isDismissed) return null;

  return (
    <>
      {/* Bouton d'installation discret & élégant (non envahissant) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.215, 0.61, 0.355, 1] }}
        className="fixed bottom-4 left-4 z-40 print:hidden"
      >
        <div className="flex items-center gap-1.5 bg-ink-950/90 text-white backdrop-blur-md px-3.5 py-2 rounded-full shadow-elevated border border-ink-800 text-xs font-semibold">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 hover:text-brand-300 transition-colors cursor-pointer select-none"
            title="Installer l'application sur votre téléphone"
          >
            <Download className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span>Installer l'appli</span>
          </button>

          <span className="text-ink-700">|</span>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-0.5 text-ink-400 hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Guide iOS rapide si Safari */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-ink-100 shadow-elevated text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-ink-950">
                Installation sur iPhone & iPad
              </h3>
              <p className="text-xs text-ink-600 mt-2 leading-relaxed">
                1. Appuyez sur le bouton <strong>Partager</strong>{' '}
                <Share2 className="w-3.5 h-3.5 inline text-ink-500 -mt-0.5" /> en bas de Safari.<br />
                2. Faites défiler et sélectionnez <strong>« Sur l'écran d'accueil »</strong>.
              </p>
              <button
                onClick={() => setShowIosGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-ink-950 text-white text-xs font-semibold cursor-pointer"
              >
                Compris !
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
