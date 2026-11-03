// Cloudflare Pages Function: POST /api/merchant/logout

import {
  json,
  revokeMerchantSession,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  const cookie = await revokeMerchantSession(db, context.request);
  return json({ success: true }, 200, { "Set-Cookie": cookie });
};
