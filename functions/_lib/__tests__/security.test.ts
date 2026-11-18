import { describe, it, expect } from 'vitest';
import {
  sha256Hex,
  safeEqualStrings,
  hashPin,
  verifyPin,
  rateLimitResponse,
  verifySameOrigin,
} from '../security';

describe('Security: sha256Hex', () => {
  it('computes correct sha256 hex string', async () => {
    // sha256 of empty string is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const hash = await sha256Hex('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    const testHash = await sha256Hex('vitrine-express');
    expect(testHash).toHaveLength(64);
  });
});

describe('Security: safeEqualStrings', () => {
  it('returns true for matching strings', () => {
    expect(safeEqualStrings('super-secret-key', 'super-secret-key')).toBe(true);
    expect(safeEqualStrings('', '')).toBe(true);
  });

  it('returns false for non-matching strings of same length', () => {
    expect(safeEqualStrings('abcd', 'abce')).toBe(false);
  });

  it('returns false for strings of different length', () => {
    expect(safeEqualStrings('abcd', 'abcde')).toBe(false);
    expect(safeEqualStrings('admin', '')).toBe(false);
  });
});

describe('Security: hashPin and verifyPin', () => {
  const pepper = 'test-secret-pepper-2026';

  it('hashes a PIN and successfully verifies it', async () => {
    const pin = '1234';
    const hashed = await hashPin(pin, pepper);

    expect(hashed.startsWith('hmac-sha256$')).toBe(true);

    const verification = await verifyPin(pin, hashed, pepper);
    expect(verification.valid).toBe(true);
    expect(verification.needsRehash).toBe(false);
  });

  it('rejects wrong PIN against hashed PIN', async () => {
    const hashed = await hashPin('1234', pepper);
    const verification = await verifyPin('9999', hashed, pepper);

    expect(verification.valid).toBe(false);
  });

  it('handles legacy plain-text PIN migration with needsRehash', async () => {
    const plainPin = '4321';
    const verification = await verifyPin('4321', plainPin, pepper);

    expect(verification.valid).toBe(true);
    expect(verification.needsRehash).toBe(true);
  });

  it('throws error when pepper is missing', async () => {
    await expect(hashPin('1234', '')).rejects.toThrow('PIN_PEPPER manquant');
    await expect(verifyPin('1234', 'stored', '')).rejects.toThrow('PIN_PEPPER manquant');
  });

  it('returns false for empty or null stored value', async () => {
    const result = await verifyPin('1234', null, pepper);
    expect(result.valid).toBe(false);
  });
});

describe('Security: rateLimitResponse', () => {
  it('generates 429 response with Retry-After header', async () => {
    const res = rateLimitResponse(120);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('120');

    const data = await res.json();
    expect(data.error).toContain('Trop de tentatives');
  });
});

describe('Security: verifySameOrigin (Anti-CSRF)', () => {
  it('allows safe methods (GET, HEAD, OPTIONS) regardless of Origin', () => {
    const req = new Request('https://vitrine-express.pages.dev/api/stores', {
      method: 'GET',
      headers: { Origin: 'https://malicious-site.com' },
    });
    expect(verifySameOrigin(req)).toBeNull();
  });

  it('allows mutating requests when Origin matches request origin', () => {
    const req = new Request('https://vitrine-express.pages.dev/api/merchant/products', {
      method: 'POST',
      headers: { Origin: 'https://vitrine-express.pages.dev' },
    });
    expect(verifySameOrigin(req)).toBeNull();
  });

  it('allows requests without Origin header (e.g. server-to-server or tests)', () => {
    const req = new Request('https://vitrine-express.pages.dev/api/merchant/products', {
      method: 'POST',
    });
    expect(verifySameOrigin(req)).toBeNull();
  });

  it('allows localhost to localhost for local development', () => {
    const req = new Request('http://localhost:8788/api/merchant/products', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(verifySameOrigin(req)).toBeNull();
  });

  it('blocks cross-origin mutating requests with 403', async () => {
    const req = new Request('https://vitrine-express.pages.dev/api/merchant/products', {
      method: 'POST',
      headers: { Origin: 'https://attacker.evil' },
    });
    const denial = verifySameOrigin(req);
    expect(denial).not.toBeNull();
    expect(denial?.status).toBe(403);
    const body = await denial?.json();
    expect(body.error).toContain('CSRF bloqué');
  });
});
