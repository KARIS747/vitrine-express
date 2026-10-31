import React from 'react';
import { Home, Compass, Store, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface NotFoundViewProps {
  onGoHome: () => void;
  onGoMerchant: () => void;
  attemptedPath?: string;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onGoHome,
  onGoMerchant,
  attemptedPath,
}) => {
  const { language } = useLanguage();

  return (
    <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
      <div className="max-w-md w-full bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-3xl p-6 sm:p-8 shadow-elevated text-center">
        {/* Visual 404 Badge */}
        <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-brand-500/10 dark:bg-brand-500/20 rounded-full animate-pulse" />
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-full shadow-sm">
            404
          </span>
        </div>

        <h1 className="font-display font-bold text-2xl text-ink-950 dark:text-white mb-2">
          {language === 'fr' ? 'Page introuvable' : 'Page Not Found'}
        </h1>

        <p className="text-sm text-ink-500 dark:text-ink-400 mb-6 leading-relaxed">
          {attemptedPath ? (
            <>
              {language === 'fr'
                ? `L'adresse `
                : `The URL `}
              <code className="text-xs font-mono bg-warm-100 dark:bg-ink-800 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded">
                {attemptedPath}
              </code>
              {language === 'fr'
                ? ` n'existe pas ou la boutique a été déplacée.`
                : ` does not exist or the store has been moved.`}
            </>
          ) : (
            language === 'fr'
              ? "Le contenu que vous recherchez semble introuvable ou a été désactivé."
              : "The content you are looking for does not exist or was disabled."
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={onGoHome}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-soft transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {language === 'fr' ? "Retour à l'accueil" : 'Go to Homepage'}
          </button>
          <button
            onClick={onGoMerchant}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-ink-200 dark:border-ink-700 hover:bg-warm-100 dark:hover:bg-ink-800 text-ink-800 dark:text-ink-200 font-semibold text-xs transition cursor-pointer"
          >
            <Store className="w-4 h-4" />
            {language === 'fr' ? 'Espace Gérant' : 'Merchant Space'}
          </button>
        </div>

        {/* Quick Suggestion */}
        <div className="pt-4 border-t border-ink-100 dark:border-ink-800 flex items-center justify-center gap-2 text-xs text-ink-400">
          <Compass className="w-3.5 h-3.5" />
          <span>
            {language === 'fr'
              ? 'Découvrez nos vitrines WhatsApp actives depuis l’accueil'
              : 'Discover active WhatsApp storefronts from home'}
          </span>
        </div>
      </div>
    </main>
  );
};
