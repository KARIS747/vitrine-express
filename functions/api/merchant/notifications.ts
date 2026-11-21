// Cloudflare Pages Function: /api/merchant/notifications
// Centre de notifications In-App pour le commerçant.

import {
  authenticateMerchant,
  json,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  try {
    const auth = await authenticateMerchant(db, {
      pepper: context.env.PIN_PEPPER ?? "",
      request: context.request,
    });
    if (auth.response) return auth.response;
    const store = auth.store;

    const { results } = await db
      .prepare(`
        SELECT 
          n.id, 
          n.store_id, 
          n.title, 
          n.message, 
          n.type, 
          n.link_url, 
          n.created_at,
          (nr.read_at IS NOT NULL) AS is_read
        FROM notifications n
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.store_id = ?
        WHERE n.store_id IS NULL OR n.store_id = ?
        ORDER BY n.created_at DESC
        LIMIT 30
      `)
      .bind(store.id, store.id)
      .all();

    const notifications = (results ?? []).map((row: any) => ({
      id: row.id,
      storeId: row.store_id,
      title: row.title,
      message: row.message,
      type: row.type || "info",
      linkUrl: row.link_url,
      createdAt: row.created_at,
      isRead: Boolean(row.is_read),
    }));

    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    return json({ success: true, notifications, unreadCount });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  try {
    const auth = await authenticateMerchant(db, {
      pepper: context.env.PIN_PEPPER ?? "",
      request: context.request,
    });
    if (auth.response) return auth.response;
    const store = auth.store;

    const body = (await context.request.json().catch(() => ({}))) as any;
    const notificationId = String(body.notificationId ?? "").trim();
    const markAllRead = Boolean(body.markAllRead);

    if (markAllRead) {
      // Marquer toutes les notifications éligibles comme lues
      const { results: unreadList } = await db
        .prepare(`
          SELECT n.id 
          FROM notifications n
          LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.store_id = ?
          WHERE (n.store_id IS NULL OR n.store_id = ?) AND nr.read_at IS NULL
        `)
        .bind(store.id, store.id)
        .all();

      if (unreadList && unreadList.length > 0) {
        const batchStmts = unreadList.map((row: any) =>
          db
            .prepare(`
              INSERT INTO notification_reads (id, notification_id, store_id)
              VALUES (?, ?, ?)
              ON CONFLICT(notification_id, store_id) DO NOTHING
            `)
            .bind(`read_${crypto.randomUUID().slice(0, 8)}`, row.id, store.id)
        );
        await db.batch(batchStmts);
      }

      return json({ success: true });
    }

    if (!notificationId) {
      return json({ error: "Identifiant de notification requis" }, 400);
    }

    await db
      .prepare(`
        INSERT INTO notification_reads (id, notification_id, store_id)
        VALUES (?, ?, ?)
        ON CONFLICT(notification_id, store_id) DO NOTHING
      `)
      .bind(`read_${crypto.randomUUID().slice(0, 8)}`, notificationId, store.id)
      .run();

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};
