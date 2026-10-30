import { Store, Product, Category } from '../types';

// ============================================================
//  dbService — API Cloudflare Pages + D1
//  Aucune donnée métier n'est stockée dans le navigateur.
// ============================================================

const API_BASE = '/api';

export interface MerchantSession {
  storeId: string;
  storeSlug: string;
  licenseKey: string;
  pinCode: string;
}

export interface ApiResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface CreatedStoreAccess {
  store: Store;
  licenseKey: string;
  pinCode: string;
  expiresAt: string;
}

export interface StoreSettingsPayload {
  name: string;
  tagline: string;
  description: string;
  whatsappNumber: string;
  phoneCall: string;
  city: string;
  quarter: string;
  addressNotes: string;
  logoUrl: string;
  bannerUrl: string;
  themePrimary: string;
  themeAccent: string;
}

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage peut être indisponible (navigation privée restrictive).
  }
}

function removeStorage(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

async function parseJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Réponse serveur invalide" };
  }
}

function loadMerchantSession(): MerchantSession | null {
  try {
    const raw = readStorage('ve_merchant_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.storeId || !parsed?.storeSlug || !parsed?.licenseKey || !parsed?.pinCode) {
      removeStorage('ve_merchant_session');
      return null;
    }
    return {
      storeId: String(parsed.storeId),
      storeSlug: String(parsed.storeSlug),
      licenseKey: String(parsed.licenseKey),
      pinCode: String(parsed.pinCode),
    };
  } catch {
    return null;
  }
}

class DatabaseService {
  private adminKey: string | null = readStorage('ve_admin_key');
  private merchantSession: MerchantSession | null = loadMerchantSession();

  // ----------------------------------------------------------
  //  SESSIONS
  // ----------------------------------------------------------

  setAdminKey(key: string) {
    this.adminKey = key;
    writeStorage('ve_admin_key', key);
  }

  getAdminKey(): string | null {
    return this.adminKey;
  }

  clearAdminKey() {
    this.adminKey = null;
    removeStorage('ve_admin_key');
  }

  setMerchantSession(storeId: string, storeSlug: string, licenseKey: string, pinCode: string) {
    this.merchantSession = { storeId, storeSlug, licenseKey, pinCode };
    writeStorage('ve_merchant_session', JSON.stringify(this.merchantSession));
  }

  getMerchantSession(): MerchantSession | null {
    return this.merchantSession;
  }

  clearMerchantSession() {
    this.merchantSession = null;
    removeStorage('ve_merchant_session');
  }

  // ----------------------------------------------------------
  //  VITRINE PUBLIQUE
  // ----------------------------------------------------------

