// Cloudflare Pages Function: Dynamic sitemap.xml for active stores
interface Env {
  DB: any;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const url = new URL(context.request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const now = new Date().toISOString();

  let storeUrls = '';

  if (context.env.DB) {
    try {
      const { results } = await context.env.DB
        .prepare(`
          SELECT slug, updated_at
          FROM stores
          WHERE is_active = 1 AND expires_at > ?
          ORDER BY updated_at DESC
        `)
        .bind(now)
        .all();

      if (results && results.length > 0) {
        storeUrls = results
          .map((row: any) => {
            const lastMod = row.updated_at ? row.updated_at.split(' ')[0] : new Date().toISOString().split('T')[0];
            return `  <url>
    <loc>${baseUrl}/boutique/${encodeURIComponent(row.slug)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
          })
          .join('\n');
      }
    } catch {
      // Fallback if DB error
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/merchant</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
${storeUrls}
</urlset>`.trim();

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
