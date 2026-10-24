import { Product } from '../types';

/**
 * Formate un montant en Francs CFA (XAF) de manière lisible
 * Exemple: 38000 -> "38 000 FCFA"
 */
export function formatFCFA(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

/**
 * Formate une date au format français agréable
 * Exemple: "2026-11-04" -> "4 nov. 2026"
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
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
 */
export function buildWhatsAppOrderLink(
  whatsappNumber: string,
  storeName: string,
  product: Product,
  storeSlug?: string
): string {
  // Nettoyage du numéro (retirer espaces, +, tirets)
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');

  const isAvailable = Boolean(product.is_available);
  const statusNote = isAvailable 
    ? "✅ Noté comme DISPONIBLE en stock" 
    : `⏳ Arrivage prévu le : ${formatDate(product.restock_date) || 'bientôt'}`;

  // Message soigné et professionnel, orienté conversion directe
  const message = [
    `Bonjour *${storeName}* !`,
    ``,
    `J'ai vu cet article sur votre vitrine en ligne et je souhaite passer commande :`,
    `👉 *${product.name}*`,
    `💰 *Prix : ${formatFCFA(product.price)}*`,
    statusNote,
    ``,
    `Pouvez-vous me confirmer la disponibilité et les modalités de livraison ? Merci !`
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien de contact général de la boutique
 */
export function buildWhatsAppContactLink(whatsappNumber: string, storeName: string): string {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const message = `Bonjour *${storeName}*, je vous contacte depuis votre vitrine en ligne. J'ai une question sur vos produits !`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
