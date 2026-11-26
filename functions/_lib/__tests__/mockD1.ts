export interface MockD1Options {
  stores?: any[];
  licenses?: any[];
  categories?: any[];
  sessions?: any[];
  auth_attempts?: any[];
  products?: any[];
  notifications?: any[];
  notification_reads?: any[];
  license_payments?: any[];
  analytics_events?: any[];
}

export function createMockD1(initial: MockD1Options = {}) {
  const stores = [...(initial.stores || [])];
  const licenses = [...(initial.licenses || [])];
  const categories = [...(initial.categories || [])];
  const sessions = [...(initial.sessions || [])];
  const authAttempts = [...(initial.auth_attempts || [])];
  const products = [...(initial.products || [])];
  const notifications = [...(initial.notifications || [])];
  const notificationReads = [...(initial.notification_reads || [])];
  const licensePayments = [...(initial.license_payments || [])];
  const analyticsEvents = [...(initial.analytics_events || [])];

  function latest(records: any[]): any {
    return [...records].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).pop() || null;
  }

  function storeWithComputed(st: any) {
    const storeId = st.id;
    const payments = licensePayments.filter((payment) => payment.store_id === storeId);
    const paid = payments.filter((payment) => payment.status === 'paid');
    const due = payments.filter((payment) => payment.status === 'due');
    const pricePaid = paid.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    const amountDue = due.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    const latestPayment = latest([...paid, ...due]);
    const latestLicense = latest(licenses.filter((license) => license.store_id === storeId));
    const productsCount = products.filter((product) => product.store_id === storeId).length;
    return {
      ...st,
      current_products_count: productsCount,
      price_paid: pricePaid,
      amount_due: amountDue,
      plan: latestPayment?.plan ?? (Number(st.max_products) >= 999 ? 'premium' : Number(st.max_products) > 8 ? 'pro' : 'decouverte'),
      license_status: latestLicense?.status ?? null,
    };
  }


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
        if (norm.includes('from stores where lower(trim(name)) = lower(trim(?)) and is_active = 1')) {
          const nameToMatch = String(params[0] ?? '').trim().toLowerCase();
          return stores.find((s) => s.name && s.name.trim().toLowerCase() === nameToMatch && (s.is_active === 1 || s.is_active === true)) || null;
        }
        if (norm.includes('select id from stores where lower(trim(name)) = lower(trim(?))')) {
          const nameToMatch = String(params[0] ?? '').trim().toLowerCase();
          return stores.find((s) => s.name && s.name.trim().toLowerCase() === nameToMatch) || null;
        }
        if (
          norm.includes('from stores where license_key = ? or slug = ?') ||
          norm.includes('where lower(trim(name)) = lower(trim(?))')
        ) {
          const [idVal, slugVal, licKey, , phone1, phone2] = params;
          const searchNorm = String(idVal ?? '').trim().toLowerCase();
          return (
            stores.find(
              (s) =>
                (s.name && s.name.trim().toLowerCase() === searchNorm) ||
                (s.slug && s.slug.toLowerCase() === String(slugVal ?? '').toLowerCase()) ||
                (s.license_key && s.license_key === licKey) ||
                (phone1 && s.whatsapp_number === phone1) ||
                (phone2 && s.whatsapp_number === phone2),
            ) || null
          );
        }
        if (norm.includes('from stores where slug')) {
          const slug = params[0];
          return stores.find((s) => s.slug === slug) || null;
        }
        if (norm.includes('from stores where whatsapp_number')) {
          const phone = params[0];
          return stores.find((s) => s.whatsapp_number === phone) || null;
        }
        if (norm.includes('from stores where license_key')) {
          const key = params[0];
          return stores.find((s) => s.license_key === key) || null;
        }
        if (norm.includes('from stores where id')) {
          const id = params[0];
          const st = stores.find((s) => s.id === id);
          return st ? storeWithComputed(st) : null;
        }
        if (norm.includes('select count(distinct store_id) as total from products')) {
          return { total: new Set(products.map((product) => product.store_id)).size };
        }
        if (norm.includes('select count(*) as total from stores')) {
          return { total: stores.length };
        }
        if (norm.includes('from products where store_id') && norm.includes('count(*)')) {
          const storeId = params[0];
          const count = products.filter((p) => p.store_id === storeId).length;
          return { total: count };
        }
        if (norm.includes('from categories where id = ? and store_id = ?')) {
          const [catId, storeId] = params;
          return categories.find((c) => c.id === catId && c.store_id === storeId) || null;
        }
        if (norm.includes('from stores s') && norm.includes('where s.id = ?')) {
          const id = params[0];
          const st = stores.find((s) => s.id === id);
          if (!st) return null;
          return storeWithComputed(st);
        }
        return null;
      },
      async all() {
        const norm = sql.toLowerCase().replace(/\s+/g, ' ');
        if (norm.includes('from products where store_id = ?')) {
          const storeId = params[0];
          return { results: products.filter((p) => p.store_id === storeId) };
        }
        if (norm.includes('from categories where store_id = ?')) {
          const storeId = params[0];
          return { results: categories.filter((c) => c.store_id === storeId) };
        }
        if (norm.includes('from notifications n') && norm.includes('left join notification_reads')) {
          const storeId = params[0];
          const matched = notifications
            .filter((n) => !n.store_id || n.store_id === storeId)
            .map((n) => ({
              ...n,
              is_read: Boolean(
                notificationReads.find(
                  (nr) => nr.notification_id === n.id && nr.store_id === storeId,
                ),
              ),
            }));
          return { results: matched };
        }
        if (norm.includes('from notifications n') && norm.includes('left join stores s')) {
          const matched = notifications.map((n) => {
            const st = stores.find((s) => s.id === n.store_id);
            return {
              ...n,
              store_name: st ? st.name : null,
            };
          });
          return { results: matched };
        }
        if (norm.includes('from analytics_events') && norm.includes('group by')) {
          const groupByCampaign = norm.includes('group by campaign');
          const keyField = groupByCampaign ? 'campaign' : 'event';
          const source = groupByCampaign
            ? analyticsEvents.filter((item) => Boolean(item.campaign))
            : analyticsEvents;
          const counts = new Map<string, number>();
          for (const item of source) {
            const key = String(item[keyField] ?? '');
            if (!key) continue;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
          const results = Array.from(counts.entries()).map(([key, total]) =>
            groupByCampaign ? { campaign: key, total } : { event: key, total },
          );
          if (groupByCampaign) results.sort((a, b) => (b as any).total - (a as any).total);
          return { results };
        }
        if (norm.includes('from stores')) {
          return {
            results: stores.map((s) => storeWithComputed(s)),
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
        if (norm.includes('delete from sessions where token_hash')) {
          const tokenHash = params[0];
          const idx = sessions.findIndex((s) => s.token_hash === tokenHash);
          if (idx >= 0) sessions.splice(idx, 1);
          return { success: true };
        }
        if (norm.includes('delete from sessions where store_id')) {
          const storeId = params[0];
          for (let idx = sessions.length - 1; idx >= 0; idx -= 1) {
            if (sessions[idx].store_id === storeId) sessions.splice(idx, 1);
          }
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('insert into stores')) {
          const hasCountry = norm.includes('country');
          const hasPref = norm.includes('contact_preference');
          const storeObj: any = {
            id: params[0],
            slug: params[1],
            name: params[2],
            whatsapp_number: params[3],
            phone_call: params[4],
            contact_preference: hasPref ? params[5] : 'whatsapp',
            contact_email: hasPref ? params[6] : null,
            country: hasCountry ? params[7] : 'Cameroun',
            city: hasCountry ? params[8] : (hasPref ? params[7] : params[5]),
            quarter: hasCountry ? params[9] : (hasPref ? params[8] : params[6]),
            license_key: hasCountry ? params[10] : (hasPref ? params[9] : params[7]),
            pin_code: hasCountry ? params[11] : (hasPref ? params[10] : params[8]),
            max_products: hasCountry ? params[12] : (hasPref ? params[11] : params[9]),
            expires_at: hasCountry ? params[13] : (hasPref ? params[12] : params[10]),
            is_active: 1,
          };
          stores.push(storeObj);
          return { success: true };
        }
        if (norm.includes('update stores set expires_at = ?, max_products')) {
          const [expiresAt, maxProducts, id] = params;
          const st = stores.find((s) => s.id === id);
          if (st) {
            st.expires_at = expiresAt;
            st.max_products = maxProducts;
          }
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('update licenses set expires_at')) {
          const [expiresAt, maxProducts, duration, pricePaid, status, notes, storeId] = params;
          const st = stores.find((s) => s.id === storeId);
          if (st) st.expires_at = expiresAt;
          const matching = licenses.filter((license) => license.store_id === storeId);
          matching.forEach((license) => {
            license.expires_at = expiresAt;
            license.max_products = maxProducts;
            license.duration_months = duration;
            license.price_paid = pricePaid;
            license.status = status;
            license.notes = notes;
          });
          return { success: true, meta: { changes: matching.length ? 1 : 0 } };
        }
        if (norm.includes('update licenses set status')) {
          const [status, storeId] = params;
          licenses.filter((license) => license.store_id === storeId).forEach((license) => {
            license.status = status;
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('update licenses set max_products')) {
          const [maxProducts, storeId] = params;
          licenses.filter((license) => license.store_id === storeId).forEach((license) => {
            license.max_products = maxProducts;
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('update license_payments set status')) {
          licensePayments.filter((payment) => payment.store_id === params[1]).forEach((payment) => {
            if (payment.status === 'due') payment.status = 'cancelled';
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('delete from sessions where store_id')) {
          const idx = sessions.findIndex((session) => session.store_id === params[0]);
          if (idx >= 0) sessions.splice(idx, 1);
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('insert into licenses')) {
          const [
            id,
            licenseKey,
            storeId,
            clientName,
            clientPhone,
            pricePaid,
            maxProducts,
            duration,
            expiresAt,
            status,
            notes,
          ] = params;
          licenses.push({
            id,
            license_key: licenseKey,
            store_id: storeId,
            client_name: clientName,
            client_phone: clientPhone,
            price_paid: Number(pricePaid) || 0,
            max_products: Number(maxProducts) || 0,
            duration_months: Number(duration) || 12,
            starts_at: new Date().toISOString(),
            expires_at: expiresAt,
            status,
            notes,
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('insert into license_payments')) {
          const literalStatus = norm.includes("'paid'")
            ? 'paid'
            : norm.includes("'due'")
              ? 'due'
              : norm.includes("'cancelled'")
                ? 'cancelled'
                : null;
          const [id, storeId, licenseKey, plan, months, amount, statusOrNote, note] = params;
          licensePayments.push({
            id,
            store_id: storeId,
            license_key: licenseKey,
            plan,
            months: Number(months) || 12,
            amount: Number(amount) || 0,
            status: literalStatus ?? statusOrNote,
            note: literalStatus ? statusOrNote : note,
            created_at: new Date().toISOString(),
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('insert into analytics_events')) {
          const [id, event, storeRef, campaign, createdAt] = params;
          analyticsEvents.push({
            id,
            event,
            store_ref: storeRef,
            campaign,
            created_at: createdAt,
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (norm.includes('insert into products')) {
          const prodObj: any = {
            id: params[0],
            store_id: params[1],
            category_id: params[2],
            name: params[3],
            description: params[4],
            price: params[5],
            image_url: params[6],
            is_available: params[7],
            restock_date: params[8],
            is_featured: params[9],
            sort_order: params[10],
          };
          products.push(prodObj);
          return { success: true };
        }
        if (norm.includes('update products set')) {
          return { success: true };
        }
        if (norm.includes('delete from products where id = ? and store_id = ?')) {
          const [id, storeId] = params;
          const idx = products.findIndex((p) => p.id === id && p.store_id === storeId);
          if (idx >= 0) products.splice(idx, 1);
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
        if (norm.includes('insert into notifications')) {
          const [id, storeId, title, message, type, linkUrl] = params;
          notifications.push({ id, store_id: storeId, title, message, type, link_url: linkUrl, created_at: new Date().toISOString() });
          return { success: true };
        }
        if (norm.includes('insert into notification_reads')) {
          const [id, notifId, storeId] = params;
          notificationReads.push({ id, notification_id: notifId, store_id: storeId, read_at: new Date().toISOString() });
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
    products,
    notifications,
    notificationReads,
    licensePayments,
    analyticsEvents,
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
