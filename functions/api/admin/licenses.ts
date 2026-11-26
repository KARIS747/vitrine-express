// Cloudflare Pages Function: /api/admin/licenses
// Gestionnaire de licences VitrineExpress (Super Admin).
// Authentification par en-tête X-Admin-Key ou Authorization: Bearer <clé>.
// La clé doit être configurée via `wrangler pages secret put ADMIN_KEY`.

import {
  guardAdmin,
  hashPin,
  json,
  type SecurityEnv,
} from "../../_lib/security";
import {
  addMonths,
  clampMonths,
  clampQuota,
  isPromoCode,
  normalizePlan,
  PLAN_IDS,
  PLANS,
  planFromQuota,
  planLabel,
  planPrice,
  proratedPrice,
  type PlanId,
} from "../../_lib/plans";

type Env = SecurityEnv;

const cleanSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

function resolvePlan(value: unknown, fallbackQuota?: unknown): PlanId {
  const input = String(value ?? "").trim().toLowerCase();
  if (!input) return planFromQuota(fallbackQuota);
  return normalizePlan(input);
}

function isInvalidPlan(value: unknown): boolean {
  const input = String(value ?? "").trim().toLowerCase();
  return Boolean(input) && !PLAN_IDS.includes(input as PlanId);
}

const STORE_SELECT = `
  SELECT
    s.*,
    (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) AS current_products_count,
    COALESCE(
      (SELECT SUM(lp.amount) FROM license_payments lp WHERE lp.store_id = s.id AND lp.status = 'paid'),
      (SELECT l.price_paid FROM licenses l WHERE l.store_id = s.id ORDER BY l.created_at DESC LIMIT 1),
      0
    ) AS price_paid,
    COALESCE(
      (SELECT SUM(lp.amount) FROM license_payments lp WHERE lp.store_id = s.id AND lp.status = 'due'),
      0
    ) AS amount_due,
    COALESCE(
      (SELECT lp.plan FROM license_payments lp WHERE lp.store_id = s.id ORDER BY lp.created_at DESC LIMIT 1),
      CASE
        WHEN s.max_products >= 999 THEN 'premium'
        WHEN s.max_products >= 30 THEN 'pro'
        ELSE 'decouverte'
      END
    ) AS plan,
    (SELECT l.status FROM licenses l WHERE l.store_id = s.id ORDER BY l.created_at DESC LIMIT 1) AS license_status
  FROM stores s
`;

async function getStoreWithCount(db: any, storeId: string) {
  return db
    .prepare(`${STORE_SELECT} WHERE s.id = ?`)
    .bind(storeId)
    .first();
}

async function countProducts(db: any, storeId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS total FROM products WHERE store_id = ?`)
    .bind(storeId)
    .first();
  return Number(row?.total) || 0;
}

async function recordPayment(
  db: any,
  params: {
    storeId: string;
    licenseKey: string;
    plan: PlanId;
    months: number;
    amount: number;
    status: "paid" | "due";
    note?: string;
  },
) {
  await db
    .prepare(`
      INSERT INTO license_payments (
        id, store_id, license_key, plan, months, amount, status, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      `pay_${crypto.randomUUID().slice(0, 8)}`,
      params.storeId,
      params.licenseKey,
      params.plan,
      params.months,
      params.amount,
      params.status,
      params.note ?? null,
    )
    .run();
}

