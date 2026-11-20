import { describe, it, expect } from 'vitest';
import { onRequestPost, onRequestDelete } from '../products';
import { onRequestPost as onCategoryPost } from '../categories';
import { createMockD1 } from '../../../_lib/__tests__/mockD1';
import { hashPin } from '../../../_lib/security';

describe('Merchant Management API: /api/merchant/products & categories', () => {
  const PEPPER = 'test-pepper-products';
  const PIN = '5678';

  async function createFixture(maxProducts = 8, existingCount = 0) {
    const pinHash = await hashPin(PIN, PEPPER);
    const store = {
      id: 'store_shoes',
      slug: 'shoes-douala',
      name: 'Shoes Douala',
      whatsapp_number: '237699334455',
      license_key: 'LIC-SHOES-2026',
      pin_code: pinHash,
      is_active: 1,
      max_products: maxProducts,
      expires_at: '2030-01-01T00:00:00.000Z',
    };

    const products = Array.from({ length: existingCount }, (_, i) => ({
      id: `prod_${i}`,
      store_id: store.id,
      category_id: null,
      name: `Chaussure ${i + 1}`,
      description: 'Super paire',
      price: 15000,
      image_url: 'data:image/jpeg;base64,sample',
      is_available: 1,
      restock_date: null,
      is_featured: 0,
      sort_order: i,
    }));

    const categories = [
      { id: 'cat_sneakers', store_id: store.id, name: 'Sneakers', slug: 'sneakers', sort_order: 1 },
    ];

    const db = createMockD1({ stores: [store], products, categories });
    return { db, store, categories };
  }

  it('validates product inputs (rejects negative price or empty name)', async () => {
    const { db, store } = await createFixture(8, 0);
    const req = new Request('http://localhost/api/merchant/products', {
      method: 'POST',
      body: JSON.stringify({
        storeId: store.id,
        licenseKey: store.license_key,
        pinCode: PIN,
        product: {
          name: '',
          price: -500,
          imageUrl: 'data:image/jpeg;base64,xyz',
        },
      }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe('Le nom du produit est obligatoire');
  });

  it('successfully creates a valid product when quota is not reached', async () => {
    const { db, store } = await createFixture(8, 2);
    const req = new Request('http://localhost/api/merchant/products', {
      method: 'POST',
      body: JSON.stringify({
        storeId: store.id,
        licenseKey: store.license_key,
        pinCode: PIN,
        product: {
          name: 'Nike Air Max',
          description: 'Chaussure de sport originale',
          price: 35000,
          imageUrl: 'data:image/jpeg;base64,validimage',
          categoryId: 'cat_sneakers',
          isAvailable: true,
        },
      }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.product.name).toBe('Nike Air Max');
    expect(data.product.price).toBe(35000);
  });

  it('blocks product creation when quota (max_products) is exceeded', async () => {
    // 8 out of 8 products reached
    const { db, store } = await createFixture(8, 8);
    const req = new Request('http://localhost/api/merchant/products', {
      method: 'POST',
      body: JSON.stringify({
        storeId: store.id,
        licenseKey: store.license_key,
        pinCode: PIN,
        product: {
          name: 'Puma Suede',
          price: 25000,
          imageUrl: 'data:image/jpeg;base64,validimage',
        },
      }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.limitReached).toBe(true);
    expect(data.error).toContain('Quota maximal de votre formule atteint');
  });

  it('rejects adding category belonging to another store or invalid length', async () => {
    const { db, store } = await createFixture(8, 0);
    const req = new Request('http://localhost/api/merchant/categories', {
      method: 'POST',
      body: JSON.stringify({
        storeId: store.id,
        licenseKey: store.license_key,
        pinCode: PIN,
        name: 'A', // too short (< 2)
      }),
    });

    const res = await onCategoryPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('au moins 2 caractères');
  });
});
