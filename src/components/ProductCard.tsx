import React from 'react';
import { motion } from 'framer-motion';
import { Store, Product } from '../types';
import { formatFCFA, buildWhatsAppOrderLink } from '../utils/formatters';
import { AvailabilityBadge } from './AvailabilityBadge';
import { WhatsAppButton } from './WhatsAppButton';
import { Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  store: Store;
  onOpenModal: (product: Product) => void;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  store,
  onOpenModal,
  index = 0
}) => {
  const whatsappUrl = buildWhatsAppOrderLink(store.whatsapp_number, store.name, product, store.slug);
  const isAvailable = Boolean(product.is_available);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.28, 
        delay: Math.min(index * 0.04, 0.35),
        ease: [0.215, 0.61, 0.355, 1] 
      }}
      className="group relative flex flex-col bg-white rounded-2xl border border-ink-100/90 shadow-subtle hover:shadow-card hover:border-ink-200/90 transition-all duration-200 overflow-hidden"
    >
      {/* Image Container with 4:3 ratio */}
      <div 
        onClick={() => onOpenModal(product)}
        className="relative w-full aspect-[4/3] bg-warm-100 overflow-hidden cursor-pointer"
      >
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Overlay gradient subtle */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-ink-950/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
            <Eye className="w-3.5 h-3.5" />
            Voir détails
          </span>
        </div>

        {/* Availability Badge floating on top-left */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <AvailabilityBadge 
            isAvailable={product.is_available} 
            restockDate={product.restock_date}
            size="sm"
          />
        </div>

        {/* Featured Tag */}
        {Boolean(product.is_featured) && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-ink-900 text-white shadow-xs">
              Top Vente
            </span>
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4 justify-between">
        <div>
          <h3 
            onClick={() => onOpenModal(product)}
            className="font-display font-semibold text-ink-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-brand-700 transition-colors cursor-pointer"
          >
            {product.name}
          </h3>

          {product.description && (
            <p className="mt-1 text-xs text-ink-600 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="mt-3.5 pt-3 border-t border-ink-100/70 flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-ink-400">Prix public</span>
            <span className="font-display font-bold text-base sm:text-lg text-ink-950 tracking-tight">
              {formatFCFA(product.price)}
            </span>
          </div>

          <WhatsAppButton
            url={whatsappUrl}
            size="full"
            label={isAvailable ? "Discuter sur WhatsApp" : "Réserver sur WhatsApp"}
            variant={isAvailable ? "primary" : "secondary"}
          />
        </div>
      </div>
    </motion.div>
  );
};
