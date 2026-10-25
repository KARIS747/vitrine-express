// Cloudflare Pages Function: GET /api/stores
// Liste publique des boutiques actives et non expirées.

interface Env {
  DB: any;
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });

export const onRequestGet = async (context: { env: Env }) => {
  const db = context.env.DB;
  if (!db) {
    return json({ error: "Base de données non configurée" }, 500);
  }

  try {
    const now = new Date().toISOString();
    const { results } = await db
      .prepare(`
        SELECT
          s.id,
          s.slug,
          s.name,
          s.tagline,
          s.description,
          s.whatsapp_number,
          s.phone_call,
          s.city,
          s.quarter,
          s.address_notes,
          s.logo_url,
          s.banner_url,
          s.theme_primary,
          s.theme_accent,
          s.max_products,
          s.expires_at,
          s.is_active,
          s.created_at,
          COUNT(p.id) AS current_products_count
        FROM stores s
        LEFT JOIN products p ON p.store_id = s.id
        WHERE s.is_active = 1 AND s.expires_at > ?
        GROUP BY s.id
        ORDER BY s.name ASC
      `)
      .bind(now)
      .all();

    return json({ stores: results ?? [] }, 200, {
      "Cache-Control": "no-store",
    });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};
