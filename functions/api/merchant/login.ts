// Cloudflare Pages Function: POST /api/merchant/login
// Authentification du boutiquier avec sa clé de licence (ou son slug) et son code PIN.

import {
  authenticateMerchantLogin,
  createSession,
  json,
  MERCHANT_SESSION_COOKIE,
  sessionCookie,
  SESSION_TTLS,
  type SecurityEnv,
} from "../../_lib/security";
import { publicStore } from "../../_lib/store";

type Env = SecurityEnv;

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base de données non configurée" }, 500);

  try {
    const body = await context.request.json() as any;
    const { licenseKey, pinCode } = body;
    const remember = Boolean(body.rememberDevice);
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

    const ttl = remember ? SESSION_TTLS.merchantRemember : SESSION_TTLS.merchant;
    const { token } = await createSession(db, "merchant", store.id, context.request, ttl);

    return json({
      success: true,
      store: {
        ...publicStore(store),
        current_products_count: countResult ? Number(countResult.total) : 0,
      },
    }, 200, {
      "Set-Cookie": sessionCookie(
        context.request,
        MERCHANT_SESSION_COOKIE,
        token,
        remember ? ttl : 0,
      ),
    });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};
