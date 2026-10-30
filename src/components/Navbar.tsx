import React from 'react';
import { ViewMode } from '../types';
import { Store as StoreIcon, Search, ShieldCheck, UserRound, Home } from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavbarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange,
}) => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-ink-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 text-left cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-brand-800 transition-colors">
            <StoreIcon className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="font-display font-bold text-ink-950 text-sm tracking-tight leading-none block">
              VitrineExpress
            </span>
            <span className="text-[10px] text-ink-500 font-medium leading-none">
              {t.nav.subTitle}
            </span>
          </div>
        </button>

        {currentView === 'storefront' && (
          <div className="flex-1 max-w-xs relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder={t.nav.searchPlaceholder}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-ink-400 bg-warm-50/70"
            />
          </div>
        )}

        <nav className="flex items-center gap-2">
          {/* Language Switcher */}
          <LanguageSwitcher variant="navbar" />

          {currentView === 'admin' && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.nav.admin}
            </span>
          )}

          <button
            onClick={() => onNavigate('landing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentView === 'landing'
                ? 'bg-ink-900 text-white'
                : 'text-ink-600 hover:text-ink-950 hover:bg-warm-100'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.nav.home}</span>
          </button>

          <button
            onClick={() => onNavigate('merchant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentView === 'merchant'
                ? 'bg-ink-900 text-white'
                : 'text-ink-600 hover:text-ink-950 hover:bg-warm-100'
            }`}
          >
            <UserRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {currentView === 'landing' ? t.nav.login : t.nav.merchantSpace}
            </span>
            <span className="sm:hidden">
              {currentView === 'landing' ? t.nav.login : t.nav.merchantSpace}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
