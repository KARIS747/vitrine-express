export type AnalyticsEvent = 'landing_open' | 'store_created' | 'whatsapp_order_click';

const ALLOWED_EVENTS = new Set<AnalyticsEvent>(['landing_open', 'store_created', 'whatsapp_order_click']);

export function normalizeAnalyticsEvent(value: unknown): AnalyticsEvent | null {
  const event = String(value ?? '').trim();
  return ALLOWED_EVENTS.has(event as AnalyticsEvent) ? (event as AnalyticsEvent) : null;
}

export function sanitizeAnalyticsText(value: unknown, max = 80): string | null {
  const text = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);
  return text || null;
}

export async function recordAnalyticsEvent(
  db: any,
  event: AnalyticsEvent,
  data: { storeRef?: unknown; campaign?: unknown } = {},
): Promise<boolean> {
  try {
    await db
      .prepare(`
        INSERT INTO analytics_events (id, event, store_ref, campaign, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        `evt_${crypto.randomUUID().slice(0, 8)}`,
        event,
        sanitizeAnalyticsText(data.storeRef),
        sanitizeAnalyticsText(data.campaign),
        new Date().toISOString(),
      )
      .run();
    return true;
  } catch {
    return false;
  }
}
