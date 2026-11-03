// Projection publique d'une boutique : jamais de pin_code ni de license_key.

export const publicStore = (store: any) => ({
  id: store.id,
  slug: store.slug,
  name: store.name,
  tagline: store.tagline,
  description: store.description,
  whatsapp_number: store.whatsapp_number,
  phone_call: store.phone_call,
  city: store.city,
  quarter: store.quarter,
  address_notes: store.address_notes,
  logo_url: store.logo_url,
  banner_url: store.banner_url,
  theme_primary: store.theme_primary,
  theme_accent: store.theme_accent,
  max_products: store.max_products,
  expires_at: store.expires_at,
  is_active: store.is_active,
  created_at: store.created_at,
  updated_at: store.updated_at,
});
