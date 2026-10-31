/**
 * Dynamically updates SEO tags: title, meta description, canonical, and OpenGraph/Twitter tags
 */
export interface SeoMetadata {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
}

const DEFAULT_METADATA: Required<SeoMetadata> = {
  title: 'VitrineExpress — Vitrines Produits & Commandes WhatsApp',
  description: 'Scannez, découvrez et commandez : vitrines WhatsApp rapides et élégantes pour les commerçants du Cameroun.',
  canonicalPath: '/',
  image: 'https://vitrine-express.pages.dev/og-image.png',
  type: 'website',
};

function setMetaTag(selector: string, attribute: 'content' | 'href', value: string) {
  let element = document.querySelector(selector);
  if (!element) {
    if (selector.startsWith('meta[')) {
      element = document.createElement('meta');
      const attrMatch = selector.match(/meta\[([a-zA-Z:-]+)="([^"]+)"\]/);
      if (attrMatch) {
        element.setAttribute(attrMatch[1], attrMatch[2]);
        document.head.appendChild(element);
      }
    } else if (selector.startsWith('link[')) {
      element = document.createElement('link');
      element.setAttribute('rel', 'canonical');
      document.head.appendChild(element);
    }
  }
  if (element) {
    element.setAttribute(attribute, value);
  }
}

export function updatePageSeo(meta: SeoMetadata = {}) {
  if (typeof document === 'undefined') return;

  const origin = window.location.origin;
  const canonicalPath = meta.canonicalPath ?? window.location.pathname;
  const fullCanonicalUrl = `${origin}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;

  const title = meta.title ? `${meta.title} | VitrineExpress` : DEFAULT_METADATA.title;
  const description = meta.description || DEFAULT_METADATA.description;
  const image = meta.image || DEFAULT_METADATA.image;
  const type = meta.type || DEFAULT_METADATA.type;

  // Title
  document.title = title;

  // Standard Meta
  setMetaTag('meta[name="description"]', 'content', description);
  setMetaTag('link[rel="canonical"]', 'href', fullCanonicalUrl);

  // Open Graph
  setMetaTag('meta[property="og:title"]', 'content', title);
  setMetaTag('meta[property="og:description"]', 'content', description);
  setMetaTag('meta[property="og:url"]', 'content', fullCanonicalUrl);
  setMetaTag('meta[property="og:image"]', 'content', image);
  setMetaTag('meta[property="og:type"]', 'content', type);

  // Twitter
  setMetaTag('meta[name="twitter:title"]', 'content', title);
  setMetaTag('meta[name="twitter:description"]', 'content', description);
  setMetaTag('meta[name="twitter:url"]', 'content', fullCanonicalUrl);
  setMetaTag('meta[name="twitter:image"]', 'content', image);
}
