import { describe, it, expect } from 'vitest';
import { onRequestPost } from '../analytics';
import { createMockD1 } from '../../_lib/__tests__/mockD1';

describe('Analytics API: POST /api/analytics', () => {
  it('records a valid event with campaign', async () => {
    const db = createMockD1();
    const req = new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'landing_open',
        campaign: 'prospection_douala',
      }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(db.analyticsEvents).toHaveLength(1);
    expect(db.analyticsEvents[0]).toMatchObject({
      event: 'landing_open',
      campaign: 'prospection_douala',
    });
  });

  it('rejects unknown events', async () => {
    const db = createMockD1();
    const req = new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'unknown_event' }),
    });

    const res = await onRequestPost({ request: req, env: { DB: db } });

    expect(res.status).toBe(400);
    expect(db.analyticsEvents).toHaveLength(0);
  });
});
