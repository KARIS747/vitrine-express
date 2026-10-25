// Cloudflare Pages Function: /api/merchant/categories
// Gestion des catégories d'une boutique (ajout / suppression).

import {
  authenticateMerchant,
  json,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

export const onRequestPost = async (context: { request: Request; env: Env }) => {
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

    const cleanName = String(body.name ?? "").trim().slice(0, 50);
    if (cleanName.length < 2) {
      return json({ error: "Le nom de la catégorie doit contenir au moins 2 caractères" }, 400);
    }

    const existing = await db
      .prepare(`SELECT id FROM categories WHERE store_id = ? AND lower(name) = lower(?)`)
      .bind(store.id, cleanName)
      .first();
    if (existing) {
      return json({ error: "Cette catégorie existe déjà" }, 409);
    }

    const cleanSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const newId = `cat_${crypto.randomUUID().slice(0, 10)}`;

    const maxOrderRes = await db
      .prepare(`SELECT MAX(sort_order) AS max_order FROM categories WHERE store_id = ?`)
      .bind(store.id)
      .first();
    const nextOrder = (Number(maxOrderRes?.max_order) || 0) + 1;

    await db
      .prepare(`INSERT INTO categories (id, store_id, name, slug, sort_order) VALUES (?, ?, ?, ?, ?)`)
      .bind(newId, store.id, cleanName, cleanSlug || "categorie", nextOrder)
      .run();

    return json({
      success: true,
      category: {
        id: newId,
        store_id: store.id,
        name: cleanName,
        slug: cleanSlug || "categorie",
        sort_order: nextOrder,
      },
    }, 201);
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};

export const onRequestDelete = async (context: { request: Request; env: Env }) => {
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
    const categoryId = String(body.categoryId ?? "").trim();

    if (!categoryId) return json({ error: "Catégorie introuvable" }, 400);

    const category = await db
      .prepare(`SELECT id, slug FROM categories WHERE id = ? AND store_id = ?`)
      .bind(categoryId, store.id)
      .first();
    if (!category) return json({ error: "Catégorie introuvable" }, 404);
    if (category.slug === "all") {
      return json({ error: "La catégorie par défaut ne peut pas être supprimée" }, 400);
    }

    await db.batch([
      db.prepare(`UPDATE products SET category_id = NULL WHERE category_id = ? AND store_id = ?`)
        .bind(categoryId, store.id),
      db.prepare(`DELETE FROM categories WHERE id = ? AND store_id = ?`)
        .bind(categoryId, store.id),
    ]);

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};
