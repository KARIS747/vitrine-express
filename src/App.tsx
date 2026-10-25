import React, { useCallback, useEffect, useState } from 'react';
import { Store, Category, Product, ViewMode } from './types';
import { dbService, MerchantSession } from './services/db';
import { Navbar } from './components/Navbar';
import { LandingView } from './views/LandingView';
import { StorefrontView } from './views/StorefrontView';
import { MerchantDashboardView } from './views/MerchantDashboardView';
import { MerchantLoginView } from './views/MerchantLoginView';
import { LicenseManagerView } from './views/LicenseManagerView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { Toaster, toast } from 'sonner';
import { AlertCircle, Home, RefreshCw, Store as StoreIcon } from 'lucide-react';

interface StoreData {
  store: Store;
  categories: Category[];
  products: Product[];
}

function viewFromPath(): ViewMode {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin') return 'admin';
  if (path === '/merchant' || path.startsWith('/merchant/')) return 'merchant';
  if (path.startsWith('/boutique/')) return 'storefront';
  if (path === '/' && new URLSearchParams(window.location.search).get('store')) {
    return 'storefront';
  }
  return 'landing';
}

function slugFromLocation(): string | null {
  const match = window.location.pathname.match(/^\/boutique\/([^/]+)\/?$/);
  if (match) return decodeURIComponent(match[1]);
  return new URLSearchParams(window.location.search).get('store');
}

