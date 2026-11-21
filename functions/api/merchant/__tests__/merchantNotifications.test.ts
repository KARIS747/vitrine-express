import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPost } from '../notifications';
import { createMockD1 } from '../../../_lib/__tests__/mockD1';
import { MERCHANT_SESSION_COOKIE, hashPin } from '../../../_lib/security';

describe('Merchant Notifications API: /api/merchant/notifications', () => {
  const PEPPER = 'test-pepper-notifs';
  const PIN = '1234';

  async function createFixture() {
    const pinHash = await hashPin(PIN, PEPPER);
    const store = {
      id: 'store_notif_1',
      slug: 'boutique-test',
      name: 'Boutique Test',
      whatsapp_number: '237699112233',
      license_key: 'LIC-TEST-2026',
      pin_code: pinHash,
      is_active: 1,
      max_products: 8,
      expires_at: '2030-01-01T00:00:00.000Z',
    };

    const token = 'merchant_token_123';
    const tokenHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))),
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const session = {
      token_hash: tokenHash,
      scope: 'merchant',
      store_id: store.id,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    const notifs = [
      {
        id: 'notif_general_1',
        store_id: null,
        title: 'Mise à jour VitrineExpress',
        message: 'Nouvelle option disponible pour votre catalogue',
        type: 'info',
        link_url: null,
        created_at: '2026-11-21T10:00:00.000Z',
      },
      {
        id: 'notif_targeted_1',
        store_id: 'store_notif_1',
        title: 'Conseil de vente',
        message: 'Partagez votre lien de statut ce weekend',
        type: 'tip',
        link_url: null,
        created_at: '2026-11-21T11:00:00.000Z',
      },
    ];

    const db = createMockD1({
      stores: [store],
      sessions: [session],
      notifications: notifs,
      notification_reads: [],
    });

    return { db, store, token };
  }

  it('rejects unauthenticated requests (401)', async () => {
    const { db } = await createFixture();
    const req = new Request('http://localhost/api/merchant/notifications', {
      method: 'GET',
    });
    const res = await onRequestGet({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(401);
  });

  it('fetches broadcast and store-targeted notifications with unread count', async () => {
    const { db, token } = await createFixture();
    const req = new Request('http://localhost/api/merchant/notifications', {
      method: 'GET',
      headers: {
        Cookie: `${MERCHANT_SESSION_COOKIE}=${token}`,
      },
    });

    const res = await onRequestGet({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.notifications).toHaveLength(2);
    expect(data.unreadCount).toBe(2);
    expect(data.notifications[0].title).toBe('Mise à jour VitrineExpress');
  });

  it('marks a single notification as read', async () => {
    const { db, token } = await createFixture();
    const req = new Request('http://localhost/api/merchant/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${MERCHANT_SESSION_COOKIE}=${token}`,
      },
      body: JSON.stringify({ notificationId: 'notif_general_1' }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);

    // Verify it was marked as read
    expect(db.notificationReads).toHaveLength(1);
    expect(db.notificationReads[0].notification_id).toBe('notif_general_1');
  });

  it('rejects POST with 400 when notificationId is missing and markAllRead is false', async () => {
    const { db, token } = await createFixture();
    const req = new Request('http://localhost/api/merchant/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${MERCHANT_SESSION_COOKIE}=${token}`,
      },
      body: JSON.stringify({}),
    });

    const res = await onRequestPost({ request: req, env: { DB: db, PIN_PEPPER: PEPPER } });
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('requis');
  });
});
