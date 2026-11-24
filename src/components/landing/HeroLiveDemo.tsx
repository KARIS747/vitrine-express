import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MessageCircle, Minus, Plus, QrCode, ShoppingBag, Sparkles, Wifi } from 'lucide-react';
import { formatFCFA } from '../../utils/formatters';
import { Language } from '../../utils/i18n';

interface DemoItem {
  id: string;
  nameFr: string;
  nameEn: string;
  categoryFr: string;
  categoryEn: string;
  price: number;
  badgeFr: string;
  badgeEn: string;
  accentFrom: string;
  accentTo: string;
  glyph: 'sneaker' | 'bag' | 'watch';
}

const DEMO_ITEMS: DemoItem[] = [
  {
    id: 'sneakers',
    nameFr: 'Sneakers Urban Run',
    nameEn: 'Urban Run Sneakers',
    categoryFr: 'Chaussures',
    categoryEn: 'Shoes',
    price: 18500,
    badgeFr: 'En stock',
    badgeEn: 'In stock',
    accentFrom: 'from-emerald-500/20',
    accentTo: 'to-teal-500/5',
    glyph: 'sneaker',
  },
  {
    id: 'bag',
    nameFr: 'Sac Cuir Atelier',
    nameEn: 'Atelier Leather Bag',
    categoryFr: 'Accessoires',
    categoryEn: 'Accessories',
    price: 12000,
    badgeFr: 'En stock',
    badgeEn: 'In stock',
    accentFrom: 'from-amber-500/20',
    accentTo: 'to-orange-500/5',
    glyph: 'bag',
  },
  {
    id: 'watch',
    nameFr: 'Montre Chronographe',
    nameEn: 'Chronograph Watch',
    categoryFr: 'Montres',
    categoryEn: 'Watches',
    price: 24000,
    badgeFr: 'Arrivage',
    badgeEn: 'Restocking',
    accentFrom: 'from-sky-500/20',
    accentTo: 'to-indigo-500/5',
    glyph: 'watch',
  },
];

