import React from 'react';
import { Store, ViewMode } from '../types';
import { Store as StoreIcon, ShieldCheck, KeyRound, Search, Smartphone } from 'lucide-react';

interface NavbarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  activeStore: Store;
  allStores: Store[];
  onSelectStore: (store: Store) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeStore,
  allStores,
  onSelectStore,
  searchQuery,
  onSearchChange
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-ink-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand logo & switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('storefront')}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-emerald-800 transition-colors">
              <StoreIcon className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-bold text-ink-950 text-sm tracking-tight leading-none block">
                VitrineExpress
              </span>
              <span className="text-[10px] text-ink-500 font-medium leading-none">
                Boutiques Cameroun
              </span>
            </div>
          </button>

          {/* Quick Store switcher for previewing multiple shops */}
          {allStores.length > 1 && currentView === 'storefront' && (
            <div className="relative">
              <select
                value={activeStore.slug}
                onChange={(e) => {
                  const s = allStores.find(st => st.slug === e.target.value);
                  if (s) onSelectStore(s);
                }}
                className="text-xs font-semibold text-ink-800 bg-warm-100/80 hover:bg-warm-200/80 border border-ink-200/80 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer pr-6 appearance-none"
              >
                {allStores.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Live Search Bar for Storefront */}
        {currentView === 'storefront' && (
          <div className="flex-1 max-w-xs relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-ink-400 bg-warm-50/70"
            />
          </div>
        )}

        {/* Navigation tabs between views */}
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('storefront')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentView === 'storefront'
                ? 'bg-ink-900 text-white'
                : 'text-ink-600 hover:text-ink-950 hover:bg-warm-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vitrine Client</span>
            <span className="sm:hidden">Vitrine</span>
          </button>

          <button
            onClick={() => onNavigate('merchant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentView === 'merchant'
                ? 'bg-ink-900 text-white'
                : 'text-ink-600 hover:text-ink-950 hover:bg-warm-100'
            }`}
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Espace Boutiquier</span>
            <span className="sm:hidden">Gérant</span>
          </button>

          <button
            onClick={() => onNavigate('admin')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              currentView === 'admin'
                ? 'bg-amber-600 text-white'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
            title="Gestionnaire de Licences Karis"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Licences (Karis)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
