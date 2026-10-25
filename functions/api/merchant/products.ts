// Cloudflare Pages Function: /api/merchant/products
// Authentification stricte (licence + PIN haché + boutique active + licence non expirée),
// validation des entrées et respect du quota de la formule.

import {
  authenticateMerchant,
  json,
  type SecurityEnv,
} from "../../_lib/security";

type Env = SecurityEnv;

function cleanImageUrl(value: unknown): string {
  return String(value ?? "").trim();
}

function imageIsValid(value: string): boolean {
  if (!value) return false;
  if (value.length > 1_300_000) return false;
  return value.startsWith("data:image/") || value.startsWith("https://") || value.startsWith("http://");
}

async function categoryBelongsToStore(db: any, categoryId: unknown, storeId: string): Promise<boolean> {
  const id = String(categoryId ?? "").trim();
  if (!id) return true;
  const category = await db
    .prepare(`SELECT id FROM categories WHERE id = ? AND store_id = ?`)
    .bind(id, storeId)
    .first();
  return Boolean(category);
}

function normalizeProduct(product: any) {
  const name = String(product?.name ?? "").trim().slice(0, 100);
  const description = String(product?.description ?? "").trim().slice(0, 1000);
  const price = Math.round(Number(product?.price));
  const imageUrl = cleanImageUrl(product?.imageUrl ?? product?.image_url);
  const isAvailable = product?.isAvailable ?? product?.is_available;
  const restockDate = product?.restockDate ?? product?.restock_date ?? null;
  const isFeatured = product?.isFeatured ?? product?.is_featured;
  const sortOrder = product?.sortOrder ?? product?.sort_order;
  const categoryId = product?.categoryId ?? product?.category_id ?? null;

  return {
    name,
    description,
    price,
    imageUrl,
    categoryId: categoryId ? String(categoryId) : null,
    isAvailable: Boolean(isAvailable),
    restockDate: isAvailable ? null : (restockDate ? String(restockDate) : null),
    isFeatured: Boolean(isFeatured),
    sortOrder: Number.isFinite(Number(sortOrder)) ? Math.max(0, Math.trunc(Number(sortOrder))) : 0,
  };
}

function validateProduct(product: ReturnType<typeof normalizeProduct>): string | null {
  if (!product.name) return "Le nom du produit est obligatoire";
  if (isNaN(product.price) || product.price <= 0 || product.price > 50_000_000) return "Prix invalide";
  if (!product.imageUrl) return "La photo du produit est obligatoire";
  if (!imageIsValid(product.imageUrl)) return "Le format ou la taille de l'image est invalide";
  return null;
}

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

    const product = normalizeProduct(body.product);
    const validationError = validateProduct(product);
    if (validationError) return json({ error: validationError }, 400);

    if (!(await categoryBelongsToStore(db, product.categoryId, store.id))) {
      return json({ error: "Catégorie invalide pour cette boutique" }, 400);
    }

    const countRes = await db
      .prepare(`SELECT COUNT(*) AS total FROM products WHERE store_id = ?`)
      .bind(store.id)
      .first();
    const currentTotal = countRes ? Number(countRes.total) : 0;
    const maxAllowed = Number(store.max_products || 20);

    if (currentTotal >= maxAllowed) {
      return json({
        error: `Quota maximal de votre formule atteint (${currentTotal}/${maxAllowed} articles). Contactez Karis pour étendre votre compte.`,
        limitReached: true,
        currentTotal,
        maxAllowed,
      }, 400);
    }

    const newId = `prod_${crypto.randomUUID().slice(0, 10)}`;
    const sortOrder = product.sortOrder || currentTotal + 1;

    await db
      .prepare(`
        INSERT INTO products (
          id, store_id, category_id, name, description, price, image_url,
          is_available, restock_date, is_featured, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        newId,
        store.id,
        product.categoryId,
        product.name,
        product.description,
        product.price,
        product.imageUrl,
        product.isAvailable ? 1 : 0,
        product.restockDate,
        product.isFeatured ? 1 : 0,
        sortOrder,
      )
      .run();

    return json({
      success: true,
      id: newId,
      product: {
        id: newId,
        store_id: store.id,
        category_id: product.categoryId,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.imageUrl,
        is_available: product.isAvailable ? 1 : 0,
        restock_date: product.restockDate,
        is_featured: product.isFeatured ? 1 : 0,
        sort_order: sortOrder,
      },
    }, 201);
  } catch (err: any) {
    return json({ error: "Erreur serveur : " + (err.message || "inconnue") }, 500);
  }
};

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
    const product = body.product ?? {};
    const productId = String(product.id ?? "").trim();

    if (!productId) return json({ error: "Produit introuvable" }, 400);

    // Bascule rapide de disponibilité : ne touche jamais au reste du produit.
    if (product.toggleAvailability) {
      const current = await db
        .prepare(`SELECT * FROM products WHERE id = ? AND store_id = ?`)
        .bind(productId, store.id)
        .first();
      if (!current) return json({ error: "Produit introuvable" }, 404);

      const nextAvailable = typeof product.isAvailable === "boolean"
        ? product.isAvailable
        : !Boolean(current.is_available);
      const restockDate = nextAvailable
        ? null
        : (product.restockDate ?? product.restock_date ?? current.restock_date ?? null);

      await db
        .prepare(`
          UPDATE products
          SET is_available = ?, restock_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND store_id = ?
        `)
        .bind(nextAvailable ? 1 : 0, restockDate, productId, store.id)
        .run();

      return json({
        success: true,
        product: {
          ...current,
          is_available: nextAvailable ? 1 : 0,
          restock_date: restockDate,
        },
      });
    }

    const normalized = normalizeProduct(product);
    const validationError = validateProduct(normalized);
    if (validationError) return json({ error: validationError }, 400);

    if (!(await categoryBelongsToStore(db, normalized.categoryId, store.id))) {
      return json({ error: "Catégorie invalide pour cette boutique" }, 400);
    }

    const result = await db
      .prepare(`
        UPDATE products
        SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?,
            is_available = ?, restock_date = ?, is_featured = ?, sort_order = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND store_id = ?
      `)
      .bind(
        normalized.categoryId,
        normalized.name,
        normalized.description,
        normalized.price,
        normalized.imageUrl,
        normalized.isAvailable ? 1 : 0,
        normalized.restockDate,
        normalized.isFeatured ? 1 : 0,
        normalized.sortOrder,
        productId,
        store.id,
      )
      .run();

    if (!result?.meta?.changes) {
      return json({ error: "Produit introuvable" }, 404);
    }

    return json({ success: true });
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
    const productId = String(body.productId ?? "").trim();

    if (!productId) return json({ error: "Produit introuvable" }, 400);

    const result = await db
      .prepare(`DELETE FROM products WHERE id = ? AND store_id = ?`)
      .bind(productId, store.id)
      .run();

    if (!result?.meta?.changes) {
      return json({ error: "Produit introuvable" }, 404);
    }

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Erreur serveur" }, 500);
  }
};
