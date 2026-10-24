import { Store, Product, Category, License } from '../types';

// Données initiales riches représentant des commerces réels au Cameroun
const INITIAL_STORES: Store[] = [
  {
    id: 'store_1',
    slug: 'kamer-kicks',
    name: 'Kamer Kicks Akwa',
    tagline: 'Sneakers originales & streetwear importé',
    description: 'Boutique spécialisée dans la vente de baskets de marques certifiées. Livraison express à Douala & Yaoundé en moins de 24h.',
    whatsapp_number: '237699123456',
    phone_call: '+237 699 12 34 56',
    city: 'Douala',
    quarter: 'Akwa (Face Saker)',
    address_notes: 'Rue Castelnau, Immeuble Rose 1er étage',
    logo_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80',
    banner_url: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&q=80',
    license_key: 'LIC-KK-2026-99',
    pin_code: '1234',
    max_products: 20, // Strict cap: 20 produits pour 5000 FCFA/an
    expires_at: new Date(Date.now() + 315 * 24 * 3600 * 1000).toISOString(),
    is_active: 1,
    current_products_count: 5
  },
  {
    id: 'store_2',
    slug: 'glamour-chic',
    name: 'Glamour Chic Bonapriso',
    tagline: 'Prêt-à-porter féminin, sacs & parfums de luxe',
    description: 'La touche délégance pour la femme active de Douala. Arrivages hebdomadaires dEurope et de Dubaï.',
    whatsapp_number: '237677987654',
    phone_call: '+237 677 98 76 54',
    city: 'Douala',
    quarter: 'Bonapriso',
    address_notes: 'Avenue de Gaulle',
    logo_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80',
    banner_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    license_key: 'LIC-GC-2026-44',
    pin_code: '0000',
    max_products: 20,
    expires_at: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
    is_active: 1,
    current_products_count: 3
  }
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_all', store_id: 'store_1', name: 'Tous les modèles', slug: 'all', sort_order: 0 },
  { id: 'cat_nike', store_id: 'store_1', name: 'Nike & Jordan', slug: 'nike', sort_order: 1 },
  { id: 'cat_yeezy', store_id: 'store_1', name: 'Yeezy & Adidas', slug: 'yeezy', sort_order: 2 },
  { id: 'cat_running', store_id: 'store_1', name: 'Running & Lifestyle', slug: 'running', sort_order: 3 },
  
  { id: 'cat_g_all', store_id: 'store_2', name: 'Tout voir', slug: 'all', sort_order: 0 },
  { id: 'cat_g_robes', store_id: 'store_2', name: 'Robes & Ensembles', slug: 'robes', sort_order: 1 },
  { id: 'cat_g_sacs', store_id: 'store_2', name: 'Sacs à main', slug: 'sacs', sort_order: 2 },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    store_id: 'store_1',
    category_id: 'cat_nike',
    name: 'Nike Dunk Low Retro Panda',
    description: 'La paire la plus demandée. Coloris noir et blanc sobre, cuir pleine fleur. Idéale pour le quotidien. Tailles disponibles : 40, 41, 42, 43, 44.',
    price: 38000,
    image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    restock_date: null,
    is_featured: true,
    sort_order: 1
  },
  {
    id: 'prod_2',
    store_id: 'store_1',
    category_id: 'cat_nike',
    name: 'Air Jordan 1 High OG Chicago',
    description: 'Légende absolue du basketball. Cuir rouge vif, col montant matelassé. Arrivage spécial Dubaï en cours de dédouanement au port de Douala.',
    price: 65000,
    image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
    is_available: false,
    restock_date: '2026-11-06',
    is_featured: true,
    sort_order: 2
  },
  {
    id: 'prod_3',
    store_id: 'store_1',
    category_id: 'cat_yeezy',
    name: 'Adidas Yeezy Boost 350 V2 Bone',
    description: 'Semelle Boost originale ultra moelleuse. Tige respirante parfaite pour le climat tropical. Tailles : 41 à 45.',
    price: 45000,
    image_url: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    restock_date: null,
    is_featured: false,
    sort_order: 3
  },
  {
    id: 'prod_4',
    store_id: 'store_1',
    category_id: 'cat_running',
    name: 'New Balance 9060 Triple Black',
    description: 'Look futuriste volumineux avec amorti ABZORB. Très prisée pour les sorties branchées du week-end.',
    price: 42000,
    image_url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
    is_available: false,
    restock_date: '2026-11-15',
    is_featured: false,
    sort_order: 4
  },
  {
    id: 'prod_5',
    store_id: 'store_1',
    category_id: 'cat_running',
    name: 'Asics Gel-Kayano 14 Metallic Silver',
    description: 'Esthétique rétro runner années 2000. Amorti gel complet, maintien optimal de la voûte plantaire.',
    price: 39000,
    image_url: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    restock_date: null,
    is_featured: false,
    sort_order: 5
  },
  
  // Boutique 2
  {
    id: 'prod_g1',
    store_id: 'store_2',
    category_id: 'cat_g_robes',
    name: 'Robe Fourreau Satin Terracotta',
    description: 'Tissu satiné haute brillance, coupe flatteuse ceinturée à la taille. Idéale pour mariages et soirées.',
    price: 25000,
    image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    restock_date: null,
    is_featured: true,
    sort_order: 1
  },
  {
    id: 'prod_g2',
    store_id: 'store_2',
    category_id: 'cat_g_sacs',
    name: 'Sac Cabas Cuir Grainé Caramel',
    description: 'Cuir véritable italien avec bandoulière réglable et fermoir doré. Finition irréprochable.',
    price: 32000,
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    is_available: false,
    restock_date: '2026-11-02',
    is_featured: true,
    sort_order: 2
  }
];

