// Cloudflare Pages Function: POST /api/merchant/login
// Authentification du boutiquier avec sa clé de licence (ou son slug) et son code PIN.

import {
  authenticateMerchantLogin,
  json,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

const publicStore = (store: any) => ({
  id: store.id,
  slug: store.slug,
  name: store.name,
  tagline: store.tagline,
  description: store.description,
  whatsapp_number: store.whatsapp_number,
  phone_call: store.phone_call,
  city: store.city,
  quarter: store.quarter,
  address_notes: store.address_notes,
  logo_url: store.logo_url,
  banner_url: store.banner_url,
  theme_primary: store.theme_primary,
  theme_accent: store.theme_accent,
  max_products: store.max_products,
  expires_at: store.expires_at,
  is_active: store.is_active,
  created_at: store.created_at,
});

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base de données non configurée" }, 500);

  try {
    const { licenseKey, pinCode } = await context.request.json() as any;
    const identifier = String(licenseKey ?? "").trim();
    const pin = String(pinCode ?? "").trim();

    if (!identifier || !pin) {
      return json({ error: "Clé de licence (ou identifiant boutique) et code PIN obligatoires" }, 400);
    }

    const auth = await authenticateMerchantLogin(
      db,
      context.request,
      identifier,
      pin,
      context.env.PIN_PEPPER ?? "",
    );
    if (auth.response) return auth.response;
    const store = auth.store;

    const countResult = await db
      .prepare(`SELECT COUNT(*) AS total FROM products WHERE store_id = ?`)
      .bind(store.id)
      .first();

    return json({
      success: true,
      store: {
        ...publicStore(store),
        current_products_count: countResult ? Number(countResult.total) : 0,
      },
    });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};
