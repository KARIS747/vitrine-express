// Cloudflare Pages Function: /api/admin/licenses
// Gestionnaire de licences Karis (Super Admin).
// Authentification par en-tête X-Admin-Key ou Authorization: Bearer <clé>.
// La clé doit être configurée via `wrangler pages secret put ADMIN_KEY`.

import {
  guardAdmin,
  hashPin,
  json,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

const cleanSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function withoutPinHash(store: any) {
  if (!store) return store;
  const { pin_code, ...safeStore } = store;
  return safeStore;
}

function generatePin(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

async function getStoreWithCount(db: any, storeId: string) {
  return db
    .prepare(`
      SELECT
        s.*,
        COUNT(p.id) AS current_products_count,
        COALESCE(l.price_paid, 5000) AS price_paid,
        l.status AS license_status
      FROM stores s
      LEFT JOIN products p ON p.store_id = s.id
      LEFT JOIN licenses l ON l.store_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `)
    .bind(storeId)
    .first();
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const denial = await guardAdmin(context.request, context.env);
  if (denial) return denial;
  const db = context.env.DB;

  try {
    const { results: stores } = await db
      .prepare(`
        SELECT
          s.*,
          COUNT(p.id) AS current_products_count,
          COALESCE(l.price_paid, 5000) AS price_paid,
          l.status AS license_status
        FROM stores s
        LEFT JOIN products p ON p.store_id = s.id
        LEFT JOIN licenses l ON l.store_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `)
      .all();

    return json({ success: true, stores: (stores ?? []).map(withoutPinHash) });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const denial = await guardAdmin(context.request, context.env);
  if (denial) return denial;
  const db = context.env.DB;

  try {
    if (!context.env.PIN_PEPPER) {
      return json({ error: "Configuration de sécurité incomplète (PIN_PEPPER)" }, 500);
    }

    const body = await context.request.json() as any;
    const {
      storeName,
      slug,
      whatsappNumber,
      phoneCall,
      city,
      quarter,
      maxProducts = 20,
      durationMonths = 12,
      pinCode,
    } = body;

    const cleanName = String(storeName ?? "").trim().slice(0, 80);
    const cleanWhatsApp = String(whatsappNumber ?? "").replace(/[^0-9]/g, "");
    const resolvedSlug = cleanSlug(String(slug || storeName || ""));

    if (!cleanName) return json({ error: "Le nom de la boutique est obligatoire" }, 400);
    if (cleanWhatsApp.length < 8 || cleanWhatsApp.length > 15) {
      return json({ error: "Numéro WhatsApp invalide (8 à 15 chiffres attendus)" }, 400);
    }
    if (!resolvedSlug) return json({ error: "Identifiant de boutique invalide" }, 400);

    const providedPin = String(pinCode ?? "").trim().slice(0, 12);
    if (providedPin && providedPin.length < 4) {
      return json({ error: "Le code PIN doit contenir au moins 4 caractères" }, 400);
    }
    const cleanPin = providedPin || generatePin();
    const pinHash = await hashPin(cleanPin, context.env.PIN_PEPPER);

    const existing = await db
      .prepare(`SELECT id FROM stores WHERE slug = ?`)
      .bind(resolvedSlug)
      .first();
    if (existing) {
      return json({ error: "Cet identifiant de boutique est déjà utilisé" }, 409);
    }

    const cleanMaxProducts = Math.max(1, Math.min(200, Number(maxProducts) || 20));
    const cleanDuration = Math.max(1, Math.min(36, Number(durationMonths) || 12));
    const storeId = `store_${crypto.randomUUID().slice(0, 8)}`;
    const licenseKey = `LIC-${resolvedSlug.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "BOUT"}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const categoryId = `cat_${crypto.randomUUID().slice(0, 8)}`;

    const expiresDate = new Date();
    expiresDate.setUTCMonth(expiresDate.getUTCMonth() + cleanDuration);
    const expiresAt = expiresDate.toISOString();
    const cleanCity = String(city || "Douala").trim().slice(0, 50);
    const cleanQuarter = String(quarter || "").trim().slice(0, 80);
    const cleanPhoneCall = String(phoneCall || whatsappNumber || "").trim().slice(0, 30);

    await db.batch([
      db.prepare(`
        INSERT INTO stores (
          id, slug, name, whatsapp_number, phone_call, city, quarter,
          license_key, pin_code, max_products, expires_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(
        storeId,
        resolvedSlug,
        cleanName,
        cleanWhatsApp,
        cleanPhoneCall,
        cleanCity,
        cleanQuarter,
        licenseKey,
        pinHash,
        cleanMaxProducts,
        expiresAt,
      ),
      db.prepare(`
        INSERT INTO categories (id, store_id, name, slug, sort_order)
        VALUES (?, ?, 'Tous les articles', 'all', 0)
      `).bind(categoryId, storeId),
      db.prepare(`
        INSERT INTO licenses (
          id, license_key, store_id, client_name, client_phone,
          price_paid, max_products, duration_months, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `lic_${crypto.randomUUID().slice(0, 8)}`,
        licenseKey,
        storeId,
        cleanName,
        cleanWhatsApp,
        5000,
        cleanMaxProducts,
        cleanDuration,
        expiresAt,
      ),
    ]);

    const store = await getStoreWithCount(db, storeId);

    return json({ success: true, store: withoutPinHash(store), licenseKey, pinCode: cleanPin, expiresAt }, 201);
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};

export const onRequestPatch = async (context: { request: Request; env: Env }) => {
  const denial = await guardAdmin(context.request, context.env);
  if (denial) return denial;
  const db = context.env.DB;

  try {
    const body = await context.request.json() as any;
    const storeId = String(body.storeId ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!storeId) return json({ error: "Boutique introuvable" }, 400);

    const store = await db
      .prepare(`SELECT * FROM stores WHERE id = ?`)
      .bind(storeId)
      .first();
    if (!store) return json({ error: "Boutique introuvable" }, 404);

    let resetPin: string | null = null;

    if (action === "toggleStatus") {
      const nextActive = Number(store.is_active) === 1 ? 0 : 1;
      await db.batch([
        db.prepare(`UPDATE stores SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(nextActive, storeId),
        db.prepare(`UPDATE licenses SET status = ? WHERE store_id = ?`)
          .bind(nextActive === 1 ? "active" : "revoked", storeId),
      ]);
    } else if (action === "renew") {
      const months = Math.max(1, Math.min(36, Number(body.additionalMonths) || 12));
      const base = store.expires_at && new Date(store.expires_at).getTime() > Date.now()
        ? new Date(store.expires_at)
        : new Date();
      base.setUTCMonth(base.getUTCMonth() + months);
      const newExpiry = base.toISOString();

      await db
        .prepare(`UPDATE stores SET expires_at = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(newExpiry, storeId)
        .run();

      const licenseUpdate = await db
        .prepare(`UPDATE licenses SET expires_at = ?, status = 'active' WHERE store_id = ?`)
        .bind(newExpiry, storeId)
        .run();

      if (!licenseUpdate?.meta?.changes) {
        await db.prepare(`
          INSERT INTO licenses (
            id, license_key, store_id, client_name, client_phone,
            price_paid, max_products, duration_months, expires_at, status
          ) VALUES (?, ?, ?, ?, ?, 5000, ?, ?, ?, 'active')
        `).bind(
          `lic_${crypto.randomUUID().slice(0, 8)}`,
          store.license_key,
          storeId,
          store.name,
          store.whatsapp_number,
          Number(store.max_products) || 20,
          months,
          newExpiry,
        ).run();
      }
    } else if (action === "resetPin") {
      if (!context.env.PIN_PEPPER) {
        return json({ error: "Configuration de sécurité incomplète (PIN_PEPPER)" }, 500);
      }
      resetPin = generatePin();
      const pinHash = await hashPin(resetPin, context.env.PIN_PEPPER);
      await db
        .prepare(`UPDATE stores SET pin_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(pinHash, storeId)
        .run();
    } else {
      return json({ error: "Action administrateur inconnue" }, 400);
    }

    const updatedStore = await getStoreWithCount(db, storeId);
    return json({
      success: true,
      store: withoutPinHash(updatedStore),
      ...(resetPin ? { pinCode: resetPin } : {}),
    });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};