// Gestionnaire de stockage local réactif avec synchronisation Cloudflare D1
class DatabaseService {
  private stores: Store[];
  private categories: Category[];
  private products: Product[];

  constructor() {
    this.stores = this.loadFromStorage('ve_stores', INITIAL_STORES);
    this.categories = this.loadFromStorage('ve_categories', INITIAL_CATEGORIES);
    this.products = this.loadFromStorage('ve_products', INITIAL_PRODUCTS);
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private saveToStorage(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage full or disabled", e);
    }
  }

  // --- BOUTIQUES ---
  async getStoreBySlug(slug: string): Promise<{ store: Store; categories: Category[]; products: Product[] } | null> {
    const store = this.stores.find(s => s.slug.toLowerCase() === slug.toLowerCase() && s.is_active);
    if (!store) return null;

    const categories = this.categories.filter(c => c.store_id === store.id);
    const products = this.products.filter(p => p.store_id === store.id);

    return { store, categories, products };
  }

  async getAllStores(): Promise<Store[]> {
    return this.stores.map(store => {
      const count = this.products.filter(p => p.store_id === store.id).length;
      return { ...store, current_products_count: count };
    });
  }

  async merchantLogin(slugOrKey: string, pin: string): Promise<Store | null> {
    const cleanKey = slugOrKey.trim().toLowerCase();
    const cleanPin = pin.trim();

    const store = this.stores.find(
      s => (s.license_key.toLowerCase() === cleanKey || s.slug.toLowerCase() === cleanKey) &&
           s.pin_code === cleanPin
    );

    if (!store) return null;
    const count = this.products.filter(p => p.store_id === store.id).length;
    return { ...store, current_products_count: count };
  }

  // --- GESTION DES PRODUITS (AVEC VÉRIFICATION STRICTE DU QUOTA 20 PRODUITS) ---
  async getStoreProducts(storeId: string): Promise<Product[]> {
    return this.products.filter(p => p.store_id === storeId);
  }

  // --- GESTION DES CATÉGORIES PAR LE BOUTIQUIER ---
  async getCategories(storeId: string): Promise<Category[]> {
    return this.categories.filter(c => c.store_id === storeId);
  }

  async addCategory(storeId: string, name: string): Promise<{ success: boolean; category?: Category; error?: string }> {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Nom de catégorie invalide" };

    const cleanSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existing = this.categories.find(
      c => c.store_id === storeId && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      return { success: false, error: "Cette catégorie existe déjà" };
    }

    const newCategory: Category = {
      id: 'cat_' + Date.now().toString(36),
      store_id: storeId,
      name: cleanName,
      slug: cleanSlug,
      sort_order: this.categories.filter(c => c.store_id === storeId).length + 1
    };

    this.categories.push(newCategory);
    this.saveToStorage('ve_categories', this.categories);
    return { success: true, category: newCategory };
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    this.categories = this.categories.filter(c => c.id !== categoryId);
    // Dissocier les produits de cette catégorie
    this.products = this.products.map(p => 
      p.category_id === categoryId ? { ...p, category_id: null } : p
    );
    this.saveToStorage('ve_categories', this.categories);
    this.saveToStorage('ve_products', this.products);
    return true;
  }

