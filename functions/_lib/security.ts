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

export async function guardAdmin(
  request: Request,
  env: SecurityEnv,
): Promise<Response | null> {
  const db = env.DB;
  if (!db) return json({ error: "Base D1 non disponible" }, 500);

  const [limiterKey] = await limiterKeys("admin:ip", [clientIp(request)]);
  const blockedState = await rateLimitState(db, limiterKey);
  const expected = (env.ADMIN_KEY ?? "").trim();
  const direct = request.headers.get("X-Admin-Key");
  const authorization = request.headers.get("Authorization") ?? "";
  const provided = (direct ?? (authorization.startsWith("Bearer ") ? authorization.slice(7) : "")).trim();

  if (expected && provided && safeEqualStrings(provided, expected)) {
    await clearFailures(db, limiterKey);
    return null;
  }

  if (blockedState.blocked) return rateLimitResponse(blockedState.retryAfter);
  const failure = await recordFailure(db, limiterKey, RATE_LIMITS.admin);
  return failure.blocked
    ? rateLimitResponse(failure.retryAfter)
    : json({ error: "Accès administrateur non autorisé" }, 401);
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
  const storeId = String(input.storeId ?? "").trim();
  const licenseKey = String(input.licenseKey ?? "").trim();
  const pin = String(input.pinCode ?? "").trim();

  if (!storeId || !licenseKey || !pin) {
    return { response: json({ error: "Accès refusé : identifiants incomplets" }, 401) };
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

  if (Number(store.is_active) === 0) {
    return { response: json({ error: "Cette boutique a été suspendue par l'administrateur" }, 403) };
  }

  if (store.expires_at && store.expires_at < new Date().toISOString()) {
    return {
      response: json({
        error: "Votre licence a expiré. Contactez Karis pour le renouveler.",
        isExpired: true,
      }, 403),
    };
  }

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
