import React, { useState, useEffect } from 'react';
import { Store, Category, Product, ViewMode } from './types';
import { dbService } from './services/db';
import { Navbar } from './components/Navbar';
import { StorefrontView } from './views/StorefrontView';
import { MerchantDashboardView } from './views/MerchantDashboardView';
import { LicenseManagerView } from './views/LicenseManagerView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { Toaster, toast } from 'sonner';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('storefront');
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Initial load
  const loadData = async (targetSlug?: string) => {
    setIsLoading(true);
    try {
      const stores = await dbService.getAllStores();
      setAllStores(stores);

      // Check URL query parameters (ex: ?store=kamer-kicks)
      const urlParams = new URLSearchParams(window.location.search);
      const urlSlug = targetSlug || urlParams.get('store') || (stores[0]?.slug ?? 'kamer-kicks');

      const storeData = await dbService.getStoreBySlug(urlSlug);
      if (storeData) {
        setActiveStore(storeData.store);
        setCategories(storeData.categories);
        setProducts(storeData.products);
      } else if (stores.length > 0) {
        const fallback = await dbService.getStoreBySlug(stores[0].slug);
        if (fallback) {
          setActiveStore(fallback.store);
          setCategories(fallback.categories);
          setProducts(fallback.products);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectStore = async (store: Store) => {
    const data = await dbService.getStoreBySlug(store.slug);
    if (data) {
      setActiveStore(data.store);
      setCategories(data.categories);
      setProducts(data.products);
      setSearchQuery('');
      // Update URL without page reload
      window.history.pushState({}, '', `?store=${store.slug}`);
    }
  };

  const handleRefresh = async () => {
    if (activeStore) {
      await loadData(activeStore.slug);
    } else {
      await loadData();
    }
  };

  if (isLoading || !activeStore) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-ink-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
        <span className="font-display font-medium text-sm text-ink-700">
          Chargement de la vitrine...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col font-sans">
      <Toaster position="top-right" richColors />

      {/* Persistent Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        activeStore={activeStore}
        allStores={allStores}
        onSelectStore={handleSelectStore}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main View Router */}
      {currentView === 'storefront' && (
        <StorefrontView
          store={activeStore}
          categories={categories}
          products={products}
          searchQuery={searchQuery}
        />
      )}

      {currentView === 'merchant' && (
        <MerchantDashboardView
          store={activeStore}
          categories={categories}
          products={products}
          onRefresh={handleRefresh}
          onPreviewStorefront={() => setCurrentView('storefront')}
        />
      )}

      {currentView === 'admin' && (
        <LicenseManagerView
          stores={allStores}
          onRefresh={handleRefresh}
          onSelectStore={(s) => {
            handleSelectStore(s);
            setCurrentView('storefront');
          }}
        />
      )}

      {/* Bouton discret d'installation PWA */}
      <PWAInstallButton />
    </div>
  );
};
