export type PlanId = 'decouverte' | 'pro' | 'premium';

export interface PlanDefinition {
  id: PlanId;
  label: string;
  maxProducts: number;
  price: number;
  promoPrice: number;
}

export const PLAN_IDS: PlanId[] = ['decouverte', 'pro', 'premium'];

export const PLANS: Record<PlanId, PlanDefinition> = {
  decouverte: {
    id: 'decouverte',
    label: 'Découverte',
    maxProducts: 8,
    price: 0,
    promoPrice: 0,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxProducts: 30,
    price: 8000,
    promoPrice: 5000,
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    maxProducts: 999,
    price: 20000,
    promoPrice: 14000,
  },
};

export const MAX_PRODUCTS = PLANS.premium.maxProducts;

export const PROMO_CODES = ['VIP237', 'PROMO10', 'EXPRESS', 'LANCEMENT', 'DOUALA', 'YAOUNDE'];

export function normalizePlan(value: unknown): PlanId {
  const plan = String(value ?? '').trim().toLowerCase();
  return PLAN_IDS.includes(plan as PlanId) ? (plan as PlanId) : 'decouverte';
}

export function isPromoCode(value: unknown): boolean {
  return PROMO_CODES.includes(String(value ?? '').trim().toUpperCase());
}

export function planPrice(plan: PlanId, promoApplied: boolean): number {
  const definition = PLANS[plan];
  return promoApplied ? definition.promoPrice : definition.price;
}

export function planFromQuota(quota: unknown): PlanId {
  const value = Number(quota) || 0;
  if (value >= PLANS.premium.maxProducts) return 'premium';
  if (value > PLANS.decouverte.maxProducts) return 'pro';
  return 'decouverte';
}

export function planLabel(plan: PlanId): string {
  return PLANS[plan].label;
}

export function clampMonths(value: unknown): number {
  return Math.max(1, Math.min(36, Number(value) || 12));
}

export function clampQuota(value: unknown, fallback = PLANS.decouverte.maxProducts): number {
  return Math.max(1, Math.min(MAX_PRODUCTS, Number(value) || fallback));
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const daysInTargetMonth = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  result.setUTCDate(Math.min(day, daysInTargetMonth));
  return result;
}

export function proratedPrice(plan: PlanId, months: number, promoApplied: boolean): number {
  const annual = planPrice(plan, promoApplied);
  if (annual === 0) return 0;
  return Math.round((annual * months) / 12);
}
