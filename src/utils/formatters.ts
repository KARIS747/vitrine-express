import { Product } from '../types';
import { Language } from './i18n';

/**
 * Formate un montant en Francs CFA (XAF) de manière lisible
 * Exemple: 38000 -> "38 000 FCFA"
 */
export function formatFCFA(amount: number, lang: Language = 'fr'): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 FCFA';
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

/**
 * Formate une date au format agréable selon la langue
 * Exemple fr: "2026-11-04" -> "4 nov. 2026"
 * Exemple en: "2026-11-04" -> "Nov 4, 2026"
 */
export function formatDate(dateString?: string | null, lang: Language = 'fr'): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const locale = lang === 'en' ? 'en-US' : 'fr-FR';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Calcule le nombre de jours restants avant une date
 */
export function getDaysRemaining(dateString?: string | null): number {
  if (!dateString) return 0;
  const target = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Génère le lien WhatsApp officiel pré-rempli avec politesse et détails du produit
 * s'adapte à la langue (FR ou EN)
 */
export function buildWhatsAppOrderLink(
  whatsappNumber: string,
  storeName: string,
  product: Product,
  storeSlug?: string,
  lang: Language = 'fr'
): string {
  // Nettoyage du numéro (retirer espaces, +, tirets)
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');

  const isAvailable = Boolean(product.is_available);

  if (lang === 'en') {
    const statusNote = isAvailable 
      ? "✅ Listed as IN STOCK" 
      : `⏳ Restock scheduled for: ${formatDate(product.restock_date, 'en') || 'soon'}`;

    const message = [
      `Hello *${storeName}*!`,
      ``,
      `I saw this item on your online storefront and I would like to order:`,
      `👉 *${product.name}*`,
      `💰 *Price: ${formatFCFA(product.price, 'en')}*`,
      statusNote,
      ``,
      `Could you please confirm availability and delivery options? Thank you!`
    ].join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  const statusNote = isAvailable 
    ? "✅ Noté comme DISPONIBLE en stock" 
    : `⏳ Arrivage prévu le : ${formatDate(product.restock_date, 'fr') || 'bientôt'}`;

  // Message soigné et professionnel, orienté conversion directe
  const message = [
    `Bonjour *${storeName}* !`,
    ``,
    `J'ai vu cet article sur votre vitrine en ligne et je souhaite passer commande :`,
    `👉 *${product.name}*`,
    `💰 *Prix : ${formatFCFA(product.price, 'fr')}*`,
    statusNote,
    ``,
    `Pouvez-vous me confirmer la disponibilité et les modalités de livraison ? Merci !`
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien de contact général de la boutique
 */
export function buildWhatsAppContactLink(
  whatsappNumber: string,
  storeName: string,
  lang: Language = 'fr'
): string {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const greeting = lang === 'en'
    ? `Hello ${storeName}! I am contacting you from your online storefront.`
    : `Bonjour ${storeName} ! Je vous contacte depuis votre vitrine en ligne.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`;
}
