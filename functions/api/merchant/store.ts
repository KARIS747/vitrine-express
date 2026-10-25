// Cloudflare Pages Function: /api/merchant/store
// Mise à jour de la configuration publique de la boutique par son gérant.

import {
  authenticateMerchant,
  json,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_IMAGE_LENGTH = 900_000;

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizePhone(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "")
    .slice(0, 20);
}

function normalizeImage(value: unknown, fallback: string): { value: string; error?: string } {
  const image = String(value ?? "").trim();
  if (!image) return { value: "" };
  if (image.length > MAX_IMAGE_LENGTH) {
    return { value: fallback, error: "Image trop volumineuse (900 Ko maximum par image)" };
  }
  if (!image.startsWith("data:image/") && !image.startsWith("https://") && !image.startsWith("http://")) {
    return { value: fallback, error: "Format d'image invalide" };
  }
  return { value: image };
}

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
  updated_at: store.updated_at,
});

export const onRequestPut = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  try {
    const body = await context.request.json() as any;
    const auth = await authenticateMerchant(db, {
      storeId: body.storeId,
      licenseKey: body.licenseKey,
      pinCode: body.pinCode,
      pepper: context.env.PIN_PEPPER ?? "",
      request: context.request,
    });
    if (auth.response) return auth.response;
    const store = auth.store;

    const input = body.settings ?? {};
    const name = cleanText(input.name, 80);
    const tagline = cleanText(input.tagline, 140);
    const description = cleanText(input.description, 1200);
    const whatsappNumber = normalizePhone(input.whatsappNumber);
    const phoneCall = normalizePhone(input.phoneCall);
    const city = cleanText(input.city, 80);
    const quarter = cleanText(input.quarter, 80);
    const addressNotes = cleanText(input.addressNotes, 240);
    const themePrimary = HEX_COLOR.test(String(input.themePrimary ?? ""))
      ? String(input.themePrimary)
      : (store.theme_primary || "#059669");
    const themeAccent = HEX_COLOR.test(String(input.themeAccent ?? ""))
      ? String(input.themeAccent)
      : (store.theme_accent || "#F59E0B");

    if (name.length < 2) {
      return json({ error: "Le nom de la boutique doit contenir au moins 2 caractères" }, 400);
    }
    if (whatsappNumber.replace(/\D/g, "").length < 8) {
      return json({ error: "Le numéro WhatsApp est invalide" }, 400);
    }
    if (!city) {
      return json({ error: "La ville est obligatoire" }, 400);
    }

    const logo = normalizeImage(input.logoUrl, store.logo_url ?? "");
    if (logo.error) return json({ error: logo.error }, 400);
    const banner = normalizeImage(input.bannerUrl, store.banner_url ?? "");
    if (banner.error) return json({ error: banner.error }, 400);

    await db
      .prepare(`
        UPDATE stores SET
          name = ?,
          tagline = ?,
          description = ?,
          whatsapp_number = ?,
          phone_call = ?,
          city = ?,
          quarter = ?,
          address_notes = ?,
          logo_url = ?,
          banner_url = ?,
          theme_primary = ?,
          theme_accent = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        name,
        tagline,
        description,
        whatsappNumber,
        phoneCall,
        city,
        quarter,
        addressNotes,
        logo.value,
        banner.value,
        themePrimary,
        themeAccent,
        store.id,
      )
      .run();

    const updated = await db
      .prepare(`SELECT * FROM stores WHERE id = ?`)
      .bind(store.id)
      .first();

    return json({ success: true, store: publicStore(updated) });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur D1" }, 500);
  }
};
