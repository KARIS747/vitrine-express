import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPost, onRequestPatch } from '../licenses';
import { createMockD1 } from '../../../_lib/__tests__/mockD1';

describe('Admin API: /api/admin/licenses', () => {
  const ADMIN_KEY = 'super-secret-admin-pass-2026';
  const PIN_PEPPER = 'secret-pepper-2026';

  const sampleStore = {
    id: 'store_123',
    slug: 'boutique-test',
    name: 'Boutique Test',
    whatsapp_number: '237699112233',
    city: 'Douala',
    quarter: 'Akwa',
    max_products: 20,
    pin_code: 'hmac-sha256$salt$hash',
    expires_at: '2026-12-31T23:59:59.000Z',
    is_active: 1,
    created_at: '2026-10-01',
  };

  const authHeaders = {
    'X-Admin-Key': ADMIN_KEY,
    'Content-Type': 'application/json',
  };

  describe('Authentication Guard', () => {
    it('blocks request without admin key or session (401)', async () => {
      const db = createMockD1({ stores: [sampleStore] });
      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'GET',
      });

      const res = await onRequestGet({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(401);
    });
  });

  describe('onRequestGet (List Stores)', () => {
    it('returns stores list and strips PIN hashes for security', async () => {
      const db = createMockD1({ stores: [sampleStore] });
      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'GET',
        headers: authHeaders,
      });

      const res = await onRequestGet({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.stores).toHaveLength(1);
      expect(data.stores[0].name).toBe('Boutique Test');
      // Crucial security check: pin_code must NEVER be returned to the client
      expect(data.stores[0].pin_code).toBeUndefined();
    });
  });

  describe('onRequestPost (Create Store & License)', () => {
    it('rejects creation if storeName is missing', async () => {
      const db = createMockD1();
      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ storeName: '', whatsappNumber: '237699887766' }),
      });

      const res = await onRequestPost({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('nom de la boutique est obligatoire');
    });

    it('rejects creation if WhatsApp number is invalid', async () => {
      const db = createMockD1();
      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ storeName: 'Karis Store', whatsappNumber: '123' }),
      });

      const res = await onRequestPost({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Numéro WhatsApp invalide');
    });

    it('rejects creation if slug already exists (409)', async () => {
      const db = createMockD1({ stores: [sampleStore] });
      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          storeName: 'Boutique Test',
          slug: 'boutique-test',
          whatsappNumber: '237699887766',
        }),
      });

      const res = await onRequestPost({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('déjà utilisé');
    });

    it('creates store, category, and license successfully', async () => {
      const db = createMockD1();
      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          storeName: 'Nouvelle Boutique',
          slug: 'nouvelle-boutique',
          whatsappNumber: '237655443322',
          city: 'Douala',
          quarter: 'Bonamoussadi',
          maxProducts: 50,
          durationMonths: 12,
        }),
      });

      const res = await onRequestPost({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.licenseKey).toMatch(/^LIC-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(data.pinCode).toHaveLength(6); // Default generated PIN
      expect(data.expiresAt).toBeTruthy();
    });
  });

  describe('onRequestPatch (Admin Actions)', () => {
    it('updates product quota successfully (updateQuota)', async () => {
      const currentStore = { ...sampleStore, id: 'store_123', max_products: 20 };
      const db = createMockD1({ stores: [currentStore] });

      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          storeId: 'store_123',
          action: 'updateQuota',
          maxProducts: 80,
        }),
      });

      const res = await onRequestPatch({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(currentStore.max_products).toBe(80);
    });

    it('resets merchant PIN code and returns clear PIN (resetPin)', async () => {
      const currentStore = { ...sampleStore, id: 'store_123' };
      const db = createMockD1({ stores: [currentStore] });

      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          storeId: 'store_123',
          action: 'resetPin',
        }),
      });

      const res = await onRequestPatch({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.pinCode).toBeTruthy();
      expect(data.pinCode).toHaveLength(6);
      expect(currentStore.pin_code.startsWith('hmac-sha256$')).toBe(true);
    });

    it('renews license and extends expiry (renew)', async () => {
      const currentStore = { ...sampleStore, id: 'store_123', expires_at: '2026-12-01T00:00:00.000Z' };
      const db = createMockD1({ stores: [currentStore] });

      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          storeId: 'store_123',
          action: 'renew',
          additionalMonths: 12,
        }),
      });

      const res = await onRequestPatch({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(new Date(currentStore.expires_at).getFullYear()).toBe(2027);
    });

    it('toggles store active status (toggleStatus)', async () => {
      const currentStore = { ...sampleStore, id: 'store_123', is_active: 1 };
      const db = createMockD1({ stores: [currentStore] });

      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          storeId: 'store_123',
          action: 'toggleStatus',
        }),
      });

      const res = await onRequestPatch({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(200);
      expect(currentStore.is_active).toBe(0);
    });

    it('returns 400 for unknown action', async () => {
      const db = createMockD1({ stores: [sampleStore] });
      const req = new Request('http://localhost/api/admin/licenses', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          storeId: 'store_123',
          action: 'invalidAction',
        }),
      });

      const res = await onRequestPatch({
        request: req,
        env: { DB: db, ADMIN_KEY, PIN_PEPPER },
      });

      expect(res.status).toBe(400);
    });
  });
});
