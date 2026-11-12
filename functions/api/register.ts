// Cloudflare Pages Function: POST /api/register
// Inscription autonome pour la formule gratuite "Plan Découverte" (8 produits).
// Crée la boutique, la licence gratuite à 0 FCFA et ouvre immédiatement la session marchand.

import {
  clientIp,
  createSession,
  hashPin,
  json,
  limiterKeys,
  MERCHANT_SESSION_COOKIE,
  RATE_LIMITS,
  rateLimitResponse,
  rateLimitState,
  recordFailure,
  sessionCookie,
  SESSION_TTLS,
  type SecurityEnv,
} from "../_lib/security";
import { publicStore } from "../_lib/store";

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) {
    return json({ error: "Base de données non configurée" }, 500);
  }

  const pepper = context.env.PIN_PEPPER;
  if (!pepper) {
    return json({ error: "Configuration de sécurité incomplète (PIN_PEPPER)" }, 500);
  }

  try {
    // 1. Limitation des abus par adresse IP
    const [ipKey] = await limiterKeys("register:ip", [clientIp(context.request)]);
    const ipState = await rateLimitState(db, ipKey);
    if (ipState.blocked) {
      return rateLimitResponse(ipState.retryAfter);
    }

    const body = (await context.request.json().catch(() => ({}))) as any;
    const {
      storeName,
      whatsappNumber,
      city,
      quarter,
      contactPreference = "whatsapp",
      contactEmail,
      pinCode,
    } = body;

    const cleanName = String(storeName ?? "").trim().slice(0, 80);
    const cleanWhatsApp = String(whatsappNumber ?? "").replace(/[^0-9]/g, "");
    const cleanCity = String(city || "Douala").trim().slice(0, 50);
    const cleanQuarter = String(quarter || "").trim().slice(0, 80);
    const pref = contactPreference === "email" ? "email" : "whatsapp";
    const cleanEmail = String(contactEmail ?? "").trim().toLowerCase().slice(0, 100);
    const cleanPin = String(pinCode ?? "").trim();

    // 2. Validations métier
    if (!cleanName || cleanName.length < 2) {
      return json({ error: "Le nom de la boutique doit comporter au moins 2 caractères" }, 400);
    }

    if (cleanWhatsApp.length < 8 || cleanWhatsApp.length > 15) {
      return json({ error: "Numéro WhatsApp invalide (8 à 15 chiffres attendus)" }, 400);
    }

    if (pref === "email") {
      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        return json({ error: "Une adresse email valide est obligatoire lorsque vous choisissez le contact par email" }, 400);
      }
    }

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 12) {
      return json({ error: "Le code PIN secret doit comporter entre 4 et 12 caractères" }, 400);
    }

    // 3. Vérifier si ce numéro WhatsApp possède déjà une boutique active
    const existingWithPhone = await db
      .prepare(`SELECT id, name, slug FROM stores WHERE whatsapp_number = ? AND is_active = 1`)
      .bind(cleanWhatsApp)
      .first();

    if (existingWithPhone) {
      return json({
        error: `Une boutique active ("${existingWithPhone.name}") est déjà associée à ce numéro WhatsApp. Connectez-vous à votre espace commerçant avec votre PIN.`,
        existingSlug: existingWithPhone.slug,
      }, 409);
    }

    // 4. Génération d'un slug unique
    let baseSlug = cleanSlug(cleanName);
    if (!baseSlug) baseSlug = `boutique-${crypto.randomUUID().slice(0, 4)}`;

    let resolvedSlug = baseSlug;
    let attempts = 0;
    while (attempts < 5) {
      const existingSlug = await db
        .prepare(`SELECT id FROM stores WHERE slug = ?`)
        .bind(resolvedSlug)
        .first();

      if (!existingSlug) break;
      attempts += 1;
      resolvedSlug = `${baseSlug}-${Math.floor(10 + Math.random() * 90)}`;
    }

    // 5. Paramètres du Plan Gratuit / Découverte
    const FREE_MAX_PRODUCTS = 8;
    const storeId = `store_${crypto.randomUUID().slice(0, 8)}`;
    const licenseKey = `LIC-FREE-${resolvedSlug.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "BOUT"}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const categoryId = `cat_${crypto.randomUUID().slice(0, 8)}`;

    const expiresDate = new Date();
    expiresDate.setUTCMonth(expiresDate.getUTCMonth() + 12); // 12 mois renouvelables gratuitement
    const expiresAt = expiresDate.toISOString();

    const pinHash = await hashPin(cleanPin, pepper);

    const contactNotes = `Plan Découverte Gratuit (8 produits) | Contact favori : ${pref} | Email : ${cleanEmail || "N/A"}`;

    // 6. Insertion sécurisée en base D1 (avec fallback si colonnes contact_preference pas encore migrées)
    try {
      await db.batch([
        db.prepare(`
          INSERT INTO stores (
            id, slug, name, whatsapp_number, phone_call, contact_preference, contact_email,
            city, quarter, license_key, pin_code, max_products, expires_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(
          storeId,
          resolvedSlug,
          cleanName,
          cleanWhatsApp,
          cleanWhatsApp,
          pref,
          cleanEmail || null,
          cleanCity,
          cleanQuarter,
          licenseKey,
          pinHash,
          FREE_MAX_PRODUCTS,
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
          0, // 0 FCFA pour le plan gratuit
          FREE_MAX_PRODUCTS,
          12,
          expiresAt,
          contactNotes,
        ),
      ]);
    } catch (insertErr: any) {
      // Si la table stores ne possède pas encore les colonnes contact_preference / contact_email
      if (String(insertErr?.message || "").includes("contact_preference")) {
        await db.batch([
          db.prepare(`
            INSERT INTO stores (
              id, slug, name, whatsapp_number, phone_call,
              city, quarter, license_key, pin_code, max_products, expires_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `).bind(
            storeId,
            resolvedSlug,
            cleanName,
            cleanWhatsApp,
            cleanWhatsApp,
            cleanCity,
            cleanQuarter,
            licenseKey,
            pinHash,
            FREE_MAX_PRODUCTS,
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
            0,
            FREE_MAX_PRODUCTS,
            12,
            expiresAt,
            contactNotes,
          ),
        ]);
      } else {
        throw insertErr;
      }
    }

    // Enregistrer tentative réussie pour rate-limit
    await recordFailure(db, ipKey, RATE_LIMITS.admin); // fenêtre de protection

    // 7. Connexion automatique immédiate : création de la session HttpOnly
    const { token } = await createSession(
      db,
      "merchant",
      storeId,
      context.request,
      SESSION_TTLS.merchantRemember,
    );

    const storeCreated = await db
      .prepare(`SELECT * FROM stores WHERE id = ?`)
      .bind(storeId)
      .first();

    return json(
      {
        success: true,
        message: "Votre boutique gratuite (8 produits) a été créée avec succès !",
        store: {
          ...publicStore(storeCreated),
          current_products_count: 0,
        },
        licenseKey,
        pinCode: cleanPin,
      },
      201,
      {
        "Set-Cookie": sessionCookie(
          context.request,
          MERCHANT_SESSION_COOKIE,
          token,
          SESSION_TTLS.merchantRemember,
        ),
      },
    );
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur lors de la création de la boutique" }, 500);
  }
};
