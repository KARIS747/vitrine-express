// Cloudflare Pages Function: GET /api/stores/[slug]
// Récupère la vitrine publique d'une boutique avec ses catégories et ses produits.
// Les champs privés (PIN, clé de licence) ne sont jamais exposés.

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

export const onRequestGet = async (context: { params: { slug: string }; env: Env }) => {
  const { slug } = context.params;
  const db = context.env.DB;

  if (!db) {
    return json({ error: "Base de données non configurée" }, 500);
  }

  try {
    const store = await db
      .prepare(`
        SELECT
          id, slug, name, tagline, description,
          whatsapp_number, phone_call, city, quarter, address_notes,
          logo_url, banner_url, theme_primary, theme_accent,
          max_products, expires_at, is_active,
          created_at, updated_at
        FROM stores
        WHERE slug = ? AND is_active = 1
      `)
      .bind(slug)
      .first();

    if (!store) {
      return json({ error: "Boutique introuvable ou inactive" }, 404);
    }

    const now = new Date().toISOString();
    if (store.expires_at && store.expires_at < now) {
      return json({
        error: "Cette vitrine est momentanément indisponible (licence échue)",
        isExpired: true,
        storeName: store.name,
      }, 403);
    }

    const { results: categories } = await db
      .prepare(`SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC`)
      .bind(store.id)
      .all();

    const { results: products } = await db
      .prepare(`SELECT * FROM products WHERE store_id = ? ORDER BY is_featured DESC, sort_order ASC, created_at DESC`)
      .bind(store.id)
      .all();

    return json({ store, categories, products }, 200, {
      "Cache-Control": "no-store",
    });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};
