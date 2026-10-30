import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, Store } from '../types';
import { X, Calendar } from 'lucide-react';
import { formatFCFA, formatDate, buildWhatsAppOrderLink } from '../utils/formatters';
import { AvailabilityBadge } from './AvailabilityBadge';
import { WhatsAppButton } from './WhatsAppButton';
import { useLanguage } from '../utils/i18n';
import { ShoppingCart, Check } from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  store: Store;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  isInCart?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  store,
  onClose,
  onAddToCart,
  isInCart = false,
}) => {
  const { language, t } = useLanguage();

  if (!product) return null;

  const isAvailable = Boolean(product.is_available);
  const whatsappUrl = buildWhatsAppOrderLink(
    store.whatsapp_number,
    store.name,
    product,
    store.slug,
    language
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-elevated border border-ink-100 overflow-hidden z-10 my-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-white/80 backdrop-blur-md text-ink-700 hover:text-ink-950 hover:bg-white shadow-xs transition-colors cursor-pointer"
            aria-label={t.storefront.close}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Product Image */}
          <div className="relative w-full aspect-[16/10] bg-warm-100 dark:bg-ink-800 overflow-hidden">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3">
              <AvailabilityBadge
                isAvailable={product.is_available}
                restockDate={product.restock_date}
                size="md"
              />
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-7 bg-white dark:bg-ink-900 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-ink-950 dark:text-white leading-tight">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-ink-500 dark:text-ink-400">
                  <span className="font-medium text-ink-700 dark:text-ink-300">{store.name}</span>
                  <span>•</span>
                  <span>{store.city}</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <span className="block text-xs text-ink-400 dark:text-ink-500 font-medium">
                  {language === 'en' ? 'Price' : 'Prix'}
                </span>
                <span className="font-display font-bold text-xl sm:text-2xl text-ink-950 dark:text-white">
                  {formatFCFA(product.price, language)}
                </span>
              </div>
            </div>

            {/* Restock notice if pending */}
            {!isAvailable && product.restock_date && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                  <span className="font-semibold block">
                    {language === 'en' ? 'Item currently restocking' : "Article en cours d'approvisionnement"}
                  </span>
                  {language === 'en' ? (
                    <>
                      Estimated arrival on <strong className="underline">{formatDate(product.restock_date, 'en')}</strong>. You can reserve yours right now via WhatsApp before it sells out.
                    </>
                  ) : (
                    <>
                      Arrivage prévu le <strong className="underline">{formatDate(product.restock_date, 'fr')}</strong>. Vous pouvez réserver dès maintenant votre exemplaire sur WhatsApp avant la rupture.
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-wider">
                {language === 'en' ? 'Product description' : 'Description du produit'}
              </h4>
              <p className="mt-2 text-sm text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                {product.description || (language === 'en' ? 'No detailed description available for this item.' : 'Aucune description détaillée renseignée pour cet article.')}
              </p>
            </div>

            {/* Action Bar */}
            <div className="mt-6 pt-5 border-t border-ink-100 dark:border-ink-800 flex flex-col sm:flex-row items-center gap-3">
              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => onAddToCart(product)}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    isInCart
                      ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-950 border-ink-900 dark:border-white shadow-xs'
                      : 'bg-warm-100 dark:bg-ink-800 text-ink-900 dark:text-ink-200 border-ink-200 dark:border-ink-700 hover:bg-warm-200 dark:hover:bg-ink-700'
                  }`}
                >
                  {isInCart ? <Check className="w-4 h-4 text-emerald-400" /> : <ShoppingCart className="w-4 h-4" />}
                  <span>{isInCart ? (language === 'en' ? 'In Cart' : 'Dans le panier') : t.storefront.addToCart}</span>
                </button>
              )}

              <div className="w-full sm:flex-1">
                <WhatsAppButton
                  url={whatsappUrl}
                  size="full"
                  label={
                    isAvailable 
                      ? (language === 'en' ? 'Direct WhatsApp' : 'Commander seul sur WhatsApp')
                      : (language === 'en' ? 'Reserve on WhatsApp' : 'Réserver seul sur WhatsApp')
                  }
                  variant={isAvailable ? "primary" : "secondary"}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
