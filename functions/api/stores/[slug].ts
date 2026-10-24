// Cloudflare Pages Function: GET /api/stores/[slug]
// Récupère la vitrine publique d'une boutique avec ses catégories et ses produits

interface Env {
  DB: any; // Cloudflare D1 Database binding
}

export const onRequestGet = async (context: { params: { slug: string }; env: Env }) => {
  const { slug } = context.params;
  const db = context.env.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: "Base de données non configurée" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 1. Récupérer la boutique
    const store = await db
      .prepare(`SELECT * FROM stores WHERE slug = ? AND is_active = 1`)
      .bind(slug)
      .first();

    if (!store) {
      return new Response(JSON.stringify({ error: "Boutique introuvable ou inactive" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Vérifier si la licence est expirée
    const now = new Date().toISOString();
    if (store.expires_at && store.expires_at < now) {
      return new Response(JSON.stringify({ 
        error: "Cette vitrine est momentanément indisponible (licence échue)",
        isExpired: true,
        storeName: store.name
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Ne pas exposer le code PIN publiquement
    delete (store as any).pin_code;

    // 3. Récupérer les catégories
    const { results: categories } = await db
      .prepare(`SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order ASC`)
      .bind(store.id)
      .all();

    // 4. Récupérer les produits
    const { results: products } = await db
      .prepare(`SELECT * FROM products WHERE store_id = ? ORDER BY is_featured DESC, sort_order ASC, created_at DESC`)
      .bind(store.id)
      .all();

    return new Response(JSON.stringify({
      store,
      categories,
      products
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=120"
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erreur serveur D1" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
