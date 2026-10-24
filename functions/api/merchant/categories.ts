// Cloudflare Pages Function: /api/merchant/categories
// Gestion des catégories d'une boutique (Ajout / Suppression)

interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 500 });

  try {
    const { storeId, licenseKey, pinCode, name } = await context.request.json() as any;

    if (!storeId || !licenseKey || !pinCode || !name?.trim()) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    // Authentification
    const store = await db
      .prepare(`SELECT id FROM stores WHERE id = ? AND license_key = ? AND pin_code = ? AND is_active = 1`)
      .bind(storeId, licenseKey.trim(), pinCode.trim())
      .first();

    if (!store) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403 });
    }

    const cleanName = name.trim().slice(0, 50);
    const cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newId = 'cat_' + Date.now().toString(36);

    // Récupérer l'ordre max
    const maxOrderRes = await db
      .prepare(`SELECT MAX(sort_order) as max_order FROM categories WHERE store_id = ?`)
      .bind(storeId)
      .first();

    const nextOrder = (maxOrderRes?.max_order || 0) + 1;

    await db
      .prepare(`INSERT INTO categories (id, store_id, name, slug, sort_order) VALUES (?, ?, ?, ?, ?)`)
      .bind(newId, storeId, cleanName, cleanSlug, nextOrder)
      .run();

    return new Response(JSON.stringify({
      success: true,
      category: { id: newId, store_id: storeId, name: cleanName, slug: cleanSlug, sort_order: nextOrder }
    }), { status: 201 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestDelete = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 500 });

  try {
    const { storeId, licenseKey, pinCode, categoryId } = await context.request.json() as any;

    const store = await db
      .prepare(`SELECT id FROM stores WHERE id = ? AND license_key = ? AND pin_code = ? AND is_active = 1`)
      .bind(storeId, licenseKey.trim(), pinCode.trim())
      .first();

    if (!store) return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403 });

    // Dissocier les produits de cette catégorie
    await db
      .prepare(`UPDATE products SET category_id = NULL WHERE category_id = ? AND store_id = ?`)
      .bind(categoryId, storeId)
      .run();

    // Supprimer la catégorie
    await db
      .prepare(`DELETE FROM categories WHERE id = ? AND store_id = ?`)
      .bind(categoryId, storeId)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
