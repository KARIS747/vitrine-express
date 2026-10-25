import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Store } from '../types';
import { dbService } from '../services/db';
import { X, Plus, Trash2, Layers, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  store: Store;
  onRefresh: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  store,
  onRefresh
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await dbService.addCategory(store.id, newCatName.trim());
      if (res.success) {
        toast.success(`Catégorie "${newCatName.trim()}" ajoutée !`);
        setNewCatName('');
        onRefresh();
      } else {
        toast.error(res.error || "Erreur d'ajout");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Supprimer la catégorie "${cat.name}" ? Les produits associés ne seront pas supprimés mais déclassés.`)) {
      return;
    }

    const result = await dbService.deleteCategory(store.id, cat.id);
    if (result.success) {
      toast.success('Catégorie supprimée');
      onRefresh();
    } else {
      toast.error(result.error ?? 'Erreur lors de la suppression');
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
          className="relative w-full max-w-md bg-white rounded-3xl shadow-elevated border border-ink-100 overflow-hidden z-10 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-ink-100 bg-warm-50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-ink-950">
                  Gérer les Catégories
                </h3>
                <p className="text-xs text-ink-500">
                  Classez vos articles pour faciliter la visite des clients
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-ink-500 hover:text-ink-950 hover:bg-warm-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Formulaire d'ajout rapide */}
            <form onSubmit={handleAddCategory} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: T-shirts & Polos, Claquettes..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSubmitting || !newCatName.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </form>

            {/* Liste des catégories existantes */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                Catégories de votre boutique ({categories.length})
              </span>

              <div className="divide-y divide-ink-100 border border-ink-200/80 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-warm-50/60 transition-colors"
                    >
                      <span className="text-sm font-medium text-ink-900">
                        {cat.name}
                      </span>

                      {cat.slug !== 'all' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer la catégorie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-ink-400">
                    Aucune catégorie personnalisée créée.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-warm-50 border-t border-ink-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-ink-900 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
            >
              Terminé
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
