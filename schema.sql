-- =========================================================================
-- SCHEMA CLOUDFLARE D1 : VITRINE EXPRESS (Karis L3 Informatique)
-- Base de données relationnelle Serverless haute performance & 100% Gratuite
-- =========================================================================

-- 1. Table des Boutiques (Chaque commerçant a sa vitrine dédiée)
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,             -- Ex: 'kamer-kicks', 'glamour-akwa'
    name TEXT NOT NULL,                    -- Nom officiel de la boutique
    tagline TEXT,                          -- Slogan court
    description TEXT,                      -- Bio / présentation
    whatsapp_number TEXT NOT NULL,         -- Numéro format international (Ex: 237699000000)
    phone_call TEXT,                       -- Numéro d'appel direct
    city TEXT DEFAULT 'Douala',            -- Ville (Douala, Yaoundé, Bafoussam...)
    quarter TEXT,                          -- Quartier (Akwa, Bonamoussadi, Mokolo...)
    address_notes TEXT,                    -- Précision (ex: Face Boulangerie Saker)
    logo_url TEXT,                         -- Avatar / Logo
    banner_url TEXT,                       -- Photo de couverture / enseigne
    license_key TEXT UNIQUE NOT NULL,      -- Clé de licence délivrée par Karis
    pin_code TEXT NOT NULL,                -- Code PIN / Mot de passe du boutiquier
    max_products INTEGER DEFAULT 20,       -- Quota souscrit (défaut: 20 produits pour 5000 FCFA/an)
    expires_at TEXT NOT NULL,              -- Date d'expiration ISO (ex: '2027-10-25T00:00:00Z')
    is_active INTEGER DEFAULT 1,           -- 1 = Actif, 0 = Suspendu par Karis
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide par slug public
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_license ON stores(license_key);

-- 2. Table des Catégories par boutique
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,                    -- Ex: 'Sneakers', 'T-shirts', 'Accessoires'
    slug TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);

-- 3. Table des Produits
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,                -- Prix en FCFA (sans décimales)
    image_url TEXT NOT NULL,               -- URL de l'image (Cloudflare R2 ou Base64 optimisé)
    is_available INTEGER DEFAULT 1,        -- 1 = En stock, 0 = Bientôt disponible
    restock_date TEXT,                     -- Si indisponible: date estimée (ex: '2026-11-05')
    is_featured INTEGER DEFAULT 0,         -- Produit vedette en tête de vitrine
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 4. Table des Licences & Facturation Karis (License Manager)
CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    license_key TEXT UNIQUE NOT NULL,
    store_id TEXT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    price_paid INTEGER DEFAULT 5000,       -- 5 000 FCFA
    max_products INTEGER DEFAULT 20,       -- 20 produits
    duration_months INTEGER DEFAULT 12,    -- 12 mois
    starts_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    status TEXT DEFAULT 'active',          -- 'active', 'expired', 'revoked'
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Données de démonstration réalistes pour démarrer immédiatement
INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call, 
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code, 
    max_products, expires_at, is_active
) VALUES (
    'store_demo_1',
    'kamer-kicks',
    'Kamer Kicks Akwa',
    'Sneakers originales & streetwear importé à Douala',
    'La référence sneakers au Cameroun. Modèles exclusifs, qualité certifiée, livraison rapide dans tout le pays.',
    '237699123456',
    '+237 699 12 34 56',
    'Douala',
    'Akwa',
    'Rue Castelnau, à 50m de la Pharmacie des Nations',
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&q=80',
    'LIC-KK2026-99',
    '1234',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO categories (id, store_id, name, slug, sort_order) VALUES
('cat_1', 'store_demo_1', 'Tous les articles', 'all', 0),
('cat_2', 'store_demo_1', 'Air Jordan & Nike', 'nike', 1),
('cat_3', 'store_demo_1', 'Yeezy & Adidas', 'adidas', 2),
('cat_4', 'store_demo_1', 'Running & Sport', 'running', 3);

INSERT OR IGNORE INTO products (
    id, store_id, category_id, name, description, price, image_url, 
    is_available, restock_date, is_featured, sort_order
) VALUES
(
    'prod_1', 'store_demo_1', 'cat_2', 
    'Nike Dunk Low Retro Panda', 
    'Coloris noir & blanc intemporel. Cuir premium, semelle amortissante. Tailles 40 à 45 disponibles.', 
    38000, 
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80', 
    1, NULL, 1, 1
),
(
    'prod_2', 'store_demo_1', 'cat_2', 
    'Air Jordan 1 High OG Chicago', 
    'Légendaire coloris rouge, blanc et noir. Arrivage spécial direct de Dubaï. Réservation ouverte.', 
    65000, 
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80', 
    0, '2026-11-04', 1, 2
),
(
    'prod_3', 'store_demo_1', 'cat_3', 
    'Adidas Yeezy Boost 350 V2 Bone', 
    'Confort Boost exceptionnel, tige Primeknit aérée idéale pour le climat chaud de Douala.', 
    45000, 
    'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=800&q=80', 
    1, NULL, 0, 3
),
(
    'prod_4', 'store_demo_1', 'cat_4', 
    'New Balance 9060 Triple Black', 
    'Semelle chunky futuriste, maintien orthopédique et style urbain agressif.', 
    42000, 
    'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80', 
    0, '2026-11-12', 0, 4
);
