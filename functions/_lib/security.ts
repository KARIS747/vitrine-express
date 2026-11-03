// Helpers partagés : hachage des PIN, authentification marchand et limitation
// des tentatives. Les PIN sont hachés avec HMAC-SHA256 + sel aléatoire et un
// secret serveur (PIN_PEPPER), ce qui reste compatible avec le plan gratuit
// Cloudflare Workers (pas de PBKDF2 coûteux en CPU).

export interface SecurityEnv {
  DB: any;
  ADMIN_KEY?: string;
  PIN_PEPPER?: string;
}

const encoder = new TextEncoder();
const PIN_HASH_PREFIX = "hmac-sha256";

export const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });

export function clientIp(request: Request): string {
  const direct = request.headers.get("CF-Connecting-IP");
  if (direct) return direct.trim();
  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqualStrings(left: string, right: string): boolean {
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function computePinHash(pin: string, salt: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${salt}:${pin}`),
  );
  return bytesToBase64(new Uint8Array(signature));
}

export async function hashPin(pin: string, pepper: string): Promise<string> {
  if (!pepper) throw new Error("PIN_PEPPER manquant");
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64(saltBytes);
  const hash = await computePinHash(pin, salt, pepper);
  return `${PIN_HASH_PREFIX}$${salt}$${hash}`;
}

export async function verifyPin(
  pin: string,
  storedValue: unknown,
  pepper: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  const stored = String(storedValue ?? "");
  if (!stored) return { valid: false, needsRehash: false };
  if (!pepper) throw new Error("PIN_PEPPER manquant");

  if (stored.startsWith(`${PIN_HASH_PREFIX}$`)) {
    const [, salt, expected] = stored.split("$");
    if (!salt || !expected) return { valid: false, needsRehash: false };
    const actual = await computePinHash(pin, salt, pepper);
    return { valid: safeEqualStrings(actual, expected), needsRehash: false };
  }

  // Anciens PIN stockés en clair : on les accepte une dernière fois puis on les
  // remplace par un hash après une connexion réussie.
  return { valid: safeEqualStrings(pin, stored), needsRehash: true };
}

export interface RateLimitConfig {
  maxFailures: number;
  windowSeconds: number;
  blockSeconds: number;
}

export const RATE_LIMITS = {
  merchantLogin: { maxFailures: 5, windowSeconds: 900, blockSeconds: 900 },
  merchantAction: { maxFailures: 12, windowSeconds: 900, blockSeconds: 900 },
  admin: { maxFailures: 5, windowSeconds: 900, blockSeconds: 1800 },
} satisfies Record<string, RateLimitConfig>;

/*
 * Utilise la table auth_attempts créée par schema.sql :
 * - failures : nombre d'échecs dans la fenêtre courante
 * - window_started_at : début de la fenêtre
 * - blocked_until : fin du blocage éventuel
 */
export async function rateLimitState(
  db: any,
  limiterKey: string,
): Promise<{ blocked: boolean; retryAfter: number }> {
  try {
    const row = await db
      .prepare(`SELECT blocked_until FROM auth_attempts WHERE limiter_key = ?`)
      .bind(limiterKey)
      .first();
    if (!row?.blocked_until) return { blocked: false, retryAfter: 0 };
    const remaining = new Date(row.blocked_until).getTime() - Date.now();
    if (remaining <= 0) return { blocked: false, retryAfter: 0 };
    return { blocked: true, retryAfter: Math.ceil(remaining / 1000) };
  } catch {
    return { blocked: false, retryAfter: 0 };
  }
}

export async function recordFailure(
  db: any,
  limiterKey: string,
  config: RateLimitConfig,
): Promise<{ blocked: boolean; retryAfter: number }> {
  const now = Date.now();
  try {
    const row = await db
      .prepare(`SELECT failures, window_started_at FROM auth_attempts WHERE limiter_key = ?`)
      .bind(limiterKey)
      .first();

    const windowStartedAt = row?.window_started_at
      ? new Date(row.window_started_at).getTime()
      : 0;
    const inCurrentWindow = Boolean(row) && now - windowStartedAt < config.windowSeconds * 1000;
    const failures = inCurrentWindow ? Number(row.failures) + 1 : 1;
    const windowStart = inCurrentWindow ? row.window_started_at : new Date(now).toISOString();
    const blocked = failures >= config.maxFailures;
    const blockedUntil = blocked
      ? new Date(now + config.blockSeconds * 1000).toISOString()
      : null;

    await db
      .prepare(`
        INSERT INTO auth_attempts (limiter_key, failures, window_started_at, blocked_until, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(limiter_key) DO UPDATE SET
          failures = excluded.failures,
          window_started_at = excluded.window_started_at,
          blocked_until = excluded.blocked_until,
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(limiterKey, failures, windowStart, blockedUntil)
      .run();

    return { blocked, retryAfter: blocked ? config.blockSeconds : 0 };
  } catch {
    return { blocked: false, retryAfter: 0 };
  }
}

export async function clearFailures(db: any, limiterKey: string): Promise<void> {
  try {
    await db
      .prepare(`DELETE FROM auth_attempts WHERE limiter_key = ?`)
      .bind(limiterKey)
      .run();
  } catch {
    // La limitation ne doit pas bloquer une connexion légitime.
  }
}

export function rateLimitResponse(retryAfter: number): Response {
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return json(
    { error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
    429,
    { "Retry-After": String(Math.max(1, retryAfter)) },
  );
}

async function limiterKeys(prefix: string, values: string[]): Promise<string[]> {
  return Promise.all(
    values.map(async (value) => `${prefix}:${await sha256Hex(value.trim().toLowerCase())}`),
  );
}

// ---------------------------------------------------------------------------
// Sessions serveur : le navigateur ne conserve qu'un cookie HttpOnly.
// ---------------------------------------------------------------------------

export const MERCHANT_SESSION_COOKIE = "ve_session";
export const ADMIN_SESSION_COOKIE = "ve_admin_session";
export const SESSION_TTLS = {
  merchant: 60 * 60 * 24 * 7,
  merchantRemember: 60 * 60 * 24 * 30,
  admin: 60 * 60 * 12,
  adminRemember: 60 * 60 * 24 * 30,
} as const;

type SessionScope = "merchant" | "admin";

function randomToken(bytes = 32): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToBase64(values)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export function sessionCookie(
  request: Request,
  name: string,
  token: string,
  maxAgeSeconds = 0,
): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const maxAge = maxAgeSeconds > 0 ? `; Max-Age=${maxAgeSeconds}` : "";
  const sameSite = name === ADMIN_SESSION_COOKIE ? "Strict" : "Lax";
  return `${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}${secure}${maxAge}`;
}

export function clearSessionCookie(request: Request, name: string): string {
  return sessionCookie(request, name, "", 0) + "; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export async function createSession(
  db: any,
  scope: SessionScope,
  storeId: string | null,
  request: Request,
  ttlSeconds: number,
): Promise<{ token: string; expiresAt: string }> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await db
    .prepare(`
      INSERT INTO sessions (token_hash, scope, store_id, expires_at, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      tokenHash,
      scope,
      storeId,
      expiresAt,
      (request.headers.get("User-Agent") ?? "").slice(0, 240) || null,
    )
    .run();

  // Nettoyage opportuniste des sessions expirées.
  try {
    await db
      .prepare(`DELETE FROM sessions WHERE expires_at < ?`)
      .bind(new Date().toISOString())
      .run();
  } catch {
    // Le nettoyage ne doit pas empêcher la connexion.
  }

  return { token, expiresAt };
}

async function deleteSessionByToken(db: any, token: string | null): Promise<void> {
  if (!token) return;
  try {
    const tokenHash = await sha256Hex(token);
    await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
  } catch {
    // La déconnexion locale reste valable même si la suppression échoue.
  }
}

function storeAccessResponse(store: any): Response | null {
  if (!store) return json({ error: "Boutique introuvable" }, 401);
  if (Number(store.is_active) === 0) {
    return json({ error: "Cette boutique a été suspendue par l'administrateur" }, 403);
  }
  if (store.expires_at && store.expires_at < new Date().toISOString()) {
    return json({
      error: "Votre licence a expiré. Contactez Karis pour le renouveler.",
      isExpired: true,
    }, 403);
  }
  return null;
}

export async function getMerchantSessionStore(
  db: any,
  request: Request,
): Promise<{ store?: any; hasCookie: boolean }> {
  const token = readCookie(request, MERCHANT_SESSION_COOKIE);
  if (!token) return { hasCookie: false };

  try {
    const tokenHash = await sha256Hex(token);
    const session = await db
      .prepare(`SELECT store_id, expires_at FROM sessions WHERE token_hash = ? AND scope = 'merchant'`)
      .bind(tokenHash)
      .first();

    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
      return { hasCookie: true };
    }

    const store = await db
      .prepare(`SELECT * FROM stores WHERE id = ?`)
      .bind(session.store_id)
      .first();

    return { store: store ?? undefined, hasCookie: true };
  } catch {
    return { hasCookie: true };
  }
}

export async function hasAdminSession(db: any, request: Request): Promise<boolean> {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!token) return false;

  try {
    const tokenHash = await sha256Hex(token);
    const session = await db
      .prepare(`SELECT expires_at FROM sessions WHERE token_hash = ? AND scope = 'admin'`)
      .bind(tokenHash)
      .first();

    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function revokeMerchantSession(db: any, request: Request): Promise<string> {
  await deleteSessionByToken(db, readCookie(request, MERCHANT_SESSION_COOKIE));
  return clearSessionCookie(request, MERCHANT_SESSION_COOKIE);
}

export async function revokeAdminSession(db: any, request: Request): Promise<string> {
  await deleteSessionByToken(db, readCookie(request, ADMIN_SESSION_COOKIE));
  return clearSessionCookie(request, ADMIN_SESSION_COOKIE);
}

export async function verifyAdminAccess(
  request: Request,
  env: SecurityEnv,
  providedKey: string,
): Promise<Response | null> {
  const db = env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  const expected = (env.ADMIN_KEY ?? "").trim();
  if (!expected) {
    return json({ error: "Configuration administrateur incomplète (ADMIN_KEY)" }, 500);
  }

  const provided = providedKey.trim();
  if (!provided) return json({ error: "Accès administrateur non autorisé" }, 401);

  const [limiterKey] = await limiterKeys("admin:ip", [clientIp(request)]);
  const blockedState = await rateLimitState(db, limiterKey);
  if (blockedState.blocked) return rateLimitResponse(blockedState.retryAfter);

  if (safeEqualStrings(provided, expected)) {
    await clearFailures(db, limiterKey);
    return null;
  }

  const failure = await recordFailure(db, limiterKey, RATE_LIMITS.admin);
  return failure.blocked
    ? rateLimitResponse(failure.retryAfter)
    : json({ error: "Accès administrateur non autorisé" }, 401);
}

export async function guardAdmin(
  request: Request,
  env: SecurityEnv,
): Promise<Response | null> {
  const db = env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  if (await hasAdminSession(db, request)) return null;

  const direct = request.headers.get("X-Admin-Key");
  const authorization = request.headers.get("Authorization") ?? "";
  const provided = (direct ?? (authorization.startsWith("Bearer ") ? authorization.slice(7) : "")).trim();

  if (!provided) return json({ error: "Accès administrateur non autorisé" }, 401);
  return verifyAdminAccess(request, env, provided);
}

export interface MerchantAuthInput {
  storeId?: unknown;
  licenseKey?: unknown;
  pinCode?: unknown;
  pepper: string;
  request: Request;
}

export async function authenticateMerchant(
  db: any,
  input: MerchantAuthInput,
): Promise<{ store?: any; response?: Response }> {
  // 1. Session HttpOnly (nouveau fonctionnement, aucun secret dans le navigateur).
  const session = await getMerchantSessionStore(db, input.request);
  if (session.store) {
    const denial = storeAccessResponse(session.store);
    if (denial) return { response: denial };
    return { store: session.store };
  }

  // 2. Ancien mode (storeId + licence + PIN dans le corps) conservé pour les
  // clients déjà ouverts pendant le déploiement. Il sera retiré ensuite.
  const storeId = String(input.storeId ?? "").trim();
  const licenseKey = String(input.licenseKey ?? "").trim();
  const pin = String(input.pinCode ?? "").trim();

  if (!storeId || !licenseKey || !pin) {
    return {
      response: json(
        { error: session.hasCookie ? "Session expirée, reconnectez-vous" : "Accès refusé : identifiants incomplets" },
        401,
        session.hasCookie
          ? { "Set-Cookie": clearSessionCookie(input.request, MERCHANT_SESSION_COOKIE) }
          : {},
      ),
    };
  }
  if (!input.pepper) {
    return { response: json({ error: "Configuration de sécurité incomplète" }, 500) };
  }

  const [ipKey] = await limiterKeys("merchant:ip", [clientIp(input.request)]);
  const storeLimiterKey = `merchant:store:${await sha256Hex(storeId)}`;
  const states = await Promise.all([
    rateLimitState(db, ipKey),
    rateLimitState(db, storeLimiterKey),
  ]);

  const store = await db
    .prepare(`SELECT * FROM stores WHERE id = ? AND license_key = ?`)
    .bind(storeId, licenseKey)
    .first();

  const pinResult = store
    ? await verifyPin(pin, store.pin_code, input.pepper)
    : { valid: false, needsRehash: false };

  if (!store || !pinResult.valid) {
    if (states.some((state) => state.blocked)) {
      const retryAfter = Math.max(...states.map((state) => state.retryAfter));
      return { response: rateLimitResponse(retryAfter) };
    }
    const failures = await Promise.all([
      recordFailure(db, ipKey, RATE_LIMITS.merchantAction),
      recordFailure(db, storeLimiterKey, RATE_LIMITS.merchantAction),
    ]);
    const blocked = failures.find((failure) => failure.blocked);
    return blocked
      ? { response: rateLimitResponse(blocked.retryAfter) }
      : { response: json({ error: "Authentification boutiquier invalide" }, 403) };
  }

  await Promise.all([clearFailures(db, ipKey), clearFailures(db, storeLimiterKey)]);

  if (pinResult.needsRehash) {
    const hashedPin = await hashPin(pin, input.pepper);
    await db
      .prepare(`UPDATE stores SET pin_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(hashedPin, store.id)
      .run();
  }

  const denial = storeAccessResponse(store);
  if (denial) return { response: denial };

  return { store };
}

export async function authenticateMerchantLogin(
  db: any,
  request: Request,
  identifier: string,
  pin: string,
  pepper: string,
): Promise<{ store?: any; response?: Response }> {
  if (!pepper) {
    return { response: json({ error: "Configuration de sécurité incomplète" }, 500) };
  }

  const normalizedIdentifier = identifier.trim();
  const [ipKey, idKey] = await limiterKeys("merchant-login", [
    clientIp(request),
    normalizedIdentifier,
  ]);
  const states = await Promise.all([
    rateLimitState(db, ipKey),
    rateLimitState(db, idKey),
  ]);

  const store = await db
    .prepare(`SELECT * FROM stores WHERE license_key = ? OR slug = ?`)
    .bind(normalizedIdentifier, normalizedIdentifier.toLowerCase())
    .first();

  const pinResult = store
    ? await verifyPin(pin, store.pin_code, pepper)
    : { valid: false, needsRehash: false };

  if (!store || !pinResult.valid) {
    if (states.some((state) => state.blocked)) {
      const retryAfter = Math.max(...states.map((state) => state.retryAfter));
      return { response: rateLimitResponse(retryAfter) };
    }
    const failures = await Promise.all([
      recordFailure(db, ipKey, RATE_LIMITS.merchantLogin),
      recordFailure(db, idKey, RATE_LIMITS.merchantLogin),
    ]);
    const blocked = failures.find((failure) => failure.blocked);
    return blocked
      ? { response: rateLimitResponse(blocked.retryAfter) }
      : { response: json({ error: "Identifiants invalides" }, 401) };
  }

  await Promise.all([clearFailures(db, ipKey), clearFailures(db, idKey)]);

  if (pinResult.needsRehash) {
    const hashedPin = await hashPin(pin, pepper);
    await db
      .prepare(`UPDATE stores SET pin_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(hashedPin, store.id)
      .run();
  }

  if (Number(store.is_active) === 0) {
    return { response: json({ error: "Cette boutique a été suspendue par l'administrateur" }, 403) };
  }

  if (store.expires_at && store.expires_at < new Date().toISOString()) {
    return {
      response: json({
        error: "Votre licence a expiré. Contactez Karis pour la renouveler.",
        isExpired: true,
      }, 403),
    };
  }

  return { store };
}
