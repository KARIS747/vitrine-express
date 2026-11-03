// Cloudflare Pages Function: /boutique/[slug]
// SSR des balises Open Graph pour WhatsApp, Facebook, Twitter et robots d'indexation.

import { serveAppShell } from "../_lib/appShell";

interface Env {
  DB: any;
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

export const onRequestGet = async (context: {
  request: Request;
  params: { slug: string };
  env: Env;
  next: () => Promise<Response>;
}) => {
  const { slug } = context.params;
  const db = context.env.DB;
  const url = new URL(context.request.url);

  if (!db || !slug) {
    return serveAppShell(context, {
      title: "Boutique | VitrineExpress",
      canonicalPath: url.pathname,
    });
  }

  try {
    const store = await db
      .prepare(`
        SELECT
          name, tagline, description, city, quarter,
          logo_url, banner_url, is_active, expires_at
        FROM stores
        WHERE slug = ?
      `)
      .bind(slug)
      .first();

    if (!store || Number(store.is_active) === 0) {
      return serveAppShell(context, {
        title: "Boutique introuvable | VitrineExpress",
        description: "Cette vitrine n'existe pas ou a été désactivée.",
        canonicalPath: url.pathname,
        noindex: true,
        status: 404,
      });
    }

    const now = new Date().toISOString();
    const isExpired = store.expires_at && store.expires_at < now;

    if (isExpired) {
      return serveAppShell(context, {
        title: `${store.name} — Vitrine momentanément indisponible | VitrineExpress`,
        description: `La vitrine de ${store.name} est momentanément indisponible.`,
        canonicalPath: url.pathname,
        noindex: true,
      });
    }

    // Description soignée pour l'aperçu WhatsApp
    const location = [store.quarter, store.city].filter(Boolean).join(", ");
    const descParts = [
      store.tagline || store.description,
      location ? `📍 ${location}` : "",
      "Commandez directement sur WhatsApp via VitrineExpress",
    ].filter(Boolean);

    const description = descParts.join(" — ");
    const image = store.banner_url || store.logo_url || `${url.origin}/og-image.png`;

    return serveAppShell(context, {
      title: `${store.name} | Vitrine WhatsApp`,
      description: description.slice(0, 200),
      canonicalPath: `/boutique/${encodeURIComponent(slug)}`,
      image,
      imageAlt: `Vitrine de ${store.name}`,
      type: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Store",
        name: store.name,
        description: store.description || store.tagline,
        image,
        address: location ? { "@type": "PostalAddress", addressLocality: location } : undefined,
      },
    });
  } catch (err) {
    return serveAppShell(context, {
      title: "VitrineExpress",
      canonicalPath: url.pathname,
    });
  }
};
