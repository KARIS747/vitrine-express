import { guardAdmin, json, type SecurityEnv } from '../../_lib/security';

export const onRequestGet = async (context: { request: Request; env: SecurityEnv }) => {
  const denial = await guardAdmin(context.request, context.env);
  if (denial) return denial;

  const emptyTotals = {
    landingOpens: 0,
    storeCreated: 0,
    whatsappClicks: 0,
    stores: 0,
    storesWithProducts: 0,
  };

  try {
    const db = context.env.DB;
    const events = await db
      .prepare('SELECT event, COUNT(*) AS total FROM analytics_events GROUP BY event')
      .all();
    const campaigns = await db
      .prepare("SELECT campaign, COUNT(*) AS total FROM analytics_events WHERE campaign IS NOT NULL AND campaign <> '' GROUP BY campaign ORDER BY total DESC LIMIT 5")
      .all();
    const storesRow = await db.prepare('SELECT COUNT(*) AS total FROM stores').first();
    const activeStoresRow = await db.prepare('SELECT COUNT(DISTINCT store_id) AS total FROM products').first();

    const byEvent: Record<string, number> = {};
    for (const row of events.results ?? []) {
      byEvent[String(row.event)] = Number(row.total) || 0;
    }

    return json({
      success: true,
      totals: {
        landingOpens: byEvent.landing_open ?? 0,
        storeCreated: byEvent.store_created ?? 0,
        whatsappClicks: byEvent.whatsapp_order_click ?? 0,
        stores: Number(storesRow?.total) || 0,
        storesWithProducts: Number(activeStoresRow?.total) || 0,
      },
      campaigns: campaigns.results ?? [],
    });
  } catch {
    return json({ success: true, totals: emptyTotals, campaigns: [] });
  }
};
