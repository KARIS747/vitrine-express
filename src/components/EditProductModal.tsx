import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, Category, Store } from '../types';
import { dbService } from '../services/db';
import { compressProductImage, CompressionResult } from '../utils/imageCompression';
import { X, Upload, Check, Sparkles, Plus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Product) => Promise<boolean>;
  categories: Category[];
  store: Store;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  categories,
  store
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [restockDate, setRestockDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleCreateQuickCat = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;

    const res = await dbService.addCategory(store.id, quickCatName.trim());
    if (res.success && res.category) {
      setLocalCategories([...localCategories, res.category]);
      setCategoryId(res.category.id);
      setQuickCatName('');
      setShowNewCatInput(false);
      toast.success(`Catégorie "${res.category.name}" créée et sélectionnée !`);
    } else {
      toast.error(res.error || "Erreur création catégorie");
    }
  };

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price.toString());
      setCategoryId(product.category_id || '');
      setIsAvailable(Boolean(product.is_available));
      setRestockDate(product.restock_date || '');
      setImageUrl(product.image_url);
      setCompressionInfo(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const result = await compressProductImage(file, 1000, 0.82);
      setCompressionInfo(result);
      setImageUrl(result.dataUrl);
      toast.success(`Photo optimisée : ${result.compressedSizeKB} Ko`);
    } catch {
      toast.error("Erreur de compression d'image");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Veuillez saisir le nom du produit');
      return;
    }

    if (!price || Number(price) <= 0) {
      toast.error('Veuillez saisir un prix valide en FCFA');
      return;
    }

    if (!isAvailable && !restockDate) {
      toast.error("Veuillez indiquer la date d'arrivage");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onSave({
        ...product,
        name: name.trim(),
        description: description.trim(),
        price: Math.round(Number(price)),
        category_id: categoryId || null,
        image_url: imageUrl,
        is_available: isAvailable,
        restock_date: isAvailable ? null : restockDate,
      });

      if (ok) {
        toast.success('Article mis à jour avec succès !');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-elevated border border-ink-100 overflow-hidden z-10 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-ink-100 bg-warm-50">
            <div>
              <h3 className="font-display font-bold text-lg text-ink-950">
                Modifier l'article
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Mise à jour immédiate sur votre vitrine
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-ink-500 hover:text-ink-950 hover:bg-warm-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Photo preview & change */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Photo de l'article
              </label>

              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-ink-200 group bg-warm-100">
                <img src={imageUrl} alt="Aperçu" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-ink-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="px-3.5 py-2 rounded-xl bg-white text-ink-900 text-xs font-semibold cursor-pointer shadow-xs">
                    Remplacer la photo
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Nom du produit *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 text-sm outline-none"
              />
            </div>

            {/* Category & Price in FCFA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider">
                    Catégorie
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(!showNewCatInput)}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showNewCatInput ? 'Fermer' : 'Créer'}</span>
                  </button>
                </div>

                {showNewCatInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nom catégorie..."
                      value={quickCatName}
                      onChange={(e) => setQuickCatName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs outline-none bg-emerald-50/30"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateQuickCat}
                      className="px-2.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 focus:border-brand-600 text-sm outline-none bg-white"
                  >
                    <option value="">(Aucune catégorie)</option>
                    {localCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                  Prix public (FCFA) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0"
                  step="500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 focus:border-brand-600 text-sm outline-none font-semibold"
                />
              </div>
            </div>

            {/* Stock Availability */}
            <div className="p-3.5 rounded-xl border border-ink-200 bg-warm-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-ink-900 block">
                    Disponibilité en magasin
                  </span>
                  <span className="text-xs text-ink-500">
                    {isAvailable ? "En rayon actuellement" : "En cours de réapprovisionnement"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                    isAvailable ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      isAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {!isAvailable && (
                <div className="pt-2 border-t border-ink-200/80">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Date estimée d'arrivage *
                  </label>
                  <input
                    type="date"
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    required={!isAvailable}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm outline-none"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Description / Précisions
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 focus:border-brand-600 text-sm outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-warm-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isCompressing}
                className="flex-1 py-2.5 rounded-xl bg-ink-950 hover:bg-black text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-brand-400" />
                <span>Enregistrer les modifications</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
