// Cloudflare Pages Function: POST /api/admin/login
// Échange la clé administrateur contre un cookie de session HttpOnly.

import {
  ADMIN_SESSION_COOKIE,
  createSession,
  json,
  sessionCookie,
  SESSION_TTLS,
  verifyAdminAccess,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  try {
    const body = await context.request.json() as any;
    const adminKey = String(body.adminKey ?? "").trim();
    const remember = Boolean(body.rememberDevice);

    const denial = await verifyAdminAccess(context.request, context.env, adminKey);
    if (denial) return denial;

    const ttl = remember ? SESSION_TTLS.adminRemember : SESSION_TTLS.admin;
    const { token } = await createSession(db, "admin", null, context.request, ttl);

    return json({ success: true }, 200, {
      "Set-Cookie": sessionCookie(
        context.request,
        ADMIN_SESSION_COOKIE,
        token,
        remember ? ttl : 0,
      ),
    });
  } catch (err) {
    console.error("admin login failed", err);
    return json({ error: "Erreur serveur" }, 500);
  }
};