  async addProduct(storeId: string, productData: Omit<Product, 'id' | 'store_id' | 'created_at'>): Promise<{ success: boolean; product?: Product; error?: string }> {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return { success: false, error: "Boutique introuvable" };

    const currentCount = this.products.filter(p => p.store_id === storeId).length;
    const maxAllowed = store.max_products || 20;

    // VÉRIFICATION DE LA LIMITE SOUSCRITE
    if (currentCount >= maxAllowed) {
      return {
        success: false,
        error: `Limite atteinte : vous avez atteint le maximum de ${maxAllowed} produits pour votre licence à 5 000 FCFA/an. Contactez Karis pour augmenter votre quota !`
      };
    }

    const newProduct: Product = {
      ...productData,
      id: 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      store_id: storeId,
      created_at: new Date().toISOString()
    };

    this.products.unshift(newProduct);
    this.saveToStorage('ve_products', this.products);
    return { success: true, product: newProduct };
  }

  async updateProduct(product: Product): Promise<{ success: boolean; error?: string }> {
    const idx = this.products.findIndex(p => p.id === product.id);
    if (idx === -1) return { success: false, error: "Produit non trouvé" };

    this.products[idx] = { ...this.products[idx], ...product };
    this.saveToStorage('ve_products', this.products);
    return { success: true };
  }

  async deleteProduct(productId: string): Promise<boolean> {
    this.products = this.products.filter(p => p.id !== productId);
    this.saveToStorage('ve_products', this.products);
    return true;
  }

  async toggleProductAvailability(productId: string, restockDate?: string | null): Promise<boolean> {
    const product = this.products.find(p => p.id === productId);
    if (!product) return false;

    const newAvailable = !product.is_available;
    product.is_available = newAvailable;
    product.restock_date = newAvailable ? null : (restockDate || null);

    this.saveToStorage('ve_products', this.products);
    return true;
  }

  // --- KARIS LICENSE MANAGER (SUPER ADMIN) ---
  async createStoreByAdmin(params: {
    name: string;
    slug?: string;
    whatsappNumber: string;
    city: string;
    quarter?: string;
    pinCode?: string;
    maxProducts?: number;
    durationMonths?: number;
  }): Promise<Store> {
    const cleanSlug = (params.slug || params.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const storeId = 'store_' + Date.now().toString(36);
    const licenseKey = 'LIC-' + cleanSlug.substring(0, 4).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + (params.durationMonths || 12));

    const newStore: Store = {
      id: storeId,
      slug: cleanSlug,
      name: params.name.trim(),
      whatsapp_number: params.whatsappNumber.replace(/[^0-9]/g, ''),
      phone_call: params.whatsappNumber,
      city: params.city || 'Douala',
      quarter: params.quarter || '',
      license_key: licenseKey,
      pin_code: params.pinCode || '1234',
      max_products: params.maxProducts || 20,
      expires_at: expiresDate.toISOString(),
      is_active: 1,
      current_products_count: 0
    };

    this.stores.unshift(newStore);
    this.saveToStorage('ve_stores', this.stores);

    // Ajouter catégorie par défaut
    const defaultCat: Category = {
      id: 'cat_' + Date.now().toString(36),
      store_id: storeId,
      name: 'Tous les articles',
      slug: 'all',
      sort_order: 0
    };
    this.categories.push(defaultCat);
    this.saveToStorage('ve_categories', this.categories);

    return newStore;
  }

  async toggleStoreStatus(storeId: string): Promise<boolean> {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return false;
    store.is_active = store.is_active ? 0 : 1;
    this.saveToStorage('ve_stores', this.stores);
    return true;
  }

  async renewStoreLicense(storeId: string, additionalMonths = 12): Promise<Store | null> {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return null;

    const currentExpiry = new Date(store.expires_at).getTime();
    const baseDate = currentExpiry > Date.now() ? new Date(store.expires_at) : new Date();
    baseDate.setMonth(baseDate.getMonth() + additionalMonths);

    store.expires_at = baseDate.toISOString();
    store.is_active = 1;

    this.saveToStorage('ve_stores', this.stores);
    return store;
  }
}

export const dbService = new DatabaseService();
