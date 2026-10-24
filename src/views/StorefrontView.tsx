import React, { useState, useMemo } from 'react';
import { Store, Category, Product } from '../types';
import { StoreHeader } from '../components/StoreHeader';
import { CategoryTabs } from '../components/CategoryTabs';
import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { QRPosterModal } from '../components/QRPosterModal';
import { Search, Sparkles, AlertCircle, ShoppingBag, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface StorefrontViewProps {
  store: Store;
  categories: Category[];
  products: Product[];
  searchQuery: string;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  store,
  categories,
  products,
  searchQuery
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [filterStockOnly, setFilterStockOnly] = useState(false);

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
        text: `Découvrez la vitrine officielle de ${store.name} sur VitrineExpress :`,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Lien de la vitrine copié ! Vous pouvez le coller sur votre statut WhatsApp.");
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col pb-20">
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
        {/* Availability & Sub-filters strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2 text-xs text-ink-600">
            <span className="font-semibold text-ink-950">
              {filteredProducts.length} {filteredProducts.length > 1 ? 'articles trouvés' : 'article trouvé'}
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">
              {inStockCount} en stock
            </span>
            {arrivingCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-700 font-medium">
                  {arrivingCount} en arrivage
                </span>
              </>
            )}
          </div>

          {/* Quick toggle: show only available */}
          <button
            onClick={() => setFilterStockOnly(!filterStockOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
              filterStockOnly
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-ink-600 border-ink-200 hover:bg-warm-100'
            }`}
          >
            {filterStockOnly ? '✓ Uniquement disponibles en stock' : 'Filtrer : En stock uniquement'}
          </button>
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
              Aucun article correspondant
            </h3>
            <p className="text-xs text-ink-500 mt-1">
              Essayez de modifier votre recherche ou sélectionnez une autre catégorie.
            </p>
            {(searchQuery || filterStockOnly || selectedCategoryId !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCategoryId('all');
                  setFilterStockOnly(false);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-ink-900 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
              >
                Réinitialiser les filtres
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
      />

      {/* QR Code & Poster Modal */}
      <QRPosterModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        store={store}
      />
    </div>
  );
};