  async getAllStores(): Promise<{ stores: Store[]; isOffline?: boolean }> {
    const cacheKey = 've_cache_all_stores';
    try {
      const res = await fetch(`${API_BASE}/stores`);
      const data = await parseJson(res);
      if (res.ok) {
        const stores = Array.isArray(data) ? data : (data.stores ?? []);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ stores, cachedAt: Date.now() }));
        } catch {}
        return { stores };
      }
    } catch {
      // Échec réseau : fallback sur le cache local
    }

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.stores)) {
          return { stores: parsed.stores, isOffline: true };
        }
      }
    } catch {}

    return { stores: [] };
  }

  async getStoreBySlug(slug: string): Promise<{ store: Store; categories: Category[]; products: Product[]; isOffline?: boolean } | null> {
    const cacheKey = `ve_cache_store_${slug.toLowerCase()}`;
    try {
      const res = await fetch(`${API_BASE}/stores/${encodeURIComponent(slug)}`);
      const data = await parseJson(res);
      if (res.ok && !data.error && data.store) {
        const payload = {
          store: data.store,
          categories: data.categories ?? [],
          products: data.products ?? [],
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ...payload, cachedAt: Date.now() }));
        } catch {}
        return payload;
      }
    } catch {
      // Échec réseau : on tente le fallback depuis le cache local persistant
    }

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.store) {
          return {
            store: parsed.store,
            categories: parsed.categories ?? [],
            products: parsed.products ?? [],
            isOffline: true,
          };
        }
      }
    } catch {}

    return null;
  }

  // ----------------------------------------------------------
  //  AUTHENTIFICATION BOUTIQUIER
  // ----------------------------------------------------------

  async loginMerchant(licenseKey: string, pinCode: string): Promise<{ success: boolean; store?: Store; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/merchant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, pinCode }),
      });
      const data = await parseJson(res);
      if (!res.ok || !data.success || !data.store) {
        return { success: false, error: data.error ?? 'Identifiants invalides' };
      }

      this.setMerchantSession(
        data.store.id,
        data.store.slug,
        licenseKey.trim(),
        pinCode.trim(),
      );

      return { success: true, store: data.store };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  // ----------------------------------------------------------
  //  BOUTIQUE (boutiquier authentifié)
  // ----------------------------------------------------------

  async updateStoreSettings(
    storeId: string,
    settings: StoreSettingsPayload
  ): Promise<{ success: boolean; store?: Store; error?: string }> {
    const session = this.getMerchantSession();
    if (!session) return { success: false, error: 'Session expirée, reconnectez-vous' };

    try {
      const res = await fetch(`${API_BASE}/merchant/store`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          licenseKey: session.licenseKey,
          pinCode: session.pinCode,
          settings,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error ?? 'Erreur lors de la mise à jour de la boutique' };
      }
      return { success: true, store: data.store };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  // ----------------------------------------------------------
  //  PRODUITS (boutiquier authentifié)
  // ----------------------------------------------------------

  async addProduct(
    storeId: string,
    productData: Omit<Product, 'id' | 'store_id' | 'created_at'>
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    const session = this.getMerchantSession();
    if (!session) return { success: false, error: 'Session expirée, reconnectez-vous' };

    try {
      const res = await fetch(`${API_BASE}/merchant/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          licenseKey: session.licenseKey,
          pinCode: session.pinCode,
          product: {
            name: productData.name,
            description: productData.description,
            price: productData.price,
            imageUrl: productData.image_url,
            categoryId: productData.category_id,
            isAvailable: productData.is_available,
            restockDate: productData.restock_date,
            isFeatured: productData.is_featured,
            sortOrder: productData.sort_order,
          },
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) return { success: false, error: data.error ?? "Erreur lors de l'ajout" };
      return { success: true, product: data.product };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  async updateProduct(product: Product): Promise<{ success: boolean; error?: string }> {
    const session = this.getMerchantSession();
    if (!session) return { success: false, error: 'Session expirée' };

    try {
      const res = await fetch(`${API_BASE}/merchant/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: session.storeId,
          licenseKey: session.licenseKey,
          pinCode: session.pinCode,
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.image_url,
            categoryId: product.category_id,
            isAvailable: product.is_available,
            restockDate: product.restock_date,
            isFeatured: product.is_featured,
            sortOrder: product.sort_order,
          },
        }),
      });
      const data = await parseJson(res);
      return res.ok
        ? { success: true }
        : { success: false, error: data.error ?? 'Erreur lors de la mise à jour' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  async setProductAvailability(
    productId: string,
    isAvailable: boolean,
    restockDate?: string | null,
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    const session = this.getMerchantSession();
    if (!session) return { success: false, error: 'Session expirée' };

    try {
      const res = await fetch(`${API_BASE}/merchant/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: session.storeId,
          licenseKey: session.licenseKey,
          pinCode: session.pinCode,
          product: {
            id: productId,
            toggleAvailability: true,
            isAvailable,
            restockDate: isAvailable ? null : (restockDate ?? null),
          },
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) return { success: false, error: data.error ?? 'Erreur de mise à jour du stock' };
      return { success: true, product: data.product };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  async deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.getMerchantSession();
    if (!session) return { success: false, error: 'Session expirée' };

    try {
      const res = await fetch(`${API_BASE}/merchant/products`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: session.storeId,
          licenseKey: session.licenseKey,
          pinCode: session.pinCode,
          productId,
        }),
      });
      const data = await parseJson(res);
      return res.ok
        ? { success: true }
        : { success: false, error: data.error ?? 'Erreur lors de la suppression' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  // ----------------------------------------------------------
  //  CATÉGORIES (boutiquier authentifié)
  // ----------------------------------------------------------

  async addCategory(storeId: string, name: string): Promise<{ success: boolean; category?: Category; error?: string }> {
    const session = this.getMerchantSession();
    if (!session) return { success: false, error: 'Session expirée' };

    try {
      const res = await fetch(`${API_BASE}/merchant/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          licenseKey: session.licenseKey,
          pinCode: session.pinCode,
          name,
        }),
      });
      const data = await parseJson(res);
      if (!res.ok) return { success: false, error: data.error ?? "Erreur d'ajout" };
      return { success: true, category: data.category };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  async deleteCategory(storeId: string, categoryId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.getMerchantSession();
    if (!session) return { success: false, error: 'Session expirée' };

    try {
      const res = await fetch(`${API_BASE}/merchant/categories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: storeId || session.storeId,
          licenseKey: session.licenseKey,
          pinCode: session.pinCode,
          categoryId,
        }),
      });
      const data = await parseJson(res);
      return res.ok
        ? { success: true }
        : { success: false, error: data.error ?? 'Erreur lors de la suppression' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  // ----------------------------------------------------------
  //  ADMIN KARIS
  // ----------------------------------------------------------

  async loginAdmin(key: string): Promise<{ success: boolean; stores?: Store[]; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/admin/licenses`, {
        headers: { 'X-Admin-Key': key },
      });
      const data = await parseJson(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error ?? 'Clé administrateur invalide' };
      }
      this.setAdminKey(key);
      return { success: true, stores: data.stores ?? [] };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  async getAdminStores(): Promise<{ success: boolean; stores: Store[]; error?: string }> {
    const key = this.getAdminKey();
    if (!key) return { success: false, stores: [], error: 'Clé administrateur absente' };

    try {
      const res = await fetch(`${API_BASE}/admin/licenses`, {
        headers: { 'X-Admin-Key': key },
      });
      const data = await parseJson(res);
      if (res.status === 401) {
        this.clearAdminKey();
        return { success: false, stores: [], error: data.error ?? 'Session administrateur expirée' };
      }
      if (!res.ok) {
        return { success: false, stores: [], error: data.error ?? 'Erreur de chargement' };
      }
      return { success: true, stores: data.stores ?? [] };
    } catch {
      return { success: false, stores: [], error: 'Erreur réseau' };
    }
  }

  async getAllStoresAdmin(): Promise<Store[]> {
    const result = await this.getAdminStores();
    return result.stores;
  }

  async createStoreByAdmin(params: {
    name: string;
    slug?: string;
    whatsappNumber: string;
    phoneCall?: string;
    city: string;
    quarter?: string;
    pinCode?: string;
    maxProducts?: number;
    durationMonths?: number;
  }): Promise<CreatedStoreAccess> {
    const key = this.getAdminKey();
    if (!key) throw new Error('Clé administrateur absente. Reconnectez-vous.');

    const res = await fetch(`${API_BASE}/admin/licenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': key,
      },
      body: JSON.stringify({
        storeName: params.name,
        slug: params.slug,
        whatsappNumber: params.whatsappNumber,
        phoneCall: params.phoneCall,
        city: params.city,
        quarter: params.quarter,
        pinCode: params.pinCode ?? '',
        maxProducts: params.maxProducts ?? 20,
        durationMonths: params.durationMonths ?? 12,
      }),
    });

    const data = await parseJson(res);
    if (!res.ok || !data.success || !data.store) {
      if (res.status === 401) {
        this.clearAdminKey();
      }
      throw new Error(data.error ?? 'Erreur création boutique');
    }

    return {
      store: data.store,
      licenseKey: data.licenseKey,
      pinCode: data.pinCode,
      expiresAt: data.expiresAt,
    };
  }

  async toggleStoreStatus(storeId: string): Promise<{ success: boolean; store?: Store; error?: string }> {
    const key = this.getAdminKey();
    if (!key) return { success: false, error: 'Clé administrateur absente' };

    try {
      const res = await fetch(`${API_BASE}/admin/licenses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': key,
        },
        body: JSON.stringify({ storeId, action: 'toggleStatus' }),
      });
      const data = await parseJson(res);
      return res.ok
        ? { success: true, store: data.store }
        : { success: false, error: data.error ?? 'Erreur de mise à jour' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  async resetStorePin(storeId: string): Promise<{ success: boolean; store?: Store; pinCode?: string; error?: string }> {
    const key = this.getAdminKey();
    if (!key) return { success: false, error: 'Clé administrateur absente' };

    try {
      const res = await fetch(`${API_BASE}/admin/licenses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': key,
        },
        body: JSON.stringify({ storeId, action: 'resetPin' }),
      });
      const data = await parseJson(res);
      if (res.status === 401) {
        this.clearAdminKey();
      }
      if (!res.ok || !data.success || !data.store || !data.pinCode) {
        return { success: false, error: data.error ?? 'Erreur de réinitialisation du PIN' };
      }
      return { success: true, store: data.store, pinCode: data.pinCode };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }

  async renewStoreLicense(storeId: string, additionalMonths = 12): Promise<{ success: boolean; store?: Store; error?: string }> {
    const key = this.getAdminKey();
    if (!key) return { success: false, error: 'Clé administrateur absente' };

    try {
      const res = await fetch(`${API_BASE}/admin/licenses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': key,
        },
        body: JSON.stringify({ storeId, action: 'renew', additionalMonths }),
      });
      const data = await parseJson(res);
      return res.ok
        ? { success: true, store: data.store }
        : { success: false, error: data.error ?? 'Erreur de renouvellement' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }
}

export const dbService = new DatabaseService();
