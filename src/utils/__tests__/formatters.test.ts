import { describe, it, expect } from 'vitest';
import {
  formatFCFA,
  formatDate,
  getDaysRemaining,
  buildWhatsAppCartOrderLink,
  buildWhatsAppOrderLink,
  buildWhatsAppContactLink,
  CartItem,
} from '../formatters';
import { Product } from '../../types';

describe('formatFCFA', () => {
  it('formats amounts in FCFA with proper separators', () => {
    const formatted = formatFCFA(38000, 'fr');
    // Accepte espace simple ou insécable selon l'environnement Intl
    expect(formatted.replace(/\s/g, ' ')).toBe('38 000 FCFA');
  });

  it('handles 0 correctly', () => {
    expect(formatFCFA(0)).toBe('0 FCFA');
  });

  it('handles invalid inputs gracefully', () => {
    expect(formatFCFA(NaN)).toBe('0 FCFA');
    // @ts-expect-error test invalid type
    expect(formatFCFA(undefined)).toBe('0 FCFA');
  });

  it('formats correctly in English', () => {
    const formatted = formatFCFA(50000, 'en');
    expect(formatted).toBe('50,000 FCFA');
  });
});

describe('formatDate', () => {
  it('returns empty string for empty inputs', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('formats dates in French format', () => {
    const result = formatDate('2026-11-04', 'fr');
    expect(result).toMatch(/4 nov\.? 2026/);
  });

  it('formats dates in English format', () => {
    const result = formatDate('2026-11-04', 'en');
    expect(result).toMatch(/Nov 4, 2026/);
  });

  it('returns raw string if invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('getDaysRemaining', () => {
  it('returns 0 for past dates or empty inputs', () => {
    expect(getDaysRemaining(null)).toBe(0);
    expect(getDaysRemaining('')).toBe(0);
    expect(getDaysRemaining('2020-01-01')).toBe(0);
  });

  it('calculates days remaining for future dates', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const days = getDaysRemaining(future);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });
});

describe('WhatsApp Links', () => {
  const sampleProduct: Product = {
    id: '1',
    store_id: '10',
    name: 'Chaussure Cuir',
    price: 15000,
    image_url: 'https://example.com/img.jpg',
    is_available: 1,
    sort_order: 0,
    created_at: '2026-10-01',
  };

  it('cleans phone numbers and generates order link in French', () => {
    const link = buildWhatsAppOrderLink('+237 6 99 88 77 66', 'Boutique Karis', sampleProduct, 'boutique-karis', 'fr');
    expect(link.startsWith('https://wa.me/237699887766?text=')).toBe(true);

    const decoded = decodeURIComponent(link.split('?text=')[1]);
    expect(decoded).toContain('Bonjour *Boutique Karis* !');
    expect(decoded).toContain('Chaussure Cuir');
    expect(decoded).toContain('15');
    expect(decoded).toContain('FCFA');
    expect(decoded).toContain('DISPONIBLE');
  });

  it('generates out of stock / restock notification if product is unavailable', () => {
    const outOfStock: Product = {
      ...sampleProduct,
      is_available: 0,
      restock_date: '2026-12-01',
    };
    const link = buildWhatsAppOrderLink('237655443322', 'Test Store', outOfStock, 'test-store', 'fr');
    const decoded = decodeURIComponent(link.split('?text=')[1]);
    expect(decoded).toContain('Arrivage prévu le');
  });

  it('builds multi-product cart order link correctly', () => {
    const items: CartItem[] = [
      { product: sampleProduct, quantity: 2 },
      {
        product: {
          ...sampleProduct,
          id: '2',
          name: 'Ceinture Luxe',
          price: 5000,
        },
        quantity: 1,
      },
    ];

    const link = buildWhatsAppCartOrderLink('677112233', 'Mode Express', items, 'mode-express', 'fr');
    expect(link.startsWith('https://wa.me/677112233?text=')).toBe(true);

    const decoded = decodeURIComponent(link.split('?text=')[1]);
    expect(decoded).toContain('Total : 35'); // 15000*2 + 5000 = 35000
    expect(decoded).toContain('Chaussure Cuir* x2');
    expect(decoded).toContain('Ceinture Luxe* x1');
  });

  it('builds general contact link in French and English', () => {
    const linkFr = buildWhatsAppContactLink('+237 690-00-11-22', 'Karis Store', 'fr');
    expect(linkFr.startsWith('https://wa.me/237690001122?text=')).toBe(true);
    expect(decodeURIComponent(linkFr)).toContain('Bonjour Karis Store !');

    const linkEn = buildWhatsAppContactLink('237690001122', 'Karis Store', 'en');
    expect(decodeURIComponent(linkEn)).toContain('Hello Karis Store!');
  });
});
