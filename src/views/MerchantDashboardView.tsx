import React, { useState } from 'react';
import { Store, Category, Product } from '../types';
import { dbService } from '../services/db';
import { formatFCFA, formatDate } from '../utils/formatters';
import { AvailabilityBadge } from '../components/AvailabilityBadge';
import { AddProductModal } from '../components/AddProductModal';
import { EditProductModal } from '../components/EditProductModal';
import { CategoryManagerModal } from '../components/CategoryManagerModal';
import { QRPosterModal } from '../components/QRPosterModal';
import { 
  Plus, 
  QrCode, 
  Share2, 
  Trash2, 
  Edit3,
  Layers,
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Store as StoreIcon,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface MerchantDashboardViewProps {
  store: Store;
  categories: Category[];
  products: Product[];
  onRefresh: () => void;
  onPreviewStorefront: () => void;
}

export const MerchantDashboardView: React.FC<MerchantDashboardViewProps> = ({
  store,
  categories,
  products,
  onRefresh,
  onPreviewStorefront
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [tempRestockDate, setTempRestockDate] = useState('');

  const maxProducts = store.max_products || 20;
  const currentCount = products.length;
  const percentUsed = Math.min(100, Math.round((currentCount / maxProducts) * 100));
  const isLimitReached = currentCount >= maxProducts;

  const inStockCount = products.filter(p => Boolean(p.is_available)).length;
  const arrivingCount = products.filter(p => !p.is_available).length;

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'store_id' | 'created_at'>) => {
    const res = await dbService.addProduct(store.id, productData);
    if (res.success) {
      onRefresh();
      return true;
    } else {
      toast.error(res.error || "Erreur lors de l'ajout");
      return false;
    }
  };

  const handleUpdateProduct = async (updated: Product) => {
    const res = await dbService.updateProduct(updated);
    if (res.success) {
      onRefresh();
      return true;
    } else {
      toast.error(res.error || "Erreur lors de la mise à jour");
      return false;
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet article de votre vitrine ?")) {
      await dbService.deleteProduct(productId);
      toast.success("Article supprimé");
      onRefresh();
    }
  };

  const handleToggleStock = async (product: Product) => {
    if (product.is_available) {
      // Passer en indisponible -> demander la date de retour
      setRestockModalProduct(product);
      setTempRestockDate('');
    } else {
      // Passer directement en disponible
      await dbService.toggleProductAvailability(product.id, null);
      toast.success(`${product.name} est maintenant marqué 'En stock' !`);
      onRefresh();
    }
  };

  const handleConfirmRestockDate = async () => {
    if (!restockModalProduct) return;
    if (!tempRestockDate) {
      toast.error("Veuillez choisir une date de réapprovisionnement");
      return;
    }

    await dbService.toggleProductAvailability(restockModalProduct.id, tempRestockDate);
    toast.success(`${restockModalProduct.name} marqué 'Arrive le ${formatDate(tempRestockDate)}'`);
    setRestockModalProduct(null);
    onRefresh();
  };

  const handleCopyStoreLink = () => {
    const url = `${window.location.origin}?store=${store.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié ! Vous pouvez le coller sur votre statut WhatsApp.");
  };

  return (
    <div className="min-h-screen bg-warm-50 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-ink-100 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-warm-100 border border-ink-100 p-1 shrink-0 overflow-hidden">
              <img
                src={store.logo_url || 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80'}
                alt={store.name}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-ink-950">
                  {store.name}
                </h1>
                <span className="text-[11px] font-semibold bg-brand-50 text-brand-800 border border-brand-200 px-2 py-0.5 rounded-full">
                  Espace Gérant
                </span>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Licence active • Expire le <strong>{formatDate(store.expires_at)}</strong> (Formule 5 000 FCFA/an)
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-ink-200 hover:bg-warm-100 text-xs font-semibold text-ink-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-brand-700" />
              <span>Gérer les catégories</span>
            </button>

            <button
              onClick={onPreviewStorefront}
              className="px-3.5 py-2 rounded-xl border border-ink-200 hover:bg-warm-100 text-xs font-semibold text-ink-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Voir ma vitrine publique</span>
            </button>

            <button
              onClick={() => setIsQRModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-ink-200 hover:bg-warm-100 text-xs font-semibold text-ink-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-brand-700" />
              <span>Imprimer mon QR Code</span>
            </button>

            <button
              onClick={handleCopyStoreLink}
              className="px-3.5 py-2 rounded-xl border border-ink-200 hover:bg-warm-100 text-xs font-semibold text-ink-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copier lien statut WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Quota & Statistics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Strict 20 Products Quota Gauge */}
          <div className="bg-white rounded-2xl p-5 border border-ink-100 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
                Quota d'articles (Licence)
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                isLimitReached ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-800'
              }`}>
                {currentCount} / {maxProducts}
              </span>
            </div>

            <div className="my-3">
              <div className="w-full h-2.5 rounded-full bg-warm-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isLimitReached ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-ink-500">
              {isLimitReached ? (
                <strong className="text-amber-700">Limite de 20 produits atteinte.</strong>
              ) : (
                `Il vous reste ${maxProducts - currentCount} places pour ajouter de nouveaux produits.`
              )}
            </p>
          </div>

          {/* In Stock Count */}
          <div className="bg-white rounded-2xl p-5 border border-ink-100 shadow-subtle flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                Articles en Stock
              </span>
              <span className="font-display font-bold text-2xl text-ink-950">
                {inStockCount}
              </span>
              <span className="text-[11px] text-emerald-700 block mt-0.5">
                Disponibles immédiatement pour vos clients
              </span>
            </div>
          </div>

          {/* Arriving / Pending Count */}
          <div className="bg-white rounded-2xl p-5 border border-ink-100 shadow-subtle flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                En Réapprovisionnement
              </span>
              <span className="font-display font-bold text-2xl text-ink-950">
                {arrivingCount}
              </span>
              <span className="text-[11px] text-amber-700 block mt-0.5">
                Avec date d'arrivage affichée aux clients
              </span>
            </div>
          </div>
        </div>

        {/* Product Management Section */}
        <div className="bg-white rounded-3xl border border-ink-100 shadow-subtle overflow-hidden">
          {/* Section Toolbar */}
          <div className="p-5 border-b border-ink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-warm-50/50">
            <div>
              <h2 className="font-display font-bold text-lg text-ink-950">
                Mes Articles ({products.length})
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Mettez à jour vos disponibilités en 1 clic pour éviter que les clients ne demandent inutilement sur WhatsApp.
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isLimitReached}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink-950 hover:bg-black text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-brand-400" />
              <span>Ajouter un article</span>
            </button>
          </div>

          {/* Product Items List */}
          <div className="divide-y divide-ink-100/80">
            {products.map((product) => {
              const isAvailable = Boolean(product.is_available);

              return (
                <div key={product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-warm-50/40 transition-colors">
                  {/* Photo & Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-warm-100 border border-ink-100 shrink-0 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-sm sm:text-base text-ink-950">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-xs sm:text-sm text-brand-700">
                          {formatFCFA(product.price)}
                        </span>
                        <span>•</span>
                        <AvailabilityBadge
                          isAvailable={product.is_available}
                          restockDate={product.restock_date}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Controls */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {/* Quick stock switcher button */}
                    <button
                      onClick={() => handleToggleStock(product)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
                      }`}
                      title="Changer l'état du stock"
                    >
                      {isAvailable ? '✓ En rayon' : '⏳ En arrivage'}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-2 rounded-xl text-ink-600 hover:text-ink-950 hover:bg-warm-100 transition-colors cursor-pointer border border-ink-200/80"
                      title="Modifier prix, nom ou description"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete item */}
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 rounded-xl text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Supprimer cet article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddProduct}
        categories={categories}
        store={store}
        currentProductCount={products.length}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        product={editingProduct}
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        onSave={handleUpdateProduct}
        categories={categories}
        store={store}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        store={store}
        onRefresh={onRefresh}
      />

      {/* QR Code & Poster Modal */}
      <QRPosterModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        store={store}
      />

      {/* Restock Date Picker Prompt Modal */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-ink-100 shadow-elevated">
            <h3 className="font-display font-bold text-lg text-ink-950">
              Date de réapprovisionnement
            </h3>
            <p className="text-xs text-ink-500 mt-1">
              À quelle date prévoyez-vous le retour en stock de <strong>{restockModalProduct.name}</strong> ?
            </p>

            <div className="my-4">
              <input
                type="date"
                value={tempRestockDate}
                onChange={(e) => setTempRestockDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestockModalProduct(null)}
                className="flex-1 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-warm-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRestockDate}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Valider la date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
