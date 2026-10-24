// Cloudflare Pages Function: POST /api/merchant/login
// Authentification du boutiquier avec sa licence et son code PIN

interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: "Base de données non configurée" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { licenseKey, pinCode } = await context.request.json() as any;

    if (!licenseKey || !pinCode) {
      return new Response(JSON.stringify({ error: "Clé de licence et code PIN obligatoires" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const store = await db
      .prepare(`SELECT * FROM stores WHERE (license_key = ? OR slug = ?) AND pin_code = ?`)
      .bind(licenseKey.trim(), licenseKey.trim().toLowerCase(), pinCode.trim())
      .first();

    if (!store) {
      return new Response(JSON.stringify({ error: "Identifiants invalides" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (store.is_active === 0) {
      return new Response(JSON.stringify({ error: "Cette boutique a été suspendue par l'administrateur" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Récupérer le nombre de produits actuels
    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM products WHERE store_id = ?`)
      .bind(store.id)
      .first();

    const currentProductCount = countResult ? countResult.total : 0;

    return new Response(JSON.stringify({
      success: true,
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        tagline: store.tagline,
        whatsapp_number: store.whatsapp_number,
        city: store.city,
        quarter: store.quarter,
        max_products: store.max_products,
        expires_at: store.expires_at,
        currentProductCount
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
