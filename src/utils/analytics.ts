export type ClientAnalyticsEvent = 'landing_open' | 'whatsapp_order_click';

export function trackEvent(
  event: ClientAnalyticsEvent,
  data: { storeRef?: string | null; campaign?: string | null } = {},
): void {
  try {
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        storeRef: data.storeRef ?? null,
        campaign: data.campaign ?? null,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    return;
  }
}
