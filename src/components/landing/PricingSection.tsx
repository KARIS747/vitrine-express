import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { PLANS, PLAN_IDS, PlanId } from '../../utils/plans';
import { formatFCFA } from '../../utils/formatters';
import { Language } from '../../utils/i18n';

interface PricingSectionProps {
  language: Language;
  onSelectPlan: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ language, onSelectPlan }) => {
  const isFr = language === 'fr';

  const planCopy: Record<
    PlanId,
    {
      subtitle: string;
      features: string[];
      cta: string;
      highlight?: string;
    }
  > = {
    decouverte: {
      subtitle: isFr
        ? 'Idéal pour lancer votre première vitrine en 1 minute.'
        : 'Perfect to launch your first storefront in 1 minute.',
      features: isFr
        ? [
            `Jusqu’à ${PLANS.decouverte.maxProducts} articles en ligne`,
            'Lien direct + panier WhatsApp',
            'QR code de partage inclus',
            'Gratuit sans limite de durée',
          ]
        : [
            `Up to ${PLANS.decouverte.maxProducts} online items`,
            'Direct link + WhatsApp cart',
            'Shareable QR code included',
            'Free forever, no card needed',
          ],
      cta: isFr ? 'Démarrer gratuitement' : 'Start for free',
    },
    pro: {
      subtitle: isFr
        ? 'Pour les boutiques actives avec un catalogue complet.'
        : 'For active shops with a growing catalog.',
      highlight: isFr ? 'Le plus choisi' : 'Most popular',
      features: isFr
        ? [
            `Jusqu’à ${PLANS.pro.maxProducts} articles en ligne`,
            'Affiche QR comptoir PDF haute qualité',
            'Couleurs et bannière personnalisées',
            'Gestion des arrivages & catégories',
          ]
        : [
            `Up to ${PLANS.pro.maxProducts} online items`,
            'High-res printable QR poster PDF',
            'Custom brand colors & banner',
            'Categories & restock date badges',
          ],
      cta: isFr ? 'Choisir le plan Pro' : 'Choose Pro plan',
    },
    premium: {
      subtitle: isFr
        ? 'Catalogue massif et accompagnement prioritaire.'
        : 'Full-scale catalog and priority support.',
      features: isFr
        ? [
            `Jusqu’à ${PLANS.premium.maxProducts} articles (quasi illimité)`,
            'Toutes les options du plan Pro',
            'Support prioritaire sur WhatsApp',
            'Idéal multi-gammes & grossistes',
          ]
        : [
            `Up to ${PLANS.premium.maxProducts} items (virtually unlimited)`,
            'Everything in Pro included',
            'Priority WhatsApp support',
            'Built for large & wholesale catalogs',
          ],
      cta: isFr ? 'Passer en Premium' : 'Go Premium',
    },
  };

  return (
    <section id="tarifs" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          {isFr ? 'Tarifs simples & transparents' : 'Simple, transparent pricing'}
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-950 dark:text-white sm:text-4xl">
          {isFr ? 'Commencez à 0 FCFA, évoluez quand vous vendez.' : 'Start at 0 FCFA, upgrade as you grow.'}
        </h2>
        <p className="mt-3 text-sm text-ink-600 dark:text-ink-300 sm:text-base">
          {isFr
            ? 'Aucune commission sur vos commandes. Passez au palier supérieur uniquement si votre catalogue grandit.'
            : 'Zero commission on your sales. Upgrade only when you need more product slots.'}
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {PLAN_IDS.map((planId) => {
          const plan = PLANS[planId];
          const copy = planCopy[planId];
          const isFeatured = planId === 'pro';

          return (
            <div
              key={planId}
              className={`relative flex flex-col rounded-3xl border p-6 transition-all sm:p-8 ${
                isFeatured
                  ? 'border-emerald-500 bg-gradient-to-b from-[#08241A] to-[#0B1B15] text-white shadow-elevated lg:-translate-y-2'
                  : 'border-ink-200/90 bg-white text-ink-950 shadow-subtle dark:border-ink-800 dark:bg-ink-900 dark:text-white'
              }`}
            >
              {copy.highlight && (
                <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-950 shadow-sm">
                  {copy.highlight}
                </span>
              )}

              <div>
                <h3
                  className={`font-display text-xl font-bold ${
                    isFeatured ? 'text-white' : 'text-ink-950 dark:text-white'
                  }`}
                >
                  {plan.label}
                </h3>
                <p
                  className={`mt-1.5 min-h-[2.5rem] text-xs leading-relaxed ${
                    isFeatured ? 'text-emerald-100/80' : 'text-ink-500 dark:text-ink-400'
                  }`}
                >
                  {copy.subtitle}
                </p>

                <div className="mt-5 flex items-baseline gap-1.5 border-b border-current/10 pb-5">
                  <span className="font-display text-3xl font-extrabold tracking-tight">
                    {plan.price === 0 ? (isFr ? 'Gratuit' : 'Free') : formatFCFA(plan.price, language)}
                  </span>
                  {plan.price > 0 && (
                    <span
                      className={`text-xs font-medium ${
                        isFeatured ? 'text-emerald-200/80' : 'text-ink-500 dark:text-ink-400'
                      }`}
                    >
                      / {isFr ? 'an' : 'year'}
                    </span>
                  )}
                </div>

                <ul className="mt-6 space-y-3">
                  {copy.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          isFeatured
                            ? 'bg-emerald-500/25 text-emerald-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className={isFeatured ? 'text-emerald-50/90' : 'text-ink-700 dark:text-ink-200'}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={onSelectPlan}
                className={`mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  isFeatured
                    ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                    : 'border border-ink-200 bg-ink-50 text-ink-950 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:hover:bg-emerald-600'
                }`}
              >
                {copy.cta}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
