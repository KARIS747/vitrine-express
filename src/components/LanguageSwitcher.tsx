import React from 'react';
import { useLanguage } from '../utils/i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'footer';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'navbar', className = '' }) => {
  const { language, setLanguage } = useLanguage();

  if (variant === 'footer') {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-ink-600 ${className}`}>
        <Globe className="w-3.5 h-3.5 text-ink-400" />
        <button
          onClick={() => setLanguage('fr')}
          className={`font-semibold transition-colors px-1.5 py-0.5 rounded cursor-pointer ${
            language === 'fr'
              ? 'text-brand-700 bg-brand-50'
              : 'text-ink-400 hover:text-ink-700'
          }`}
          title="Français"
        >
          FR
        </button>
        <span className="text-ink-300">/</span>
        <button
          onClick={() => setLanguage('en')}
          className={`font-semibold transition-colors px-1.5 py-0.5 rounded cursor-pointer ${
            language === 'en'
              ? 'text-brand-700 bg-brand-50'
              : 'text-ink-400 hover:text-ink-700'
          }`}
          title="English"
        >
          EN
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center bg-warm-100/80 p-0.5 rounded-lg border border-ink-100 ${className}`}>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
          language === 'fr'
            ? 'bg-white text-ink-950 shadow-xs'
            : 'text-ink-500 hover:text-ink-800'
        }`}
        title="Passer en Français"
        aria-label="Français"
      >
        FR
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-white text-ink-950 shadow-xs'
            : 'text-ink-500 hover:text-ink-800'
        }`}
        title="Switch to English"
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
};
