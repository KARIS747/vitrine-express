export interface MockD1Options {
  stores?: any[];
  licenses?: any[];
  categories?: any[];
  sessions?: any[];
  auth_attempts?: any[];
}

export function createMockD1(initial: MockD1Options = {}) {
  const stores = [...(initial.stores || [])];
  const licenses = [...(initial.licenses || [])];
  const categories = [...(initial.categories || [])];
  const sessions = [...(initial.sessions || [])];
  const authAttempts = [...(initial.auth_attempts || [])];

  function createStatement(sql: string, params: any[] = []) {
    return {
      bind(...newParams: any[]) {
        return createStatement(sql, newParams);
      },
      async first() {
        const norm = sql.toLowerCase().replace(/\s+/g, ' ');
        if (norm.includes('from auth_attempts where limiter_key')) {
          const key = params[0];
          return authAttempts.find((a) => a.limiter_key === key) || null;
        }
        if (norm.includes('from sessions where token_hash')) {
          const hash = params[0];
          return sessions.find((s) => s.token_hash === hash) || null;
        }
        if (norm.includes('from stores where slug')) {
          const slug = params[0];
          return stores.find((s) => s.slug === slug) || null;
        }
        if (norm.includes('from stores where id')) {
          const id = params[0];
          return stores.find((s) => s.id === id) || null;
        }
        if (norm.includes('from stores s') && norm.includes('where s.id = ?')) {
          const id = params[0];
          const st = stores.find((s) => s.id === id);
          if (!st) return null;
          return {
            ...st,
            current_products_count: 0,
            price_paid: 5000,
            license_status: 'active',
          };
        }
        return null;
      },
      async all() {
        const norm = sql.toLowerCase().replace(/\s+/g, ' ');
        if (norm.includes('from stores')) {
          return {
            results: stores.map((s) => ({
              ...s,
              current_products_count: 0,
              price_paid: 5000,
              license_status: 'active',
            })),
          };
        }
        return { results: [] };
      },
      async run() {
        const norm = sql.toLowerCase().replace(/\s+/g, ' ');
        if (norm.includes('insert into auth_attempts')) {
          const [key, failures, windowStart, blockedUntil] = params;
          const idx = authAttempts.findIndex((a) => a.limiter_key === key);
          const record = {
            limiter_key: key,
            failures,
            window_started_at: windowStart,
            blocked_until: blockedUntil,
          };
          if (idx >= 0) authAttempts[idx] = record;
          else authAttempts.push(record);
          return { success: true };
        }
        if (norm.includes('delete from auth_attempts')) {
          const key = params[0];
          const idx = authAttempts.findIndex((a) => a.limiter_key === key);
          if (idx >= 0) authAttempts.splice(idx, 1);
          return { success: true };
        }
        if (norm.includes('insert into sessions')) {
          const [tokenHash, scope, storeId, expiresAt, userAgent] = params;
          sessions.push({ token_hash: tokenHash, scope, store_id: storeId, expires_at: expiresAt, user_agent: userAgent });
          return { success: true };
        }
        if (norm.includes('update stores set max_products')) {
          const [max, id] = params;
          const st = stores.find((s) => s.id === id);
          if (st) st.max_products = max;
          return { success: true };
        }
        if (norm.includes('update stores set pin_code')) {
          const [pinHash, id] = params;
          const st = stores.find((s) => s.id === id);
          if (st) st.pin_code = pinHash;
          return { success: true };
        }
        if (norm.includes('update stores set expires_at')) {
          const [expiresAt, id] = params;
          const st = stores.find((s) => s.id === id);
          if (st) st.expires_at = expiresAt;
          return { success: true };
        }
        if (norm.includes('update stores set is_active')) {
          const [active, id] = params;
          const st = stores.find((s) => s.id === id);
          if (st) st.is_active = active;
          return { success: true };
        }
        return { success: true, meta: { changes: 1 } };
      },
    };
  }

  const db = {
    stores,
    licenses,
    categories,
    sessions,
    authAttempts,
    prepare(sql: string) {
      return createStatement(sql);
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        await stmt.run();
      }
      return statements.map(() => ({ success: true }));
    },
  };

  return db;
}