const ProductIllustration: React.FC<{ glyph: DemoItem['glyph'] }> = ({ glyph }) => {
  if (glyph === 'sneaker') {
    return (
      <svg viewBox="0 0 64 44" className="h-9 w-12 text-emerald-700 dark:text-emerald-300" fill="none">
        <path
          d="M8 29c0-3 2-5 5-5h6l8-11 7 5c4 3 10 3 16 4 4 .6 6 2.8 6 6v4H8v-3Z"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M8 32h48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M27 16l4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (glyph === 'bag') {
    return (
      <svg viewBox="0 0 64 44" className="h-9 w-12 text-amber-700 dark:text-amber-300" fill="none">
        <rect
          x="14"
          y="15"
          width="36"
          height="22"
          rx="5"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M24 15v-3a8 8 0 0 1 16 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 23h36" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 44" className="h-9 w-12 text-sky-700 dark:text-sky-300" fill="none">
      <rect x="26" y="4" width="12" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="26" y="33" width="12" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle
        cx="32"
        cy="22"
        r="11"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M32 16v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

interface HeroLiveDemoProps {
  storeName?: string;
  storeCity?: string;
  language: Language;
  onCreateStore: () => void;
}

export const HeroLiveDemo: React.FC<HeroLiveDemoProps> = ({
  storeName,
  storeCity,
  language,
  onCreateStore,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({
    sneakers: 1,
    bag: 1,
    watch: 0,
  });

  const displayName = storeName || (language === 'fr' ? 'Atelier Kora' : 'Kora Studio');
  const displayCity = storeCity || 'Douala';

  const updateQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, Math.min(5, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const selectedItems = useMemo(
    () =>
      DEMO_ITEMS.filter((item) => (quantities[item.id] ?? 0) > 0).map((item) => ({
        ...item,
        qty: quantities[item.id] ?? 0,
      })),
    [quantities],
  );

  const totalCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.qty, 0),
    [selectedItems],
  );

  const totalAmount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [selectedItems],
  );

  const isFr = language === 'fr';

  return (
    <div className="relative mx-auto w-full max-w-[460px] lg:max-w-none">
      {/* Ambient backdrop glow behind phone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-gradient-to-tr from-emerald-500/25 via-teal-400/10 to-amber-400/20 blur-2xl"
      />

      {/* Floating QR Badge (top-right) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="absolute -right-2 -top-4 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/15 bg-[#0D231B]/90 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-md sm:flex"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#071510]">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-tight text-white">
            {isFr ? 'Affiche QR prête' : 'QR poster ready'}
          </p>
          <p className="text-[10px] text-emerald-300/90">
            {isFr ? 'Scan → Catalogue' : 'Scan → Catalog'}
          </p>
        </div>
      </motion.div>

      {/* Floating Speed Badge (top-left) */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="absolute -left-4 top-20 z-20 hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-[#0D231B]/90 px-3 py-1.5 text-xs font-medium text-emerald-200 shadow-xl backdrop-blur-md xl:flex"
      >
        <Wifi className="h-3.5 w-3.5 text-emerald-400" />
        <span>{isFr ? 'Fluide même en 3G' : 'Fast even on 3G'}</span>
      </motion.div>

      {/* Interactive Phone Frame */}
      <div className="relative z-10 overflow-hidden rounded-[2.2rem] border border-white/15 bg-white p-3 shadow-[0_28px_80px_-20px_rgba(0,0,0,0.65)] dark:border-ink-700 dark:bg-ink-900">
        {/* Phone Notch & Status */}
        <div className="mb-2.5 flex items-center justify-between px-3 pt-1 text-[10px] font-semibold text-ink-500 dark:text-ink-400">
          <span>vitrine-express.pages.dev</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {isFr ? 'Démo interactive' : 'Live demo'}
          </span>
        </div>

        {/* Store Mini Header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0B3B2B] via-[#094834] to-[#065F46] p-3.5 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 font-display text-base font-bold text-white ring-1 ring-white/25">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-white">{displayName}</p>
                <p className="text-[11px] text-emerald-200/90">
                  {displayCity} • {isFr ? 'Vitrine vérifiée' : 'Verified store'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" />
              <span>{totalCount}</span>
            </div>
          </div>
        </div>

        {/* Interactive Product Rows */}
        <div className="mt-2.5 space-y-2">
          {DEMO_ITEMS.map((item) => {
            const qty = quantities[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-all ${
                  qty > 0
                    ? 'border-emerald-500/40 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                    : 'border-ink-100 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-950/40'
                }`}
              >
                <div
                  className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.accentFrom} ${item.accentTo} border border-ink-100/80 dark:border-ink-800`}
                >
                  <ProductIllustration glyph={item.glyph} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-ink-950 dark:text-white">
                      {isFr ? item.nameFr : item.nameEn}
                    </p>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {formatFCFA(item.price, language)}
                    </span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[9px] font-semibold text-ink-500 ring-1 ring-ink-100 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700">
                      {isFr ? item.badgeFr : item.badgeEn}
                    </span>
                  </div>
                </div>

                {/* Live +/- controls */}
                <div className="flex items-center gap-1">
                  {qty > 0 ? (
                    <div className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-white p-0.5 shadow-xs dark:border-emerald-800 dark:bg-ink-800">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        aria-label={isFr ? 'Retirer un article' : 'Remove item'}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-700"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[1.25rem] text-center text-xs font-bold text-ink-950 dark:text-white">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        aria-label={isFr ? 'Ajouter un article' : 'Add item'}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      className="inline-flex h-7 items-center gap-1 rounded-xl border border-ink-200 bg-white px-2.5 text-[11px] font-semibold text-ink-800 transition-colors hover:border-emerald-500 hover:text-emerald-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
                    >
                      <Plus className="h-3 w-3" />
                      {isFr ? 'Ajouter' : 'Add'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live WhatsApp Message Preview Card */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-200/80 bg-[#ECE5DD] dark:border-emerald-900/60 dark:bg-[#0B141A]">
          <div className="flex items-center justify-between bg-[#075E54] px-3 py-1.5 text-[11px] font-semibold text-white">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-300" />
              {isFr ? 'Message WhatsApp généré' : 'Generated WhatsApp message'}
            </span>
            <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px]">
              {formatFCFA(totalAmount, language)}
            </span>
          </div>

          <div className="p-2.5">
            <AnimatePresence mode="wait">
              {selectedItems.length > 0 ? (
                <motion.div
                  key={`${totalCount}-${totalAmount}`}
                  initial={{ opacity: 0.6, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl rounded-tl-sm bg-[#DCF8C6] p-2.5 text-[11px] leading-relaxed text-[#111B21] shadow-xs dark:bg-[#005C4B] dark:text-[#E9EDEF]"
                >
                  <p className="font-semibold">
                    {isFr ? `Bonjour ${displayName} !` : `Hello ${displayName}!`}
                  </p>
                  <div className="mt-1 space-y-0.5 font-mono text-[10px]">
                    {selectedItems.map((item, idx) => (
                      <div key={item.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {idx + 1}. {isFr ? item.nameFr : item.nameEn} x{item.qty}
                        </span>
                        <span className="shrink-0 font-semibold">
                          {formatFCFA(item.price * item.qty, language)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between border-t border-black/10 pt-1 text-[11px] font-bold dark:border-white/15">
                    <span>Total : {formatFCFA(totalAmount, language)}</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-800 dark:text-emerald-200">
                      <Check className="h-3 w-3" />
                      {isFr ? 'Prêt à envoyer' : 'Ready'}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl bg-white/90 p-2.5 text-center text-[11px] text-ink-500 dark:bg-ink-800 dark:text-ink-300"
                >
                  {isFr
                    ? 'Cliquez sur « + Ajouter » ci-dessus pour voir le message se remplir.'
                    : 'Tap "+ Add" above to watch the WhatsApp order build live.'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Interactive Hint */}
        <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {isFr ? 'Testez les boutons + / −' : 'Try clicking + / −'}
          </span>
          <button
            type="button"
            onClick={onCreateStore}
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {isFr ? 'Avoir la même →' : 'Get yours →'}
          </button>
        </div>
      </div>
    </div>
  );
};
