import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPost } from '../notifications';
import { createMockD1 } from '../../../_lib/__tests__/mockD1';

describe('Admin Notifications API: /api/admin/notifications', () => {
  const ADMIN_KEY = 'super-secret-admin-key-2026';

  function createFixture() {
    const store = {
      id: 'store_alpha',
      name: 'Alpha Shoes',
      slug: 'alpha-shoes',
      whatsapp_number: '237699001122',
    };

    const notifs = [
      {
        id: 'notif_1',
        store_id: 'store_alpha',
        title: 'Rappel paiement',
        message: 'Votre Plan Pro est en attente',
        type: 'warning',
        created_at: '2026-11-21T12:00:00.000Z',
      },
    ];

    const db = createMockD1({
      stores: [store],
      notifications: notifs,
    });

    return { db, store };
  }

  it('rejects unauthorized requests (401)', async () => {
    const { db } = createFixture();
    const req = new Request('http://localhost/api/admin/notifications', {
      method: 'GET',
    });

    const res = await onRequestGet({ request: req, env: { DB: db, ADMIN_KEY } });
    expect(res.status).toBe(401);
  });

  it('allows authorized admin to list notifications with store names', async () => {
    const { db } = createFixture();
    const req = new Request('http://localhost/api/admin/notifications', {
      method: 'GET',
      headers: {
        'X-Admin-Key': ADMIN_KEY,
      },
    });

    const res = await onRequestGet({ request: req, env: { DB: db, ADMIN_KEY } });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].store_name).toBe('Alpha Shoes');
  });

  it('validates notification title and message length (400)', async () => {
    const { db } = createFixture();
    const req = new Request('http://localhost/api/admin/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
      },
      body: JSON.stringify({
        title: 'A',
        message: 'Hi',
      }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db, ADMIN_KEY } });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('titre');
  });

  it('broadcasts a general notification when storeId is null', async () => {
    const { db } = createFixture();
    const req = new Request('http://localhost/api/admin/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
      },
      body: JSON.stringify({
        storeId: null,
        title: 'Bonne fête à tous les commerçants !',
        message: 'Profitez de cette journée pour booster vos ventes sur WhatsApp.',
        type: 'info',
      }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db, ADMIN_KEY } });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.notification.store_id).toBeNull();
    expect(data.notification.title).toBe('Bonne fête à tous les commerçants !');
  });
});
