import { describe, it, expect } from 'vitest';
import { onRequestPost } from '../login';
import { createMockD1 } from '../../../_lib/__tests__/mockD1';

describe('Admin API: POST /api/admin/login', () => {
  const ADMIN_KEY = 'super-secret-admin-pass-2026';
  const PIN_PEPPER = 'secret-pepper-2026';

  it('rejects login with 401 when ADMIN_KEY does not match', async () => {
    const db = createMockD1();
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: 'wrong-key' }),
    });

    const res = await onRequestPost({
      request: req,
      env: { DB: db, ADMIN_KEY, PIN_PEPPER },
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Accès administrateur non autorisé');
  });

  it('authenticates successfully and issues HttpOnly session cookie', async () => {
    const db = createMockD1();
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: ADMIN_KEY, rememberDevice: true }),
    });

    const res = await onRequestPost({
      request: req,
      env: { DB: db, ADMIN_KEY, PIN_PEPPER },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('ve_admin_session=');
    expect(setCookie).toContain('HttpOnly');

    // Verify session stored in DB
    expect(db.sessions.length).toBe(1);
    expect(db.sessions[0].scope).toBe('admin');
  });

  it('returns 500 when database is not available', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ adminKey: ADMIN_KEY }),
    });

    const res = await onRequestPost({
      request: req,
      env: { DB: null as any, ADMIN_KEY, PIN_PEPPER },
    });

    expect(res.status).toBe(500);
  });
});