function auditAdmin(action: string, storeId: string, details: Record<string, unknown> = {}) {
  console.info(JSON.stringify({
    scope: "admin-audit",
    at: new Date().toISOString(),
    action,
    storeId,
    ...details,
  }));
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const denial = await guardAdmin(context.request, context.env);
  if (denial) return denial;
  const db = context.env.DB;

  try {
    const { results: stores } = await db
      .prepare(`${STORE_SELECT} ORDER BY s.is_active DESC, s.expires_at ASC`)
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
      maxProducts,
      durationMonths = 12,
      pinCode,
    } = body;

    if (isInvalidPlan(body.plan)) {
      return json({ error: "Formule inconnue" }, 400);
    }

    const plan = resolvePlan(body.plan, maxProducts);
    const promoApplied = plan !== "decouverte" && isPromoCode(body.promoCode);
    const pricePaid = planPrice(plan, promoApplied);

    const cleanName = String(storeName ?? "").trim().slice(0, 80);
    const cleanWhatsApp = String(whatsappNumber ?? "").replace(/[^0-9]/g, "");
    const resolvedSlug = cleanSlug(String(slug || storeName || ""));

    if (!cleanName || cleanName.length < 2) {
      return json({ error: "Le nom de la boutique doit comporter au moins 2 caractères" }, 400);
    }
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

    const existingSlug = await db
      .prepare(`SELECT id FROM stores WHERE slug = ?`)
      .bind(resolvedSlug)
      .first();
    if (existingSlug) {
      return json({ error: "Cet identifiant de boutique est déjà utilisé" }, 409);
    }

    const existingName = await db
      .prepare(`SELECT id FROM stores WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))`)
      .bind(cleanName)
      .first();
    if (existingName) {
      return json({ error: `Le nom « ${cleanName} » est déjà utilisé par une autre boutique` }, 409);
    }

    const existingPhone = await db
      .prepare(`SELECT id FROM stores WHERE whatsapp_number = ?`)
      .bind(cleanWhatsApp)
      .first();
    if (existingPhone) {
      return json({ error: "Une boutique est déjà associée à ce numéro WhatsApp" }, 409);
    }

    const cleanMaxProducts = maxProducts === undefined
      ? PLANS[plan].maxProducts
      : clampQuota(maxProducts, PLANS[plan].maxProducts);
    const cleanDuration = clampMonths(durationMonths);
    const storeId = `store_${crypto.randomUUID().slice(0, 8)}`;
    const licenseKey = `LIC-${resolvedSlug.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "BOUT"}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const categoryId = `cat_${crypto.randomUUID().slice(0, 8)}`;

    const expiresAt = addMonths(new Date(), cleanDuration).toISOString();
    const cleanCity = String(city || "Douala").trim().slice(0, 50);
    const cleanQuarter = String(quarter || "").trim().slice(0, 80);
    const cleanPhoneCall = String(phoneCall || whatsappNumber || "").trim().slice(0, 30);
    const notes = `Formule ${planLabel(plan)}${promoApplied ? " (promo)" : ""} · ${cleanDuration} mois`;

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
          price_paid, max_products, duration_months, expires_at, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).bind(
        `lic_${crypto.randomUUID().slice(0, 8)}`,
        licenseKey,
        storeId,
        cleanName,
        cleanWhatsApp,
        pricePaid,
        cleanMaxProducts,
        cleanDuration,
        expiresAt,
        notes,
      ),
      db.prepare(`
        INSERT INTO license_payments (
          id, store_id, license_key, plan, months, amount, status, note
        ) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)
      `).bind(
        `pay_${crypto.randomUUID().slice(0, 8)}`,
        storeId,
        licenseKey,
        plan,
        cleanDuration,
        pricePaid,
        notes,
      ),
    ]);

    const store = await getStoreWithCount(db, storeId);

    return json({
      success: true,
      store: withoutPinHash(store),
      licenseKey,
      pinCode: cleanPin,
      expiresAt,
      plan,
      pricePaid,
      promoApplied,
    }, 201);
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
    let responseExtra: Record<string, unknown> = {};

    if (action === "toggleStatus") {
      const nextActive = Number(store.is_active) === 1 ? 0 : 1;
      await db.batch([
        db.prepare(`UPDATE stores SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(nextActive, storeId),
        db.prepare(`UPDATE licenses SET status = ? WHERE store_id = ?`)
          .bind(nextActive === 1 ? "active" : "revoked", storeId),
      ]);
      auditAdmin("toggleStatus", storeId, { isActive: nextActive === 1 });
    } else if (action === "renew") {
      if (isInvalidPlan(body.plan)) {
        return json({ error: "Formule inconnue" }, 400);
      }

      const plan = resolvePlan(body.plan, store.max_products);
      const promoApplied = plan !== "decouverte" && isPromoCode(body.promoCode);
      const months = clampMonths(body.additionalMonths);
      const expectedAmount = proratedPrice(plan, months, promoApplied);
      const amountPaid = body.amountPaid === undefined
        ? expectedAmount
        : Math.max(0, Math.min(10_000_000, Number(body.amountPaid) || 0));
      const planQuota = body.maxProducts !== undefined
        ? clampQuota(body.maxProducts, PLANS[plan].maxProducts)
        : body.plan
          ? PLANS[plan].maxProducts
          : Math.max(1, Math.min(PLANS.premium.maxProducts, Number(store.max_products) || PLANS[plan].maxProducts));

      const currentProducts = await countProducts(db, storeId);
      if (planQuota < currentProducts) {
        return json({
          error: `Cette boutique contient ${currentProducts} articles ; la formule ${planLabel(plan)} en autorise ${planQuota}.`,
          currentProducts,
          planQuota,
        }, 409);
      }

      const base = store.expires_at && new Date(store.expires_at).getTime() > Date.now()
        ? new Date(store.expires_at)
        : new Date();
      const newExpiry = addMonths(base, months).toISOString();
      const licenseStatus = Number(store.is_active) === 1 ? "active" : "revoked";
      const paymentOperator = String(body.paymentOperator ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const paymentReference = String(body.paymentReference ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
      const paymentNote = String(body.note ?? "").trim().replace(/\s+/g, " ").slice(0, 300);
      const paymentMeta = [
        paymentOperator ? `Opérateur ${paymentOperator}` : "",
        paymentReference ? `Référence ${paymentReference}` : "",
        paymentNote,
      ].filter(Boolean).join(" | ");
      const notes = `Renouvellement ${planLabel(plan)}${promoApplied ? " (promo)" : ""} · ${months} mois${paymentMeta ? ` | ${paymentMeta}` : ""}`;

      await db
        .prepare(`
          UPDATE stores
          SET expires_at = ?, max_products = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(newExpiry, planQuota, storeId)
        .run();

      const licenseUpdate = await db
        .prepare(`
          UPDATE licenses
          SET expires_at = ?, max_products = ?, duration_months = ?, price_paid = ?, status = ?, notes = ?
          WHERE store_id = ?
        `)
        .bind(newExpiry, planQuota, months, amountPaid, licenseStatus, notes, storeId)
        .run();

      if (!licenseUpdate?.meta?.changes) {
        await db.prepare(`
          INSERT INTO licenses (
            id, license_key, store_id, client_name, client_phone,
            price_paid, max_products, duration_months, expires_at, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          `lic_${crypto.randomUUID().slice(0, 8)}`,
          store.license_key,
          storeId,
          store.name,
          store.whatsapp_number,
          amountPaid,
          planQuota,
          months,
          newExpiry,
          licenseStatus,
          notes,
        ).run();
      }

      await db
        .prepare(`UPDATE license_payments SET status = 'cancelled' WHERE store_id = ? AND status = 'due'`)
        .bind(storeId)
        .run();

      await recordPayment(db, {
        storeId,
        licenseKey: store.license_key,
        plan,
        months,
        amount: amountPaid,
        status: "paid",
        note: notes,
      });

      responseExtra = { plan, amountPaid, promoApplied, months };
      auditAdmin("renew", storeId, { plan, months, amountPaid, promoApplied, paymentOperator, paymentReference });
    } else if (action === "resetPin") {
      if (!context.env.PIN_PEPPER) {
        return json({ error: "Configuration de sécurité incomplète (PIN_PEPPER)" }, 500);
      }
      resetPin = generatePin();
      const pinHash = await hashPin(resetPin, context.env.PIN_PEPPER);
      await db.batch([
        db.prepare(`UPDATE stores SET pin_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(pinHash, storeId),
        db.prepare(`DELETE FROM sessions WHERE store_id = ? AND scope = 'merchant'`)
          .bind(storeId),
      ]);
      auditAdmin("resetPin", storeId, { sessionsRevoked: true });
    } else if (action === "updateQuota") {
      const newQuota = clampQuota(body.maxProducts, Number(store.max_products) || PLANS.decouverte.maxProducts);
      const currentProducts = await countProducts(db, storeId);
      await db.batch([
        db.prepare(`UPDATE stores SET max_products = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(newQuota, storeId),
        db.prepare(`UPDATE licenses SET max_products = ? WHERE store_id = ?`)
          .bind(newQuota, storeId),
      ]);
      if (newQuota < currentProducts) {
        responseExtra = {
          warning: `Le quota (${newQuota}) est inférieur aux ${currentProducts} articles déjà publiés. Aucun nouvel article ne pourra être ajouté.`,
        };
      }
      auditAdmin("updateQuota", storeId, { maxProducts: newQuota, currentProducts });
    } else {
      return json({ error: "Action administrateur inconnue" }, 400);
    }

    const updatedStore = await getStoreWithCount(db, storeId);
    return json({
      success: true,
      store: withoutPinHash(updatedStore),
      ...(resetPin ? { pinCode: resetPin } : {}),
      ...responseExtra,
    });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};
