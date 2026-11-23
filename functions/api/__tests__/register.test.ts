import { describe, it, expect } from 'vitest';
import { onRequestPost } from '../register';
import { createMockD1 } from '../../_lib/__tests__/mockD1';

describe('Register API: POST /api/register', () => {
  const PIN_PEPPER = 'secret-pepper-2026';

  const basePayload = {
    storeName: 'Boutique Elegance',
    whatsappNumber: '237699112233',
    city: 'Douala',
    quarter: 'Akwa',
    contactPreference: 'whatsapp',
    pinCode: '1234',
  };

  const createRequest = (body: any) =>
    new Request('http://localhost/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.100',
      },
      body: JSON.stringify(body),
    });

  it('rejects with 400 when store name is too short', async () => {
    const db = createMockD1();
    const req = createRequest({ ...basePayload, storeName: 'A' });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('nom de la boutique');
  });

  it('rejects with 400 when WhatsApp number is invalid', async () => {
    const db = createMockD1();
    const req = createRequest({ ...basePayload, whatsappNumber: '123' });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Numéro WhatsApp invalide');
  });

  it('rejects with 400 when contact preference is email but email is missing or invalid', async () => {
    const db = createMockD1();
    const req = createRequest({
      ...basePayload,
      contactPreference: 'email',
      contactEmail: 'not-an-email',
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('adresse email valide');
  });

  it('rejects with 400 when PIN code is too short (< 4 chars)', async () => {
    const db = createMockD1();
    const req = createRequest({ ...basePayload, pinCode: '12' });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('code PIN');
  });

  it('rejects with 409 when WhatsApp number is already registered for an active store and does not leak store details', async () => {
    const existingStore = {
      id: 'store_existing',
      name: 'Ancienne Boutique',
      slug: 'ancienne-boutique',
      whatsapp_number: '237699112233',
      is_active: 1,
    };
    const db = createMockD1({ stores: [existingStore] });
    const req = createRequest(basePayload);
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('déjà associée');
    // Vérification de non-divulgation des données sensibles (anti-énumération)
    expect(body.error).not.toContain('Ancienne Boutique');
    expect(body.existingSlug).toBeUndefined();
  });

  it('rejects with 403 when cross-origin request attempts CSRF', async () => {
    const db = createMockD1();
    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil-hacker.com',
      },
      body: JSON.stringify(basePayload),
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('non autorisée');
  });

  it('creates store on Plan Découverte (8 products max) with WhatsApp contact and sets session cookie', async () => {
    const db = createMockD1();
    const req = createRequest(basePayload);
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.store).toBeDefined();
    expect(body.store.name).toBe('Boutique Elegance');
    expect(body.store.slug).toBe('boutique-elegance');
    expect(body.store.max_products).toBe(8);
    expect(body.licenseKey).toMatch(/^LIC-FREE-/);
    expect(body.pinCode).toBe('1234');

    // Vérifier la présence du cookie de session HttpOnly
    const cookieHeader = res.headers.get('Set-Cookie');
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain('ve_session=');
    expect(cookieHeader).toContain('HttpOnly');
  });

  it('creates store with Email contact preference when selected', async () => {
    const db = createMockD1();
    const req = createRequest({
      ...basePayload,
      contactPreference: 'email',
      contactEmail: 'contact@elegance.cm',
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.store.contact_preference).toBe('email');
    expect(body.store.contact_email).toBe('contact@elegance.cm');
  });

  it('creates store with custom country and WhatsApp contact', async () => {
    const db = createMockD1();
    const req = createRequest({
      ...basePayload,
      storeName: 'Boutique Abidjan Chic',
      country: 'Côte d’Ivoire',
      city: 'Abidjan',
      quarter: 'Cocody',
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.store.country).toBe('Côte d’Ivoire');
    expect(body.store.city).toBe('Abidjan');
    expect(body.store.quarter).toBe('Cocody');
  });

  it('rejects with 409 when store name is already used by an active store', async () => {
    const existingStore = {
      id: 'store_existing_name',
      name: 'Boutique Elegance',
      slug: 'boutique-elegance-old',
      whatsapp_number: '237699999999',
      is_active: 1,
    };
    const db = createMockD1({ stores: [existingStore] });
    const req = createRequest(basePayload);
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('déjà utilisé par une autre boutique');
  });

  it('creates store on Plan Pro with valid promo code VIP237 reducing price to 5000 FCFA', async () => {
    const db = createMockD1();
    const req = createRequest({
      ...basePayload,
      selectedPlan: 'pro',
      promoCode: 'VIP237',
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.selectedPlan).toBe('pro');
    expect(body.promoApplied).toBe(true);
    expect(body.priceDue).toBe(5000);
  });

  it('handles slug collisions by appending a suffix', async () => {
    const existing = {
      id: 'store_first',
      name: 'Different Name',
      slug: 'boutique-elegance',
      whatsapp_number: '237677000000',
      is_active: 1,
    };
    const db = createMockD1({ stores: [existing] });
    const req = createRequest(basePayload);
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER } });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.store.slug).toMatch(/^boutique-elegance-\d+/);
  });
});
