import React from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  Layers,
  MessageCircle,
  Printer,
  ShieldCheck,
  Smartphone,
  Wallet,
  Wifi,
  X,
} from 'lucide-react';
import { Language } from '../../utils/i18n';

interface BentoShowcaseProps {
  language: Language;
  onCreateStore: () => void;
}

export const BentoShowcase: React.FC<BentoShowcaseProps> = ({ language, onCreateStore }) => {
  const isFr = language === 'fr';

  const painPoints = isFr
    ? [
        'Envoyer 25 photos en vrac à chaque nouveau client',
        'Répéter « C’est combien ? C’est dispo ? » 40 fois par jour',
        'Messages confus sans quantité, sans quartier, sans total',
        'Aucun lien professionnel pour vos statuts WhatsApp ou TikTok',
      ]
    : [
        'Sending 25 messy photos to every single new prospect',
        'Repeating "How much? Is it available?" 40 times a day',
        'Unclear messages without quantities, location, or total',
        'No clean storefront link for your WhatsApp Status or TikTok bio',
      ];

  const gains = isFr
    ? [
        '1 lien court + 1 affiche QR prête à imprimer pour votre boutique',
        'Prix en FCFA, photos nettes et statut de stock visibles 24h/24',
        'Panier multi-articles avec message WhatsApp prêt à envoyer',
        'Zéro intermédiaire : vous encaissez directement (MoMo, OM, Cash)',
      ]
    : [
        '1 short link + 1 print-ready QR counter poster for your shop',
        'Clear prices, crisp photos, and live stock status visible 24/7',
        'Multi-item cart generating the exact WhatsApp order message',
        'Zero middleman: keep 100% of every sale directly',
      ];

  const features = isFr
    ? [
        {
          icon: MessageCircle,
          title: 'Panier WhatsApp structuré',
          desc: 'Le client coche ses articles, indique son nom et son quartier : vous recevez une commande prête à livrer.',
          badge: 'Conversion x3',
          span: 'lg:col-span-2',
          tone: 'emerald',
        },
        {
          icon: Printer,
          title: 'Affiche QR comptoir PDF',
          desc: 'Téléchargez votre affiche avec QR code en 1 clic pour votre vitrine, caisse ou colis.',
          badge: 'Inclus',
          span: '',
          tone: 'amber',
        },
        {
          icon: Wifi,
          title: 'Ultra-léger sur mobile & 3G',
          desc: 'Vos photos sont optimisées automatiquement pour charger en un éclair sur n’importe quel smartphone.',
          badge: 'Rapide',
          span: '',
          tone: 'slate',
        },
        {
          icon: CalendarClock,
          title: 'Gestion stock & arrivages',
          desc: 'Affichez « En stock » ou une date d’arrivage précise pour ne jamais perdre une vente.',
          badge: 'Temps réel',
          span: '',
          tone: 'slate',
        },
        {
          icon: Wallet,
          title: '0% de commission sur vos ventes',
          desc: 'Vos clients paient comme d’habitude (Mobile Money, espèces, virement). Tout est à vous.',
          badge: '100% pour vous',
          span: 'lg:col-span-2',
          tone: 'dark',
        },
      ]
    : [
        {
          icon: MessageCircle,
          title: 'Structured WhatsApp Cart',
          desc: 'Customers pick items, add their name and delivery area, and send you a clean, ready-to-ship order.',
          badge: '3x faster',
          span: 'lg:col-span-2',
          tone: 'emerald',
        },
        {
          icon: Printer,
          title: 'Print-ready QR Poster PDF',
          desc: 'Download your branded QR code poster in 1 click for your counter, window, or packages.',
          badge: 'Included',
          span: '',
          tone: 'amber',
        },
        {
          icon: Wifi,
          title: 'Lightweight on mobile & 3G',
          desc: 'Product images are auto-compressed so your catalog opens fast on any smartphone.',
          badge: 'Fast',
          span: '',
          tone: 'slate',
        },
        {
          icon: CalendarClock,
          title: 'Live stock & restock dates',
          desc: 'Show "In stock" or an exact restock date so customers reserve instead of leaving.',
          badge: 'Real-time',
          span: '',
          tone: 'slate',
        },
        {
          icon: Wallet,
          title: '0% sales commission',
          desc: 'Get paid however you already do (Mobile Money, cash, transfer). Keep every franc.',
          badge: '100% yours',
          span: 'lg:col-span-2',
          tone: 'dark',
        },
      ];

  return (
    <div className="space-y-20">
      {/* Before / After Contrast */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Layers className="h-3.5 w-3.5" />
            {isFr ? 'Avant / Après VitrineExpress' : 'Before / After VitrineExpress'}
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-950 dark:text-white sm:text-4xl">
            {isFr
              ? 'Arrêtez d’envoyer vos prix un par un.'
              : 'Stop replying to prices one by one.'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300 sm:text-base">
            {isFr
              ? 'Vos clients veulent voir vos articles clairement et commander vite. Offrez-leur une expérience digne d’une grande marque.'
              : 'Shoppers want clarity and speed. Give them a storefront experience worthy of a flagship brand.'}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {/* Before Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-ink-200/80 bg-white p-6 shadow-subtle dark:border-ink-800 dark:bg-ink-900/70 sm:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <X className="h-3.5 w-3.5" />
                {isFr ? 'Sans vitrine en ligne' : 'Without a storefront'}
              </span>
              <Smartphone className="h-5 w-5 text-ink-300 dark:text-ink-600" />
            </div>
            <h3 className="mt-5 font-display text-xl font-bold text-ink-950 dark:text-white">
              {isFr ? 'Le chaos des photos en galerie' : 'Chaotic gallery messaging'}
            </h3>
            <ul className="mt-5 space-y-3.5">
              {painPoints.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-ink-600 dark:text-ink-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <X className="h-3 w-3" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* After Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#071F17] via-[#0B2D21] to-[#0E3A2B] p-6 text-white shadow-elevated sm:p-8"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/15 blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {isFr ? 'Avec VitrineExpress' : 'With VitrineExpress'}
              </span>
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </div>
            <h3 className="relative mt-5 font-display text-xl font-bold text-white">
              {isFr ? 'Votre catalogue travaille pour vous' : 'Your catalog works for you'}
            </h3>
            <ul className="relative mt-5 space-y-3.5">
              {gains.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-emerald-50/90">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="relative mt-6 pt-2">
              <button
                type="button"
                onClick={onCreateStore}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#071F17] transition-transform hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                {isFr ? 'Créer ma vitrine gratuitement' : 'Create my free store'}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Feature Grid */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
              {isFr ? 'Conçu pour le terrain' : 'Built for real commerce'}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-950 dark:text-white sm:text-4xl">
              {isFr ? 'Tout ce qu’il faut pour vendre, rien de superflu.' : 'Everything to sell, zero clutter.'}
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink-600 dark:text-ink-300">
            {isFr
              ? 'Pensé pour les commerçants sur WhatsApp, Instagram, TikTok et en boutique physique.'
              : 'Crafted for sellers on WhatsApp, Instagram, TikTok, and physical shops.'}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            const isDark = feat.tone === 'dark';
            const isEmerald = feat.tone === 'emerald';
            const isAmber = feat.tone === 'amber';

            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 transition-all hover:-translate-y-0.5 ${feat.span} ${
                  isDark
                    ? 'border-ink-800 bg-ink-950 text-white shadow-elevated'
                    : isEmerald
                    ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white shadow-card dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-ink-900 dark:to-ink-900'
                    : 'border-ink-200/80 bg-white shadow-subtle dark:border-ink-800 dark:bg-ink-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        isDark
                          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
                          : isAmber
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isDark
                          ? 'bg-white/10 text-emerald-200'
                          : isAmber
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}
                    >
                      {feat.badge}
                    </span>
                  </div>

                  <h3
                    className={`mt-5 font-display text-lg font-bold ${
                      isDark ? 'text-white' : 'text-ink-950 dark:text-white'
                    }`}
                  >
                    {feat.title}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      isDark ? 'text-ink-300' : 'text-ink-600 dark:text-ink-300'
                    }`}
                  >
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
