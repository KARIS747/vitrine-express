import React from 'react';
import { motion } from 'framer-motion';
import { Category } from '../types';
import { Layers } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  totalProductsCount: number;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  totalProductsCount
}) => {
  const { language } = useLanguage();
  const allLabel = language === 'en' ? 'All' : 'Tout';

  return (
    <div className="w-full border-b border-ink-100/90 bg-white/70 backdrop-blur-md sticky top-14 z-20 py-2.5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {/* Option Tout voir */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
              selectedCategoryId === 'all'
                ? 'text-white'
                : 'text-ink-600 hover:text-ink-950 hover:bg-warm-100/80'
            }`}
          >
            {selectedCategoryId === 'all' && (
              <motion.div
                layoutId="activeCategoryPill"
                className="absolute inset-0 store-primary-bg rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{allLabel} ({totalProductsCount})</span>
            </span>
          </button>

          {/* Dynamic categories */}
          {categories.filter((cat) => cat.slug !== 'all').map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer select-none ${
                  isSelected
                    ? 'text-white'
                    : 'text-ink-600 hover:text-ink-950 hover:bg-warm-100/80'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 store-primary-bg rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
