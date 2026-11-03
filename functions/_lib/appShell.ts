// Sert l'application SPA avec des métadonnées rendues côté serveur.
// Indispensable pour les aperçus WhatsApp/Facebook qui n'exécutent pas le JS.

declare const HTMLRewriter: any;

export interface AppShellMeta {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  imageAlt?: string;
  type?: string;
  noindex?: boolean;
  status?: number;
  jsonLd?: Record<string, unknown>;
}

const DEFAULT_IMAGE_ALT = "VitrineExpress — vitrines et commandes WhatsApp";

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function serveAppShell(
  context: { request: Request; env: any; next?: () => Promise<Response> },
  meta: AppShellMeta = {},
): Promise<Response> {
  const requestUrl = new URL(context.request.url);
  const indexUrl = new URL("/index.html", requestUrl).toString();

  let asset: Response;
  try {
    asset = await context.env.ASSETS.fetch(new Request(indexUrl));
  } catch {
    asset = await context.next!();
  }

  if (!asset.ok) {
    return new Response("Application indisponible", { status: 503 });
  }

  const canonicalPath = meta.canonicalPath ?? requestUrl.pathname;
  const canonical = `${requestUrl.origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  const image = meta.image || `${requestUrl.origin}/og-image.png`;
  const nonce = context.request.headers.get("x-csp-nonce") ?? "";

  let rewriter = new HTMLRewriter()
    .on("title", {
      element(element: any) {
        if (meta.title) element.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', {
      element(element: any) {
        if (meta.description) element.setAttribute("content", meta.description);
      },
    })
    .on('link[rel="canonical"]', {
      element(element: any) {
        element.setAttribute("href", canonical);
      },
    })
    .on('meta[property="og:title"]', {
      element(element: any) {
        if (meta.title) element.setAttribute("content", meta.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(element: any) {
        if (meta.description) element.setAttribute("content", meta.description);
      },
    })
    .on('meta[property="og:url"]', {
      element(element: any) {
        element.setAttribute("content", canonical);
      },
    })
    .on('meta[property="og:image"]', {
      element(element: any) {
        element.setAttribute("content", image);
      },
    })
    .on('meta[property="og:image:alt"]', {
      element(element: any) {
        element.setAttribute("content", meta.imageAlt ?? DEFAULT_IMAGE_ALT);
      },
    })
    .on('meta[property="og:type"]', {
      element(element: any) {
        if (meta.type) element.setAttribute("content", meta.type);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element: any) {
        if (meta.title) element.setAttribute("content", meta.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element: any) {
        if (meta.description) element.setAttribute("content", meta.description);
      },
    })
    .on('meta[name="twitter:url"]', {
      element(element: any) {
        element.setAttribute("content", canonical);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(element: any) {
        element.setAttribute("content", image);
      },
    });

  if (meta.image) {
    rewriter = rewriter
      .on('meta[property="og:image:width"]', { element(element: any) { element.remove(); } })
      .on('meta[property="og:image:height"]', { element(element: any) { element.remove(); } });
  }

  const headExtras: string[] = [];
  if (meta.noindex) {
    headExtras.push('<meta name="robots" content="noindex, nofollow">');
  }
  if (meta.jsonLd && nonce) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c");
    headExtras.push(
      `<script type="application/ld+json" nonce="${escapeHtmlAttribute(nonce)}">${json}</script>`,
    );
  }
  if (headExtras.length > 0) {
    rewriter = rewriter.on("head", {
      element(element: any) {
        element.append(headExtras.join(""), { html: true });
      },
    });
  }

  const transformed = rewriter.transform(asset);
  const headers = new Headers(transformed.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set(
    "Cache-Control",
    meta.noindex ? "no-store" : "public, max-age=0, s-maxage=300",
  );
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");
  headers.delete("ETag");

  return new Response(transformed.body, {
    status: meta.status ?? 200,
    headers,
  });
}
