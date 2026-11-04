import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbService } from '../db';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

describe('Frontend Service: dbService (Admin)', () => {
  const localStorageMock = createStorageMock();
  const sessionStorageMock = createStorageMock();

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
    Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, configurable: true, writable: true });
    localStorageMock.clear();
    sessionStorageMock.clear();
    dbService.clearAdminKey();
  });

  it('loginAdmin succeeds and saves admin authentication in storage', async () => {
    const mockStore = {
      id: 'store_1',
      name: 'Boutique Alpha',
      slug: 'alpha',
      whatsapp_number: '237699112233',
      city: 'Douala',
      is_active: 1,
      max_products: 20,
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/admin/login')) {
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      }
      if (url.endsWith('/api/admin/licenses')) {
        return Promise.resolve(new Response(JSON.stringify({ success: true, stores: [mockStore] }), { status: 200 }));
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    const result = await dbService.loginAdmin('super-key', false);

    expect(result.success).toBe(true);
    expect(result.stores).toHaveLength(1);
    expect(result.stores?.[0].name).toBe('Boutique Alpha');
    expect(dbService.isAdminAuthenticated()).toBe(true);
  });

  it('loginAdmin fails with invalid credentials', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'Clé administrateur invalide' }), { status: 401 })
    );

    const result = await dbService.loginAdmin('wrong-key');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Clé administrateur invalide');
    expect(dbService.isAdminAuthenticated()).toBe(false);
  });

  it('updateStoreQuota sends PATCH updateQuota to server', async () => {
    const updatedStore = {
      id: 'store_1',
      name: 'Boutique Alpha',
      max_products: 60,
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, store: updatedStore }), { status: 200 })
    );

    const result = await dbService.updateStoreQuota('store_1', 60);

    expect(result.success).toBe(true);
    expect(result.store?.max_products).toBe(60);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/licenses',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ storeId: 'store_1', action: 'updateQuota', maxProducts: 60 }),
      })
    );
  });

  it('renewStoreLicense sends PATCH renew with additionalMonths', async () => {
    const renewedStore = {
      id: 'store_1',
      expires_at: '2027-11-04T00:00:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, store: renewedStore }), { status: 200 })
    );

    const result = await dbService.renewStoreLicense('store_1', 12);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/licenses',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ storeId: 'store_1', action: 'renew', additionalMonths: 12 }),
      })
    );
  });

  it('resetStorePin returns clear PIN code generated on server', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          store: { id: 'store_1' },
          pinCode: '654321',
        }),
        { status: 200 }
      )
    );

    const result = await dbService.resetStorePin('store_1');

    expect(result.success).toBe(true);
    expect(result.pinCode).toBe('654321');
  });

  it('createStoreByAdmin sends POST with required merchant attributes', async () => {
    const newStore = {
      id: 'store_new',
      name: 'Karis Store',
      slug: 'karis-store',
      whatsapp_number: '237699000000',
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          store: newStore,
          licenseKey: 'LIC-KARI-123456',
          pinCode: '112233',
          expiresAt: '2027-11-04',
        }),
        { status: 201 }
      )
    );

    const result = await dbService.createStoreByAdmin({
      name: 'Karis Store',
      whatsappNumber: '237699000000',
      city: 'Douala',
    });

    expect(result.store.name).toBe('Karis Store');
    expect(result.licenseKey).toBe('LIC-KARI-123456');
    expect(result.pinCode).toBe('112233');
  });
});
