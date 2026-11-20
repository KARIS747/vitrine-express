import { describe, it, expect } from 'vitest';
import { onRequestPost } from '../login';
import { onRequestGet as onSessionGet } from '../session';
import { onRequestPost as onLogoutPost } from '../logout';
import { createMockD1 } from '../../../_lib/__tests__/mockD1';
import { hashPin, MERCHANT_SESSION_COOKIE } from '../../../_lib/security';

describe('Merchant Auth API: /api/merchant/login, session, logout', () => {
  const PEPPER = 'test-pepper-merchant';
  const PIN = '1234';

  async function createFixture() {
    const pinHash = await hashPin(PIN, PEPPER);
    const store = {
      id: 'store_m1',
      slug: 'mode-paris',
      name: 'Mode Paris',
      whatsapp_number: '237699000000',
      license_key: 'LIC-PARIS-2026',
      pin_code: pinHash,
      is_active: 1,
      max_products: 8,
      expires_at: '2030-01-01T00:00:00.000Z',
    };
    const db = createMockD1({ stores: [store] });
    return { db, store };
  }

  it('rejects missing credentials (400)', async () => {
    const { db } = await createFixture();
    const req = new Request('http://localhost/api/merchant/login', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: '', pinCode: '' }),
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(400);
  });

  it('rejects invalid PIN (401)', async () => {
    const { db } = await createFixture();
    const req = new Request('http://localhost/api/merchant/login', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: 'mode-paris', pinCode: '9999' }),
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(401);
  });

  it('allows merchant login via slug and returns session cookie', async () => {
    const { db } = await createFixture();
    const req = new Request('http://localhost/api/merchant/login', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: 'mode-paris', pinCode: PIN }),
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.store.name).toBe('Mode Paris');

    const cookieHeader = res.headers.get('Set-Cookie');
    expect(cookieHeader).toContain(`${MERCHANT_SESSION_COOKIE}=`);
    expect(cookieHeader).toContain('HttpOnly');
  });

  it('allows merchant login via license key', async () => {
    const { db } = await createFixture();
    const req = new Request('http://localhost/api/merchant/login', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: 'LIC-PARIS-2026', pinCode: PIN }),
    });
    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.store.slug).toBe('mode-paris');
  });

  it('session endpoint returns store when cookie is valid and revokes on logout', async () => {
    const { db, store } = await createFixture();
    // Simulate active session in DB
    const token = 'token_abc123';
    // sha256 token hash
    const tokenHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
    ).map((b) => b.toString(16).padStart(2, '0')).join('');

    db.sessions.push({
      token_hash: tokenHash,
      scope: 'merchant',
      store_id: store.id,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });

    const sessionReq = new Request('http://localhost/api/merchant/session', {
      method: 'GET',
      headers: {
        Cookie: `${MERCHANT_SESSION_COOKIE}=${token}`,
      },
    });
    const sessionRes = await onSessionGet({ request: sessionReq, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(sessionRes.status).toBe(200);
    const sessionData = await sessionRes.json() as any;
    expect(sessionData.store.slug).toBe('mode-paris');

    // Logout
    const logoutReq = new Request('http://localhost/api/merchant/logout', {
      method: 'POST',
      headers: {
        Cookie: `${MERCHANT_SESSION_COOKIE}=${token}`,
      },
    });
    const logoutRes = await onLogoutPost({ request: logoutReq, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get('Set-Cookie')).toContain('Expires=');
  });
});
