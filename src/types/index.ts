export interface Store {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  whatsapp_number: string;
  phone_call?: string;
  city: string;
  quarter?: string;
  address_notes?: string;
  logo_url?: string;
  banner_url?: string;
  license_key: string;
  pin_code?: string;
  max_products: number; // Défaut: 20
  expires_at: string;
  is_active: number | boolean;
  created_at?: string;
  current_products_count?: number;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface Product {
  id: string;
  store_id: string;
  category_id?: string | null;
  name: string;
  description?: string;
  price: number; // En FCFA
  image_url: string;
  is_available: boolean | number;
  restock_date?: string | null; // Format YYYY-MM-DD
  is_featured?: boolean | number;
  sort_order?: number;
  created_at?: string;
}

export interface License {
  id: string;
  license_key: string;
  store_id?: string;
  client_name: string;
  client_phone: string;
  price_paid: number;
  max_products: number;
  duration_months: number;
  expires_at: string;
  status: 'active' | 'expired' | 'revoked';
  created_at?: string;
}

export type ViewMode = 'storefront' | 'merchant' | 'admin' | 'print-poster';
