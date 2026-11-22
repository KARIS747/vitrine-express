// Cloudflare Pages Function: /api/admin/notifications
// Diffusion de notifications (générales ou ciblées) par l'administrateur.

import {
  guardAdmin,
  json,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const denial = await guardAdmin(context.request, context.env);
  if (denial) return denial;
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  try {
    const { results } = await db
      .prepare(`
        SELECT 
          n.*,
          s.name AS store_name
        FROM notifications n
        LEFT JOIN stores s ON s.id = n.store_id
        ORDER BY n.created_at DESC
        LIMIT 50
      `)
      .all();

    return json({ success: true, notifications: results ?? [] });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const denial = await guardAdmin(context.request, context.env);
  if (denial) return denial;
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  try {
    const body = (await context.request.json().catch(() => ({}))) as any;
    const storeId = body.storeId ? String(body.storeId).trim() : null;
    const title = String(body.title ?? "").trim().slice(0, 120);
    const message = String(body.message ?? "").trim().slice(0, 1000);
    const type = ["info", "success", "warning", "tip"].includes(body.type) ? body.type : "info";
    const rawLinkUrl = body.linkUrl ? String(body.linkUrl).trim().slice(0, 300) : "";
    let linkUrl: string | null = null;
    if (rawLinkUrl) {
      try {
        const parsed = new URL(rawLinkUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return json({ error: "Le lien doit utiliser http ou https" }, 400);
        }
        linkUrl = parsed.toString();
      } catch {
        return json({ error: "Lien invalide" }, 400);
      }
    }

    if (!title || title.length < 3) {
      return json({ error: "Le titre de la notification doit comporter au moins 3 caractères" }, 400);
    }

    if (!message || message.length < 5) {
      return json({ error: "Le message de la notification doit comporter au moins 5 caractères" }, 400);
    }

    // Si storeId est renseigné, vérifier que la boutique existe
    if (storeId) {
      const storeExists = await db
        .prepare(`SELECT id, name FROM stores WHERE id = ?`)
        .bind(storeId)
        .first();

      if (!storeExists) {
        return json({ error: "Boutique cible introuvable" }, 404);
      }
    }

    const notificationId = `notif_${crypto.randomUUID().slice(0, 8)}`;

    await db
      .prepare(`
        INSERT INTO notifications (id, store_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(notificationId, storeId, title, message, type, linkUrl)
      .run();

    return json(
      {
        success: true,
        notification: {
          id: notificationId,
          store_id: storeId,
          title,
          message,
          type,
          link_url: linkUrl,
          created_at: new Date().toISOString(),
        },
      },
      201
    );
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};
