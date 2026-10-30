import React, { useEffect, useState, useMemo } from 'react';
import { Store, Category, Product } from '../types';
import { StoreHeader } from '../components/StoreHeader';
import { CategoryTabs } from '../components/CategoryTabs';
import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { QRPosterModal } from '../components/QRPosterModal';
import { CartDrawer } from '../components/CartDrawer';
import { CartItem } from '../utils/formatters';
import { useLanguage } from '../utils/i18n';
import { Search, ShoppingBag, Check, X, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface StorefrontViewProps {
  store: Store;
  categories: Category[];
  products: Product[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  store,
  categories,
  products,
  searchQuery,
  onSearchChange,
}) => {
  const { t, language } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [filterStockOnly, setFilterStockOnly] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${store.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    setSelectedCategoryId('all');
    setFilterStockOnly(false);
    try {
      const saved = localStorage.getItem(`cart_${store.id}`);
      setCartItems(saved ? JSON.parse(saved) : []);
    } catch {
      setCartItems([]);
    }
  }, [store.id]);

  // Persist cart per store
  useEffect(() => {
    try {
      localStorage.setItem(`cart_${store.id}`, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems, store.id]);

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        toast.info(language === 'fr' ? `Quantité augmentée pour ${product.name}` : `Increased quantity for ${product.name}`);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      toast.success(language === 'fr' ? `${product.name} ajouté au panier` : `${product.name} added to cart`);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalCartCount = cartItems.reduce((acc, it) => acc + it.quantity, 0);

  // Filter products by search query, category, and availability
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) {
        return false;
      }
      // Stock only filter
      if (filterStockOnly && !p.is_available) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [products, selectedCategoryId, filterStockOnly, searchQuery]);

  const inStockCount = products.filter(p => Boolean(p.is_available)).length;
  const arrivingCount = products.filter(p => !p.is_available).length;

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: store.name,
        text: language === 'fr'
          ? `Découvrez la vitrine officielle de ${store.name} sur VitrineExpress :`
          : `Check out the official storefront of ${store.name} on VitrineExpress:`,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t.storefront.linkCopied);
    }
  };

  const foundLabel =
    language === 'fr'
      ? `${filteredProducts.length} ${filteredProducts.length > 1 ? 'articles trouvés' : 'article trouvé'}`
      : `${filteredProducts.length} item${filteredProducts.length > 1 ? 's' : ''} found`;

  const inStockLabel = language === 'fr' ? `${inStockCount} en stock` : `${inStockCount} in stock`;
  const arrivingLabel = language === 'fr' ? `${arrivingCount} en arrivage` : `${arrivingCount} restocking`;
  const stockFilterLabel = language === 'fr' ? 'En stock uniquement' : 'In stock only';
  const stockFilterPrefixLabel = language === 'fr' ? 'Filtrer : En stock uniquement' : 'Filter: In stock only';

  return (
    <div
      className="store-themed min-h-[calc(100vh-3.5rem)] bg-warm-50 dark:bg-ink-950 text-ink-950 dark:text-ink-100 flex flex-col pb-20 transition-colors"
      style={{
        '--store-primary': store.theme_primary || '#059669',
        '--store-accent': store.theme_accent || '#F59E0B',
      } as React.CSSProperties}
    >
      {/* Store Header & Presentation */}
      <StoreHeader
        store={store}
        onOpenQR={() => setIsQRModalOpen(true)}
        onShare={handleShare}
      />

      {/* Category Pills Slider */}
      <CategoryTabs
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        totalProductsCount={products.length}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 w-full mt-4 sm:mt-6 flex-1">
        <div className="sm:hidden mb-3 relative">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder={t.storefront.searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-ink-200 text-sm outline-none bg-white focus:border-ink-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-700 cursor-pointer"
              aria-label={language === 'fr' ? 'Effacer la recherche' : 'Clear search'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Availability & Sub-filters strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2 text-xs text-ink-600">
            <span className="font-semibold text-ink-950">
              {foundLabel}
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">
              {inStockLabel}
            </span>
            {arrivingCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-700 font-medium">
                  {arrivingLabel}
                </span>
              </>
            )}
          </div>

          {/* Quick toggle: show only available & Cart trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStockOnly(!filterStockOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                filterStockOnly
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-ink-600 border-ink-200 hover:bg-warm-100'
              }`}
            >
              {filterStockOnly && <Check className="w-3.5 h-3.5" />}
              {filterStockOnly ? stockFilterLabel : stockFilterPrefixLabel}
            </button>

            {/* Cart trigger button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-warm-100 transition-all cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5 store-primary-text" />
              <span>{t.storefront.cart}</span>
              {totalCartCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white store-primary-bg rounded-full">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                store={store}
                onOpenModal={setSelectedProduct}
                onAddToCart={handleAddToCart}
                isInCart={cartItems.some((item) => item.product.id === product.id)}
                index={idx}
              />
            ))}
          </div>
        ) : (
          /* Clean Empty State */
          <div className="my-12 p-8 text-center bg-white rounded-3xl border border-ink-100/90 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-warm-100 text-ink-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-base text-ink-900">
              {t.storefront.noProductsFound}
            </h3>
            <p className="text-xs text-ink-500 mt-1">
              {t.storefront.noProductsCategory}
            </p>
            {(searchQuery || filterStockOnly || selectedCategoryId !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCategoryId('all');
                  setFilterStockOnly(false);
                  onSearchChange('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-ink-900 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
              >
                {t.storefront.clearFilter}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        store={store}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        isInCart={selectedProduct ? cartItems.some((item) => item.product.id === selectedProduct.id) : false}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        store={store}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />

      {/* Floating Cart Button for mobile */}
      {totalCartCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-5 right-5 z-40 store-primary-bg text-white shadow-elevated rounded-full px-4 py-3 flex items-center gap-2.5 sm:hidden cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-display font-bold text-xs">{t.storefront.cart}</span>
          <span className="bg-white text-ink-950 text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {totalCartCount}
          </span>
        </button>
      )}

      {/* QR Code & Poster Modal */}
      <QRPosterModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        store={store}
      />
    </div>
  );
};