function storePath(slug: string): string {
  return `/boutique/${encodeURIComponent(slug)}`;
}

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(() => viewFromPath());
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(() => viewFromPath() === 'storefront');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publicStores, setPublicStores] = useState<Store[]>([]);
  const [isStoresLoading, setIsStoresLoading] = useState(() => viewFromPath() === 'landing');

  const [merchantSession, setMerchantSession] = useState<MerchantSession | null>(
    () => dbService.getMerchantSession(),
  );
  const [merchantData, setMerchantData] = useState<StoreData | null>(null);
  const [isMerchantLoading, setIsMerchantLoading] = useState(false);

  const loadLandingStores = useCallback(async () => {
    setIsStoresLoading(true);
    try {
      setPublicStores(await dbService.getAllStores());
    } finally {
      setIsStoresLoading(false);
    }
  }, []);

  const loadPublicStore = useCallback(async (targetSlug?: string) => {
    const requestedSlug = targetSlug || slugFromLocation();

    if (!requestedSlug) {
      setActiveStore(null);
      setLoadError(null);
      setCurrentView('landing');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await dbService.getStoreBySlug(requestedSlug);

      if (!data) {
        setActiveStore(null);
        setLoadError("Cette vitrine est introuvable, suspendue ou sa licence a expiré.");
        return;
      }

      setActiveStore(data.store);
      setCategories(data.categories);
      setProducts(data.products);

      if (viewFromPath() === 'storefront') {
        window.history.replaceState({}, '', storePath(data.store.slug));
      }
    } catch (error) {
      console.error(error);
      setActiveStore(null);
      setLoadError("Impossible de charger la vitrine. Vérifiez votre connexion puis réessayez.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMerchantData = useCallback(async (): Promise<StoreData | null> => {
    const session = dbService.getMerchantSession();
    setMerchantSession(session);

    if (!session) {
      setMerchantData(null);
      return null;
    }

    setIsMerchantLoading(true);
    try {
      const data = await dbService.getStoreBySlug(session.storeSlug);
      if (!data) {
        dbService.clearMerchantSession();
        setMerchantSession(null);
        setMerchantData(null);
        toast.error("Votre session a expiré. Reconnectez-vous.");
        return null;
      }
      setMerchantData(data);
      return data;
    } finally {
      setIsMerchantLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialView = viewFromPath();
    if (initialView === 'storefront') {
      void loadPublicStore();
    } else if (initialView === 'landing') {
      void loadLandingStores();
    }

    const session = dbService.getMerchantSession();
    if (session) void loadMerchantData();
  }, [loadLandingStores, loadMerchantData, loadPublicStore]);

  useEffect(() => {
    const onPopState = () => {
      const nextView = viewFromPath();
      setCurrentView(nextView);
      setSearchQuery('');

      if (nextView === 'merchant') {
        void loadMerchantData();
      } else if (nextView === 'storefront') {
        void loadPublicStore();
      } else if (nextView === 'landing') {
        setLoadError(null);
        void loadLandingStores();
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadLandingStores, loadMerchantData, loadPublicStore]);

  const navigate = (view: ViewMode) => {
    setSearchQuery('');

    if (view === 'landing') {
      setCurrentView('landing');
      setLoadError(null);
      window.history.pushState({}, '', '/');
      void loadLandingStores();
      return;
    }

    if (view === 'storefront') {
      const slug = activeStore?.slug;
      if (slug) {
        setCurrentView('storefront');
        window.history.pushState({}, '', storePath(slug));
      } else {
        setCurrentView('landing');
        setLoadError(null);
        window.history.pushState({}, '', '/');
        void loadLandingStores();
      }
      return;
    }

    if (view === 'merchant') {
      setCurrentView('merchant');
      window.history.pushState({}, '', '/merchant');
      if (merchantSession) void loadMerchantData();
      return;
    }

    if (view === 'admin') {
      setCurrentView('admin');
      window.history.pushState({}, '', '/admin');
    }
  };

  const openStoreBySlug = useCallback(async (slug: string): Promise<boolean> => {
    try {
      const data = await dbService.getStoreBySlug(slug);
      if (!data) return false;

      setActiveStore(data.store);
      setCategories(data.categories);
      setProducts(data.products);
      setSearchQuery('');
      setLoadError(null);
      setCurrentView('storefront');
      window.history.pushState({}, '', storePath(data.store.slug));
      window.scrollTo(0, 0);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleSelectStore = (store: Store) => {
    void openStoreBySlug(store.slug).then((opened) => {
      if (!opened) {
        toast.error("Cette boutique n'est pas accessible publiquement.");
      }
    });
  };

  const handleMerchantLogin = async (store: Store) => {
    const data = await dbService.getStoreBySlug(store.slug);
    if (!data) {
      toast.error("Impossible de charger votre espace. Contactez Karis.");
      return;
    }

    setMerchantSession(dbService.getMerchantSession());
    setMerchantData(data);
    setActiveStore(data.store);
    setCategories(data.categories);
    setProducts(data.products);
    setCurrentView('merchant');
    window.history.pushState({}, '', '/merchant');
    toast.success(`Bienvenue dans l'espace de ${data.store.name} !`);
  };

  const handleMerchantLogout = () => {
    dbService.clearMerchantSession();
    setMerchantSession(null);
    setMerchantData(null);
    setSearchQuery('');
    setCurrentView('landing');
    window.history.pushState({}, '', '/');
    void loadLandingStores();
  };

  const refreshMerchant = async () => {
    const data = await loadMerchantData();
    if (data) {
      setActiveStore(data.store);
      setCategories(data.categories);
      setProducts(data.products);
    }
  };

  if (currentView === 'storefront' && isLoading) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-[3px] border-ink-200 border-t-brand-600 rounded-full animate-spin mb-3" />
        <span className="font-display font-medium text-sm text-ink-700">
          Chargement de la vitrine...
        </span>
      </div>
    );
  }

  if (currentView === 'storefront' && (loadError || !activeStore)) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-4">
        <Toaster position="top-right" richColors />
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-ink-100 shadow-elevated text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="font-display font-bold text-xl text-ink-950">
            Vitrine indisponible
          </h1>
          <p className="text-sm text-ink-500 mt-2 leading-relaxed">
            {loadError ?? "Cette boutique n'est pas accessible pour le moment."}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => navigate('landing')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink-950 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              Retour à l'accueil
            </button>
            <button
              onClick={() => void loadPublicStore()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-xs font-semibold hover:bg-warm-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
          <button
            onClick={() => navigate('merchant')}
            className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-950 transition-colors cursor-pointer"
          >
            <StoreIcon className="w-3.5 h-3.5" />
            Espace gérant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col font-sans">
      <Toaster position="top-right" richColors />

      <Navbar
        currentView={currentView}
        onNavigate={navigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {currentView === 'landing' && (
        <LandingView
          stores={publicStores}
          isLoadingStores={isStoresLoading}
          onOpenStoreBySlug={openStoreBySlug}
          onMerchantLogin={() => navigate('merchant')}
          onAdmin={() => navigate('admin')}
        />
      )}

      {currentView === 'storefront' && activeStore && (
        <StorefrontView
          store={activeStore}
          categories={categories}
          products={products}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {currentView === 'merchant' && (
        merchantSession ? (
          merchantData ? (
            <MerchantDashboardView
              store={merchantData.store}
              categories={merchantData.categories}
              products={merchantData.products}
              onRefresh={refreshMerchant}
              onPreviewStorefront={() => navigate('storefront')}
              onLogout={handleMerchantLogout}
            />
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
              <div className="w-8 h-8 border-[3px] border-ink-200 border-t-brand-600 rounded-full animate-spin mb-3" />
              <span className="text-xs text-ink-500">
                {isMerchantLoading ? 'Chargement de votre espace...' : 'Session introuvable'}
              </span>
            </div>
          )
        ) : (
          <MerchantLoginView
            onLoginSuccess={handleMerchantLogin}
            onBack={() => navigate('landing')}
          />
        )
      )}

      {currentView === 'admin' && (
        <LicenseManagerView
          onSelectStore={handleSelectStore}
          onBackToHome={() => navigate('landing')}
        />
      )}

      {currentView === 'storefront' && <PWAInstallButton />}
    </div>
  );
};
