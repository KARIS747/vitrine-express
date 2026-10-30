import React from 'react';
import { Store } from '../types';
import { MapPin, Phone, QrCode, Share2, CheckCircle, MessageCircle } from 'lucide-react';
import { buildWhatsAppContactLink } from '../utils/formatters';
import { useLanguage } from '../utils/i18n';

interface StoreHeaderProps {
  store: Store;
  onOpenQR: () => void;
  onShare: () => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  store,
  onOpenQR,
  onShare
}) => {
  const { t, language } = useLanguage();
  const whatsappUrl = buildWhatsAppContactLink(store.whatsapp_number, store.name, language);

  return (
    <div className="relative w-full bg-white border-b border-ink-100">
      {/* Banner / Enseigne photo */}
      <div className="relative w-full h-36 sm:h-52 bg-gradient-to-r from-ink-900 to-ink-800 overflow-hidden">
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={store.name}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full store-brand-gradient opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 store-brand-gradient" />
      </div>

      {/* Profile & Info Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 sm:pb-6 gap-4">
          {/* Logo & Text info */}
          <div className="flex items-start gap-3.5 sm:gap-5">
            <div className="relative -mt-12 sm:-mt-16 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-elevated border border-ink-100 shrink-0 overflow-hidden">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl store-brand-gradient text-white flex items-center justify-center font-display font-bold text-3xl">
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 pt-1 sm:pt-2 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-ink-950 tracking-tight">
                  {store.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  {t.storefront.verifiedStore}
                </span>
              </div>

              {store.tagline && (
                <p className="text-xs sm:text-sm text-ink-600 mt-0.5 font-medium line-clamp-1">
                  {store.tagline}
                </p>
              )}

              {/* Location Tag */}
              <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 store-primary-text shrink-0" />
                <span>
                  {store.city} {store.quarter ? `• ${store.quarter}` : ''}
                </span>
                {store.address_notes && (
                  <span className="hidden sm:inline text-ink-400">
                    ({store.address_notes})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 pt-1 sm:pt-3">
            {/* Direct Call */}
            {store.phone_call && (
              <a
                href={`tel:${store.phone_call.replace(/\s+/g, '')}`}
                className="inline-flex items-center justify-center p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:text-ink-900 hover:bg-warm-100 font-medium text-xs sm:text-sm transition-colors"
                title={language === 'fr' ? 'Appeler la boutique' : 'Call the store'}
              >
                <Phone className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t.storefront.callBtn}</span>
              </a>
            )}

            {/* QR Code Modal Trigger */}
            <button
              onClick={onOpenQR}
              className="inline-flex items-center justify-center p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:text-ink-900 hover:bg-warm-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              title="QR Code"
            >
              <QrCode className="w-4 h-4 sm:mr-1.5 text-ink-800" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            {/* Share link */}
            <button
              onClick={onShare}
              className="inline-flex items-center justify-center p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border border-ink-200 text-ink-700 hover:text-ink-900 hover:bg-warm-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              title={t.storefront.shareStore}
            >
              <Share2 className="w-4 h-4 sm:mr-1.5 text-ink-800" />
              <span className="hidden sm:inline">{t.storefront.shareStore}</span>
            </button>

            {/* General WhatsApp message */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl store-primary-bg text-white font-medium text-xs sm:text-sm shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-1.5 fill-current" />
              <span>{t.storefront.contactBtn}</span>
            </a>
          </div>
        </div>

        {/* Short bio if present */}
        {store.description && (
          <div className="pb-4 pt-1 border-t border-ink-100/70">
            <p className="text-xs sm:text-sm text-ink-600 leading-relaxed max-w-3xl">
              {store.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
