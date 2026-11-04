import { describe, it, expect } from 'vitest';
import { extractStoreSlug } from '../storeLink';

describe('extractStoreSlug', () => {
  it('extracts direct slug', () => {
    expect(extractStoreSlug('chaussures-paul')).toBe('chaussures-paul');
    expect(extractStoreSlug('Mode2026')).toBe('mode2026');
  });

  it('extracts slug from boutique URL path', () => {
    expect(extractStoreSlug('https://vitrine-express.pages.dev/boutique/chaussures-paul')).toBe('chaussures-paul');
    expect(extractStoreSlug('/boutique/mode-express/')).toBe('mode-express');
  });

  it('extracts slug from query params (?store=...) ', () => {
    expect(extractStoreSlug('https://vitrine-express.pages.dev/?store=boutique-karis')).toBe('boutique-karis');
    expect(extractStoreSlug('/?store=super-store')).toBe('super-store');
  });

  it('handles URL without protocol', () => {
    expect(extractStoreSlug('vitrine-express.pages.dev/boutique/bijoux-dakar')).toBe('bijoux-dakar');
  });

  it('returns null for empty or invalid slugs', () => {
    expect(extractStoreSlug('')).toBe(null);
    expect(extractStoreSlug('   ')).toBe(null);
    expect(extractStoreSlug('https://google.com')).toBe(null);
  });
});
