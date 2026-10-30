import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store } from '../types';
import { CartItem, formatFCFA, buildWhatsAppCartOrderLink } from '../utils/formatters';
import { useLanguage } from '../utils/i18n';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  store: Store;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  store,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const { language, t } = useLanguage();

  const totalCount = items.reduce((acc, it) => acc + it.quantity, 0);
  const totalPrice = items.reduce((acc, it) => acc + it.product.price * it.quantity, 0);

  const whatsappUrl = buildWhatsAppCartOrderLink(
    store.whatsapp_number,
    store.name,
    items,
    store.slug,
    language
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="w-screen max-w-md bg-white dark:bg-ink-900 border-l border-ink-100 dark:border-ink-800 shadow-elevated flex flex-col transition-colors"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl store-primary-soft flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 store-primary-text" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-ink-950 dark:text-white">
                      {t.storefront.cart}
                    </h2>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {totalCount} {t.storefront.cartItemsCount} • {store.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {items.length > 0 && (
                    <button
                      onClick={onClearCart}
                      className="p-2 text-ink-400 hover:text-red-600 transition-colors rounded-lg cursor-pointer"
                      title={t.storefront.clearCart}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                    aria-label={t.storefront.close}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-400">
                    <div className="w-14 h-14 rounded-2xl bg-warm-100 dark:bg-ink-800 flex items-center justify-center mb-3 text-ink-300 dark:text-ink-600">
                      <ShoppingCart className="w-7 h-7" />
                    </div>
                    <p className="font-display font-medium text-ink-700 dark:text-ink-300 text-sm">
                      {t.storefront.cartEmpty}
                    </p>
                    <p className="text-xs text-ink-400 dark:text-ink-500 mt-1 max-w-xs">
                      {language === 'fr'
                        ? 'Ajoutez des articles depuis la vitrine pour préparer votre commande WhatsApp groupée.'
                        : 'Add items from the store to prepare a combined WhatsApp order.'}
                    </p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-warm-50/50 dark:bg-ink-850 hover:bg-white dark:hover:bg-ink-800 hover:border-ink-200 transition-all"
                    >
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-xl object-cover bg-warm-100 dark:bg-ink-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-semibold text-xs sm:text-sm text-ink-900 dark:text-white truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-xs font-bold text-ink-950 dark:text-emerald-400 mt-0.5">
                          {formatFCFA(item.product.price * item.quantity, language)}
                        </div>
                        {!item.product.is_available && (
                          <span className="inline-block text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded mt-0.5">
                            {language === 'fr' ? 'Bientôt dispo' : 'Restocking'}
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-lg p-0.5 shadow-xs shrink-0">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-ink-600 dark:text-ink-300 hover:text-ink-950 dark:hover:text-white rounded cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-ink-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-ink-600 dark:text-ink-300 hover:text-ink-950 dark:hover:text-white rounded cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer / Total & Checkout Button */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-ink-100 dark:border-ink-800 bg-warm-50/70 dark:bg-ink-900 space-y-3">
                  <div className="flex items-baseline justify-between text-ink-700">
                    <span className="text-xs font-medium text-ink-500 dark:text-ink-400">
                      {t.storefront.totalAmount}
                    </span>
                    <span className="font-display font-bold text-xl text-ink-950 dark:text-white">
                      {formatFCFA(totalPrice, language)}
                    </span>
                  </div>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full store-primary-bg text-white py-3 px-4 rounded-xl font-display font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4 shrink-0 fill-current"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.507 14.307l-.009.075c-.322.846-1.523 1.644-2.115 1.708-.574.062-1.319.088-2.146-.179-1.393-.45-2.73-1.428-3.79-2.487-1.059-1.06-2.037-2.397-2.487-3.79-.267-.827-.241-1.572-.179-2.146.064-.592.862-1.793 1.708-2.115l.075-.009c.31-.035.631.065.862.274l1.455 1.319c.306.277.411.713.262 1.096l-.547 1.408c-.12.308-.035.656.216.877.688.604 1.464 1.38 2.068 2.068.221.251.569.336.877.216l1.408-.547c.383-.149.819-.044 1.096.262l1.319 1.455c.209.231.309.552.274.862z"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.1 21.9l4.9-.8A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.954 7.954 0 01-4.084-1.127l-.293-.174-3.03.495.503-2.946-.19-.303A7.962 7.962 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                    </svg>
                    <span>{t.storefront.orderCart}</span>
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
