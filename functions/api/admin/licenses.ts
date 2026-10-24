// Cloudflare Pages Function: /api/admin/licenses (Sécurisé)
// Gestionnaire de Licences Karis (Super Admin)

interface Env {
  DB: any;
  ADMIN_KEY?: string;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 500 });

  // Sécurité : On vérifie le header HTTP 'X-Admin-Key' ou query param
  const url = new URL(context.request.url);
  const secretKey = context.request.headers.get("X-Admin-Key") || url.searchParams.get("adminKey");
  const expectedKey = context.env.ADMIN_KEY || "karis_admin_secret_key";

  if (!secretKey || secretKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Accès administrateur non autorisé" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { results: stores } = await db.prepare(`
      SELECT s.*, 
             COUNT(p.id) as current_products_count
      FROM stores s
      LEFT JOIN products p ON s.id = p.store_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all();

    return new Response(JSON.stringify({ success: true, stores }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 500 });

  try {
    const body = await context.request.json() as any;
    const { adminKey, storeName, slug, whatsappNumber, phoneCall, city, quarter, maxProducts = 20, durationMonths = 12, pinCode = "1234" } = body;

    const expectedKey = context.env.ADMIN_KEY || "karis_admin_secret_key";
    const providedKey = context.request.headers.get("X-Admin-Key") || adminKey;

    if (!providedKey || providedKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Clé admin incorrecte" }), { status: 401 });
    }

    const cleanSlug = (slug || storeName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const storeId = 'store_' + Date.now().toString(36);
    const licenseKey = 'LIC-' + cleanSlug.substring(0, 4).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + Number(durationMonths));
    const expiresAt = expiresDate.toISOString();

    // 1. Insérer la boutique
    await db.prepare(`
      INSERT INTO stores (
        id, slug, name, whatsapp_number, phone_call, city, quarter, 
        license_key, pin_code, max_products, expires_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      storeId,
      cleanSlug,
      storeName.trim().slice(0, 80),
      whatsappNumber.replace(/[^0-9]/g, ''),
      (phoneCall || whatsappNumber).slice(0, 30),
      (city || 'Douala').slice(0, 50),
      (quarter || '').slice(0, 80),
      licenseKey,
      pinCode.trim().slice(0, 10),
      Number(maxProducts),
      expiresAt
    ).run();

    // 2. Catégorie par défaut
    await db.prepare(`
      INSERT INTO categories (id, store_id, name, slug, sort_order)
      VALUES (?, ?, 'Tous les articles', 'all', 0)
    `).bind('cat_' + Date.now().toString(36), storeId).run();

    // 3. Enregistrement traçabilité licence
    await db.prepare(`
      INSERT INTO licenses (id, license_key, store_id, client_name, client_phone, price_paid, max_products, duration_months, expires_at)
      VALUES (?, ?, ?, ?, ?, 5000, ?, ?, ?)
    `).bind(
      'lic_' + Date.now().toString(36),
      licenseKey,
      storeId,
      storeName,
      whatsappNumber,
      Number(maxProducts),
      Number(durationMonths),
      expiresAt
    ).run();

    return new Response(JSON.stringify({
      success: true,
      storeId,
      slug: cleanSlug,
      licenseKey,
      pinCode,
      expiresAt
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
