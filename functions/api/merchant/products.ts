// Cloudflare Pages Function: /api/merchant/products (Sécurisé)
// Contrôle d'accès strict (License + PIN), validation des entrées et respect du quota

interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 500 });

  try {
    const body = await context.request.json() as any;
    const { storeId, licenseKey, pinCode, product } = body;

    // 1. Authentification stricte de la boutique (License Key + PIN)
    if (!storeId || !licenseKey || !pinCode) {
      return new Response(JSON.stringify({ error: "Accès refusé : Identifiants incomplets" }), { status: 401 });
    }

    const store = await db
      .prepare(`SELECT * FROM stores WHERE id = ? AND license_key = ? AND pin_code = ? AND is_active = 1`)
      .bind(storeId, licenseKey.trim(), pinCode.trim())
      .first();

    if (!store) {
      return new Response(JSON.stringify({ error: "Authentification boutiquier invalide ou boutique suspendue" }), { status: 403 });
    }

    // 2. Contrôle d'expiration de la licence
    const now = new Date().toISOString();
    if (store.expires_at && store.expires_at < now) {
      return new Response(JSON.stringify({ error: "Votre licence a expiré. Veuillez contacter Karis pour le renouvellement." }), { status: 403 });
    }

    // 3. Validation et assainissement des entrées
    const cleanName = (product.name || '').trim().slice(0, 100);
    const cleanDesc = (product.description || '').trim().slice(0, 1000);
    const cleanPrice = Math.round(Number(product.price));

    if (!cleanName) {
      return new Response(JSON.stringify({ error: "Le nom du produit est obligatoire" }), { status: 400 });
    }
    if (isNaN(cleanPrice) || cleanPrice <= 0 || cleanPrice > 50000000) {
      return new Response(JSON.stringify({ error: "Prix invalide" }), { status: 400 });
    }

    // 4. Contrôle STRICT du quota (20 produits pour 5000 FCFA)
    const countRes = await db
      .prepare(`SELECT COUNT(*) as total FROM products WHERE store_id = ?`)
      .bind(storeId)
      .first();

    const currentTotal = countRes ? Number(countRes.total) : 0;
    const maxAllowed = Number(store.max_products || 20);

    if (currentTotal >= maxAllowed) {
      return new Response(JSON.stringify({ 
        error: `Quota maximal de votre formule atteint (${currentTotal}/${maxAllowed} articles). Contactez Karis pour étendre votre compte.`,
        limitReached: true,
        currentTotal,
        maxAllowed
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. Insertion protégée par requête paramétrée
    const newId = 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    await db
      .prepare(`
        INSERT INTO products (id, store_id, category_id, name, description, price, image_url, is_available, restock_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        newId,
        storeId,
        product.categoryId || null,
        cleanName,
        cleanDesc,
        cleanPrice,
        product.imageUrl,
        product.isAvailable ? 1 : 0,
        product.isAvailable ? null : product.restockDate || null
      )
      .run();

    return new Response(JSON.stringify({ success: true, id: newId }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Erreur serveur : " + err.message }), { status: 500 });
  }
};

export const onRequestPut = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 500 });

  try {
    const { storeId, licenseKey, pinCode, product } = await context.request.json() as any;

    const store = await db
      .prepare(`SELECT id FROM stores WHERE id = ? AND license_key = ? AND pin_code = ? AND is_active = 1`)
      .bind(storeId, licenseKey.trim(), pinCode.trim())
      .first();

    if (!store) return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403 });

    const cleanName = (product.name || '').trim().slice(0, 100);
    const cleanDesc = (product.description || '').trim().slice(0, 1000);
    const cleanPrice = Math.round(Number(product.price));

    await db
      .prepare(`
        UPDATE products 
        SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, restock_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND store_id = ?
      `)
      .bind(
        product.categoryId || null,
        cleanName,
        cleanDesc,
        cleanPrice,
        product.imageUrl,
        product.isAvailable ? 1 : 0,
        product.isAvailable ? null : product.restockDate || null,
        product.id,
        storeId
      )
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestDelete = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 500 });

  try {
    const { storeId, licenseKey, pinCode, productId } = await context.request.json() as any;

    const store = await db
      .prepare(`SELECT id FROM stores WHERE id = ? AND license_key = ? AND pin_code = ? AND is_active = 1`)
      .bind(storeId, licenseKey.trim(), pinCode.trim())
      .first();

    if (!store) return new Response(JSON.stringify({ error: "Accès non autorisé" }), { status: 403 });

    await db
      .prepare(`DELETE FROM products WHERE id = ? AND store_id = ?`)
      .bind(productId, storeId)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
