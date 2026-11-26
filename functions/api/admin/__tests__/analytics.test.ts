import { describe, it, expect } from 'vitest';
import { onRequestGet } from '../analytics';
import { createMockD1 } from '../../../_lib/__tests__/mockD1';

describe('Admin API: GET /api/admin/analytics', () => {
  const ADMIN_KEY = 'super-secret-admin-pass-2026';

  it('requires an admin key', async () => {
    const db = createMockD1();
    const res = await onRequestGet({
      request: new Request('http://localhost/api/admin/analytics'),
      env: { DB: db, ADMIN_KEY },
    });
    expect(res.status).toBe(401);
  });

  it('returns prospecting totals and campaigns', async () => {
    const db = createMockD1({
      stores: [
        { id: 'store_1', name: 'Boutique Un', is_active: 1, expires_at: '2027-01-01T00:00:00Z' },
        { id: 'store_2', name: 'Boutique Deux', is_active: 1, expires_at: '2027-01-01T00:00:00Z' },
      ],
      products: [
        { id: 'prod_1', store_id: 'store_1' },
        { id: 'prod_2', store_id: 'store_1' },
      ],
      analytics_events: [
        { id: 'evt_1', event: 'landing_open', campaign: 'douala', created_at: '2026-11-26T10:00:00Z' },
        { id: 'evt_2', event: 'landing_open', campaign: 'douala', created_at: '2026-11-26T10:01:00Z' },
        { id: 'evt_3', event: 'whatsapp_order_click', store_ref: 'boutique-un', created_at: '2026-11-26T10:02:00Z' },
      ],
    });

    const res = await onRequestGet({
      request: new Request('http://localhost/api/admin/analytics', {
        headers: { 'X-Admin-Key': ADMIN_KEY },
      }),
      env: { DB: db, ADMIN_KEY },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totals).toMatchObject({
      landingOpens: 2,
      whatsappClicks: 1,
      stores: 2,
      storesWithProducts: 1,
    });
    expect(data.campaigns).toEqual([{ campaign: 'douala', total: 2 }]);
  });
});
