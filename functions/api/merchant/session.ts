// Cloudflare Pages Function: GET /api/merchant/session
// Valide la session HttpOnly et renvoie la boutique associée.

import {
  clearSessionCookie,
  getMerchantSessionStore,
  json,
  MERCHANT_SESSION_COOKIE,
  type SecurityEnv,
} from "../../_lib/security";
import { publicStore } from "../../_lib/store";

type Env = SecurityEnv;

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  const session = await getMerchantSessionStore(db, context.request);
  if (!session.store) {
    return json(
      { error: "Session expirée, reconnectez-vous" },
      401,
      session.hasCookie
        ? { "Set-Cookie": clearSessionCookie(context.request, MERCHANT_SESSION_COOKIE) }
        : {},
    );
  }

  if (Number(session.store.is_active) === 0) {
    return json({ error: "Cette boutique a été suspendue par l'administrateur" }, 403);
  }
  if (session.store.expires_at && session.store.expires_at < new Date().toISOString()) {
    return json({ error: "Votre licence a expiré. Contactez Karis pour la renouveler.", isExpired: true }, 403);
  }

  return json({ success: true, store: publicStore(session.store) });
};
