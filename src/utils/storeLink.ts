const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

function normalizeSlug(value: string | null): string | null {
  if (!value) return null;
  const slug = value.trim();
  return SLUG_PATTERN.test(slug) ? slug.toLowerCase() : null;
}

export function extractStoreSlug(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const directSlug = normalizeSlug(raw);
  if (directSlug) return directSlug;

  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) && /^[\w.-]+\.[a-z]{2,}\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate, window.location.origin);
  } catch {
    return null;
  }

  const storeParam = normalizeSlug(url.searchParams.get('store'));
  if (storeParam) return storeParam;

  const match = url.pathname.match(/\/boutique\/([^/]+)\/?$/);
  if (!match) return null;

  try {
    return normalizeSlug(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
