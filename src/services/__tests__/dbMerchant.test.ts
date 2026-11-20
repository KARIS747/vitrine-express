import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dbService } from '../db';

describe('Frontend Data Service: dbService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('loginMerchant', () => {
    it('returns success and saves session when login credentials are valid', async () => {
      const mockStore = {
        id: 'store_test',
        slug: 'boutique-cool',
        name: 'Boutique Cool',
        whatsapp_number: '237699112233',
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, store: mockStore }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await dbService.loginMerchant('boutique-cool', '1234');
      expect(result.success).toBe(true);
      expect(result.store?.slug).toBe('boutique-cool');
    });

    it('returns friendly error when merchant login fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: 'Identifiants invalides' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await dbService.loginMerchant('boutique-cool', '0000');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Identifiants invalides');
    });

    it('handles network failure gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const result = await dbService.loginMerchant('boutique-cool', '1234');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Erreur réseau');
    });
  });

  describe('registerStore', () => {
    it('sends autonomous registration and returns store credentials', async () => {
      const mockCreated = {
        success: true,
        store: { id: 's1', slug: 'mode-yaounde', name: 'Mode Yaoundé' },
        licenseKey: 'LIC-YAOUNDE-2026',
        pinCode: '4321',
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify(mockCreated),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await dbService.registerStore({
        storeName: 'Mode Yaoundé',
        whatsappNumber: '237677889900',
        city: 'Yaoundé',
        quarter: 'Bastos',
        contactPreference: 'whatsapp',
        pinCode: '4321',
      });

      expect(result.success).toBe(true);
      expect(result.licenseKey).toBe('LIC-YAOUNDE-2026');
      expect(result.pinCode).toBe('4321');
    });
  });
});
