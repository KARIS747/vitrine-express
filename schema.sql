-- =========================================================================
-- SCHEMA CLOUDFLARE D1 : VITRINE EXPRESS (Gestionnaire de licences)
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
    contact_preference TEXT DEFAULT 'whatsapp', -- Canal favori : 'whatsapp' ou 'email'
    contact_email TEXT,                    -- Adresse email si préférence email
    country TEXT DEFAULT 'Cameroun',       -- Pays (Cameroun, Côte d'Ivoire, Sénégal...)
    city TEXT DEFAULT 'Douala',            -- Ville (Douala, Yaoundé, Bafoussam...)
    quarter TEXT,                          -- Quartier (Akwa, Bonamoussadi, Mokolo...)
    address_notes TEXT,                    -- Précision (ex: Face Boulangerie Saker)
    logo_url TEXT,                         -- Avatar / Logo
    banner_url TEXT,                       -- Photo de couverture / enseigne
    theme_primary TEXT DEFAULT '#059669',  -- Couleur principale de la vitrine
    theme_accent TEXT DEFAULT '#F59E0B',   -- Couleur d'accent de la vitrine
    license_key TEXT UNIQUE NOT NULL,      -- Clé de licence délivrée par l'équipe VitrineExpress
    pin_code TEXT NOT NULL,                -- PIN haché (hmac-sha256$sel$hash) ou ancien PIN en clair
    max_products INTEGER DEFAULT 20,       -- Quota souscrit (défaut: 20 produits pour 5000 FCFA/an)
    expires_at TEXT NOT NULL,              -- Date d'expiration ISO (ex: '2027-10-25T00:00:00Z')
    is_active INTEGER DEFAULT 1,           -- 1 = Actif, 0 = Suspendu par l'équipe VitrineExpress
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

-- 4. Table des Licences & Facturation (License Manager)
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

-- 4b. Historique des paiements et des montants dus par licence
CREATE TABLE IF NOT EXISTS license_payments (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    license_key TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'decouverte',
    months INTEGER NOT NULL DEFAULT 12,
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'paid',   -- 'paid' | 'due' | 'cancelled'
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_license_payments_store ON license_payments(store_id);
CREATE INDEX IF NOT EXISTS idx_license_payments_status ON license_payments(store_id, status);

CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    event TEXT NOT NULL,
    store_ref TEXT,
    campaign TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- 5. Limitation des tentatives de connexion (admin et boutiquiers)
CREATE TABLE IF NOT EXISTS auth_attempts (
    limiter_key TEXT PRIMARY KEY,          -- Hash de l'IP, de la licence ou de la boutique
    failures INTEGER DEFAULT 0,            -- Échecs dans la fenêtre courante
    window_started_at TEXT NOT NULL,       -- Début de la fenêtre
    blocked_until TEXT,                    -- Fin du blocage temporaire
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_updated ON auth_attempts(updated_at);

-- 6. Sessions serveur (cookies HttpOnly) : marchand et administrateur
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,           -- SHA-256 du jeton (jamais le jeton en clair)
    scope TEXT NOT NULL,                   -- 'merchant' | 'admin'
    store_id TEXT,                         -- NULL pour une session admin
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT,
    user_agent TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_store ON sessions(store_id);

-- 7. Données de démonstration réalistes pour démarrer immédiatement
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
    '237681610040',
    '+237 681 61 00 40',
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

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_2',
    'glow-douala',
    'Glow Douala',
    'Cosmétiques & soins pour une peau éclatante',
    'Boutique de cosmétiques à Douala. Produits de beauté authentiques, soins visage et corps, maquillage et conseils personnalisés.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Bonamoussadi',
    'Carrefour Bonamoussadi, près du supermarché',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=80',
    'LIC-GLOW-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_3',
    'phone-center-akwa',
    'Phone Center Akwa',
    'Téléphones & accessoires au meilleur prix',
    'Spécialiste des téléphones et accessoires à Akwa. Smartphones neufs et reconditionnés, écouteurs, coques et accessoires pour tous les budgets.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Akwa',
    'Rue des Galeries, face à la station Total Akwa',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    'LIC-PHONE-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_4',
    'atelier-kora',
    'Atelier Kora',
    'Pagnes & tenues traditionnelles sur mesure',
    'Atelier de confection à Yaoundé. Pagnes wax, tenues traditionnelles brodées et pièces sur mesure réalisées par des artisans locaux.',
    '237681610040',
    '+237 681 61 00 40',
    'Yaoundé',
    'Mokolo',
    'Marché Mokolo, allée des tissus',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1200&q=80',
    'LIC-KORA-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_5',
    'parfums-babylone',
    'Parfums de Babylone',
    'Parfumerie fine et fragrances rares',
    'Parfumerie à Douala. Eaux de parfum, brumes et coffrets découverte pour homme et femme, sélectionnés avec soin.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Bonanjo',
    'Boulevard de la Liberté, Bonanjo',
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=80',
    'LIC-BABYLONE-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_6',
    'perles-yaounde',
    'Perles de Yaoundé',
    'Bijoux et accessoires faits main',
    'Bijouterie artisanale à Yaoundé. Colliers, bracelets, boucles et pendentifs en perles naturelles et laiton.',
    '237681610040',
    '+237 681 61 00 40',
    'Yaoundé',
    'Mvog-Ada',
    'Mvog-Ada, carrefour Nsam',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80',
    'LIC-PERLES-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_7',
    'marche-express',
    'Marché Express',
    'Épicerie et produits frais au quotidien',
    'Épicerie de quartier à Douala. Denrées alimentaires, légumes frais et paniers familiaux livrés rapidement.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Deido',
    'Marché de Deido, entrée principale',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    'LIC-MARCHE-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_8',
    'dressing-yaounde',
    'Le Dressing de Yaoundé',
    'Prêt-à-porter féminin et masculin',
    'Dressing branché à Yaoundé. Robes, chemises, pantalons et blazers pour un style urbain et élégant.',
    '237681610040',
    '+237 681 61 00 40',
    'Yaoundé',
    'Bastos',
    'Bastos, rue 1819',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
    'LIC-DRESSING-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_9',
    'sucre-douala',
    'Sucré Douala',
    'Pâtisserie artisanale et gâteaux sur commande',
    'Pâtisserie à Douala. Gâteaux personnalisés, tartes aux fruits et plateaux desserts pour toutes vos célébrations.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Makepe',
    'Makepe, près du carrefour Total',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    'LIC-SUCRE-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_10',
    'bebe-confort',
    'Bébé Confort',
    'Puériculture et articles pour bébé',
    'Boutique de puériculture à Yaoundé. Poussettes, lits, bodies et couches pour le confort de votre bébé.',
    '237681610040',
    '+237 681 61 00 40',
    'Yaoundé',
    'Mvog-Betsi',
    'Mvog-Betsi, face à l école maternelle',
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
    'LIC-BEBE-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_11',
    'maison-kamer',
    'Maison Kamer',
    'Décoration et meubles pour votre intérieur',
    'Maison Kamer à Douala. Meubles, luminaires et objets de décoration pour un intérieur chaleureux et moderne.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Bépanda',
    'Bépanda, rue des Artisans',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    'LIC-MAISON-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_12',
    'electro-express',
    'Électro Express',
    'Petit électroménager et gadgets pratiques',
    'Électro Express à Douala. Mixeurs, fers à repasser, casques audio et accessoires pour simplifier votre quotidien.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Akwa',
    'Akwa, rue Castelnau',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',
    'LIC-ELECTRO-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_13',
    'sport-zone',
    'Sport Zone',
    'Équipements sportifs et fitness',
    'Sport Zone à Yaoundé. Haltères, tapis, tenues de sport et gourdes pour vos séances d entraînement.',
    '237681610040',
    '+237 681 61 00 40',
    'Yaoundé',
    'Omnisport',
    'Omnisport, près du stade Ahmadou Ahidjo',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
    'LIC-SPORT-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_14',
    'bureau-plus',
    'Bureau Plus',
    'Papeterie et fournitures de bureau',
    'Bureau Plus à Yaoundé. Cahiers, stylos, classeurs et agendas pour votre bureau ou votre école.',
    '237681610040',
    '+237 681 61 00 40',
    'Yaoundé',
    'Centre',
    'Centre-ville, avenue de l Indépendance',
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
    'LIC-BUREAU-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO stores (
    id, slug, name, tagline, description, whatsapp_number, phone_call,
    city, quarter, address_notes, logo_url, banner_url, license_key, pin_code,
    max_products, expires_at, is_active
) VALUES (
    'store_demo_15',
    'cuir-style',
    'Cuir & Style',
    'Chaussures en cuir et accessoires',
    'Cuir & Style à Douala. Chaussures en cuir véritable, bottines, sandales et ceintures artisanales.',
    '237681610040',
    '+237 681 61 00 40',
    'Douala',
    'Bonamoussadi',
    'Bonamoussadi, carrefour Total',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80',
    'LIC-CUIR-2026',
    '987654',
    20,
    '2027-10-25T00:00:00Z',
    1
);

INSERT OR IGNORE INTO categories (id, store_id, name, slug, sort_order) VALUES
('cat_d2', 'store_demo_2', 'Tous les articles', 'all', 0),
('cat_d3', 'store_demo_3', 'Tous les articles', 'all', 0),
('cat_d4', 'store_demo_4', 'Tous les articles', 'all', 0),
('cat_d5', 'store_demo_5', 'Tous les articles', 'all', 0),
('cat_d6', 'store_demo_6', 'Tous les articles', 'all', 0),
('cat_d7', 'store_demo_7', 'Tous les articles', 'all', 0),
('cat_d8', 'store_demo_8', 'Tous les articles', 'all', 0),
('cat_d9', 'store_demo_9', 'Tous les articles', 'all', 0),
('cat_d10', 'store_demo_10', 'Tous les articles', 'all', 0),
('cat_d11', 'store_demo_11', 'Tous les articles', 'all', 0),
('cat_d12', 'store_demo_12', 'Tous les articles', 'all', 0),
('cat_d13', 'store_demo_13', 'Tous les articles', 'all', 0),
('cat_d14', 'store_demo_14', 'Tous les articles', 'all', 0),
('cat_d15', 'store_demo_15', 'Tous les articles', 'all', 0);

INSERT OR IGNORE INTO products (
    id, store_id, category_id, name, description, price, image_url,
    is_available, restock_date, is_featured, sort_order
) VALUES
(
    'prod_d4_1', 'store_demo_4', 'cat_d4',
    'Pagne Wax Premium 6 Yards',
    'Pagne véritable wax hollandais 100% coton peigné, motifs et couleurs inaltérables.',
    18000,
    'https://upload.wikimedia.org/wikipedia/commons/9/97/Wax_Print_-_Ghana_Cloth.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 1, 1
),
(
    'prod_d4_2', 'store_demo_4', 'cat_d4',
    'Ensemble Traditionnel Brodé',
    'Tenue traditionnelle confectionnée sur commande avec broderies dorées artisanales.',
    35000,
    'https://upload.wikimedia.org/wikipedia/commons/d/d6/Ghanaian_Woman_in_Her_Fancy_African_Prints_Dress.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 1, 2
),
(
    'prod_d4_3', 'store_demo_4', 'cat_d4',
    'Chemise Africaine Wax Manches Courtes',
    'Chemise moderne en pagne wax coloré coupe slim fit soignée pour cérémonies ou bureau.',
    16000,
    'https://upload.wikimedia.org/wikipedia/commons/f/fa/African-Waxprint-in-Western-Style-Shirts-1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 3
),
(
    'prod_d4_4', 'store_demo_4', 'cat_d4',
    'Chemise Wax Motifs Graphiques',
    'Coupe cintrée en tissu wax authentique, finitions col mao et boutons assortis.',
    16000,
    'https://upload.wikimedia.org/wikipedia/commons/c/cb/African-Waxprint-in-Western-Style-Shirts-2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 4
),
(
    'prod_3faba630-8', 'store_demo_4', 'cat_d4',
    'Tissu Wax Cérémonie Motif Ahwenepa',
    'Pièce de tissu noble pour grandes réceptions et cérémonies familiales.',
    22000,
    'https://upload.wikimedia.org/wikipedia/commons/5/58/Ahwenepa_nkasa_funeral_cloth.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 5
),
(
    'prod_b1b290e2-b', 'store_demo_4', 'cat_d4',
    'Pagne Wax Commémoratif Prestige',
    'Édition spéciale en coton lourd ciré haute durabilité.',
    25000,
    'https://upload.wikimedia.org/wikipedia/commons/f/fe/Mills%2C_Obama%2C_GHANA-USA_wax_print_GTP_cloth.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 6
),
(
    'prod_93dda8a0-8', 'store_demo_4', 'cat_d4',
    'Robe d Été Wax Imprimée',
    'Robe légère fluide aux motifs africains éclatants, parfaite pour les journées ensoleillées.',
    24000,
    'https://upload.wikimedia.org/wikipedia/commons/f/f1/Summer_dress_%285634765615%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 7
),
(
    'prod_25e80e15-1', 'store_demo_4', 'cat_d4',
    'Boubou Traditionnel Ample',
    'Grand boubou majestueux confectionné à la main, confort thermique et élégance africaine.',
    38000,
    'https://upload.wikimedia.org/wikipedia/commons/0/08/Dress_%28Klashorst%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 8
),
(
    'prod_d14_1', 'store_demo_14', 'cat_d14',
    'Pack 10 Cahiers Scolaires A4 96 Pages',
    'Cahiers grands carreaux Seyès papier blanc 80g couverture polypropylène indéchirable.',
    6000,
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d14_2', 'store_demo_14', 'cat_d14',
    'Boîte de 12 Stylos Bille Bleus Écriture Fine',
    'Glisse parfaite, encre séchage instantané sans bavures pour examens et bureau.',
    3500,
    'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 2
),
(
    'prod_d14_3', 'store_demo_14', 'cat_d14',
    'Classeur à Levier Dos 80mm A4',
    'Classeur carton rigide pelliculé avec œillet de préhension et étiquette interchangeable.',
    4500,
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d14_4', 'store_demo_14', 'cat_d14',
    'Carnet de Notes Professionnel & Stylo',
    'Couverture rigide avec marque-page ruban et passant élastique pour stylo.',
    5500,
    'https://upload.wikimedia.org/wikipedia/commons/e/ee/Notebook_in_the_Form_of_a_Tablet_with_pen_and_tortoise_shell_handle.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 4
),
(
    'prod_36a0b8d6-2', 'store_demo_14', 'cat_d14',
    'Kit Fournitures de Bureau & Rangement Bureau',
    'Pot à crayons, ciseaux de précision, agrafeuse et surligneurs assortis.',
    12000,
    'https://upload.wikimedia.org/wikipedia/commons/8/8a/USVI_IMG_5202_-_Minimalist_desk_with_colorful_pencils_in_a_cardboard_holder_a_cup_holding_pens_and_scissors_and_a_notebook_with_botanical_patterns_all_under_soft_light.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 5
),
(
    'prod_729a08e5-0', 'store_demo_14', 'cat_d14',
    'Agenda Annuel Reliure Cuir Prestige',
    'Grille semaine complète avec répertoire téléphonique et cartes géographiques.',
    8000,
    'https://upload.wikimedia.org/wikipedia/commons/4/4e/William_Shakespeare_Hall%27s_1861_journal_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 6
),
(
    'prod_c05c6951-0', 'store_demo_14', 'cat_d14',
    'Ramette Papier Impression A4 500 Feuilles 80g',
    'Papier blanc éclatant multi-usages certifié pour imprimantes laser et jet d encre.',
    4500,
    'https://upload.wikimedia.org/wikipedia/commons/3/3e/Office_Supplies_for_Everyday_Business_and_Workplace_Needs.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 7
),
(
    'prod_f96bc0b0-7', 'store_demo_14', 'cat_d14',
    'Calculatrice Scientifique Multi-Fonctions',
    'Écran 2 lignes 240 fonctions intégrées, idéale pour collégiens, lycéens et étudiants.',
    9000,
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 8
),
(
    'prod_d10_1', 'store_demo_10', 'cat_d10',
    'Poussette Canne Pliable Tout-Terrain',
    'Poussette légère et compacte, suspensions renforcées et canopy anti-UV.',
    85000,
    'https://upload.wikimedia.org/wikipedia/commons/d/d1/Baby_pram_stroller_parking_foyer_Silkeborg_Library_Denmark_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 1, 1
),
(
    'prod_d10_2', 'store_demo_10', 'cat_d10',
    'Poussette Urbaine Maniable',
    'Pliage d une main, panier de rangement XXL et assise inclinable multi-positions.',
    72000,
    'https://upload.wikimedia.org/wikipedia/commons/9/99/Baby_pram_stroller_parking_foyer_Silkeborg_Library_Denmark_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 1, 2
),
(
    'prod_d10_3', 'store_demo_10', 'cat_d10',
    'Lot de 5 Bodies Coton Bio Bébé',
    'Coton 100% hypoallergénique ultra doux, fermeture à boutons pression pratiques.',
    9500,
    'https://upload.wikimedia.org/wikipedia/commons/c/cf/African_American_woman_in_wedding_dress_%285416291308%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 3
),
(
    'prod_d10_4', 'store_demo_10', 'cat_d10',
    'Lit Berceau Bébé Sécurisé',
    'Berceau aéré en bois avec parois respirantes et matelas déhoussable inclus.',
    95000,
    'https://upload.wikimedia.org/wikipedia/commons/f/f1/Baby_bed_2010.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 4
),
(
    'prod_9bd96aad-7', 'store_demo_10', 'cat_d10',
    'Lit Bébé Évolutif Chambre Complète',
    'Lit à barreaux transformable en lit banquette, hauteur réglable 3 niveaux.',
    130000,
    'https://upload.wikimedia.org/wikipedia/commons/7/76/The_Nursery_Progresses..._-_Flickr_-_Kelly_Sue.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 5
),
(
    'prod_c616c5bc-a', 'store_demo_10', 'cat_d10',
    'Hochet & Jouet d Éveil Bois Naturel',
    'Jouet sensoriel sans peinture toxique, doux pour les gencives de bébé.',
    4500,
    'https://upload.wikimedia.org/wikipedia/commons/1/16/Wooden_Baby_Rattle_Marked%2C_%22St._Louis_Fair_1904%22_-_DPLA_-_27777402cbf4dc7938c35f146d5785d4_%28page_1%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 6
),
(
    'prod_a4a7792b-d', 'store_demo_10', 'cat_d10',
    'Gobelet & Biberon d Apprentissage Anti-Fuite',
    'Tasse ergonomique d apprentissage en silicone souple avec poignées.',
    6500,
    'https://cdn.dummyjson.com/product-images/kitchen-accessories/black-aluminium-cup/thumbnail.webp',
    1, NULL, 0, 7
),
(
    'prod_68f28e12-e', 'store_demo_10', 'cat_d10',
    'Boîte de Rangement Chambre d Enfant Swing',
    'Organisateur décoratif pour jouets, couches et accessoires de puériculture.',
    18000,
    'https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp',
    1, NULL, 0, 8
),
(
    'prod_d15_1', 'store_demo_15', 'cat_d15',
    'Chaussures Richelieu Oxford Cuir Noir',
    'Cuir de veau véritable pleine fleur, semelle cousue Goodyear et finitions d excellence.',
    52000,
    'https://upload.wikimedia.org/wikipedia/commons/9/9b/Crockett_%26_Jones_men%27s_dress_shoes%2C_type_Dalton%2C_black_calf_leather_01.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 1, 1
),
(
    'prod_d15_2', 'store_demo_15', 'cat_d15',
    'Mocassins Cuir Marron Patiné Fait Main',
    'Mocassins de ville souples et légers avec surpiqûres sellier traditionnelles.',
    45000,
    'https://upload.wikimedia.org/wikipedia/commons/2/2f/Crockett_%26_Jones_men%27s_dress_shoes%2C_type_Dalton%2C_black_calf_leather_03.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 1, 2
),
(
    'prod_d15_3', 'store_demo_15', 'cat_d15',
    'Chaussures de Ville Cuir Habillé',
    'Ligne classique sobre et distinguée pour réunions de direction et cérémonies.',
    48000,
    'https://upload.wikimedia.org/wikipedia/commons/0/02/Crockett_%26_Jones_men%27s_dress_shoes%2C_type_Dalton%2C_black_calf_leather_04.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 3
),
(
    'prod_d15_4', 'store_demo_15', 'cat_d15',
    'Chaussures Cuir Oxford Glaçage Rouge Bordeaux',
    'Cuir noble lustré aux reflets bordeaux brossés à la main.',
    58000,
    'https://upload.wikimedia.org/wikipedia/commons/9/91/Red_leather_oxford_shoes_by_Eugene_Pik_%282021%29_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 4
),
(
    'prod_02426949-6', 'store_demo_15', 'cat_d15',
    'Derbies Cuir Artisanal Cousu Trépointe',
    'Chaussures solides et confortables à semelle antidérapante en gomme.',
    42000,
    'https://upload.wikimedia.org/wikipedia/commons/6/61/Red_leather_oxford_shoes_by_Eugene_Pik_%282021%29_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 5
),
(
    'prod_d24922b5-e', 'store_demo_15', 'cat_d15',
    'Ceinture en Cuir Pleine Fleur Boucle Métal',
    'Ceinture 3.5cm en cuir tannage végétal avec boucle ardillon argentée brossée.',
    14000,
    'https://upload.wikimedia.org/wikipedia/commons/1/19/Germany_Belt-and-Buckle-01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 6
),
(
    'prod_3a32d526-5', 'store_demo_15', 'cat_d15',
    'Sandales Homme en Cuir Naturel Fait Main',
    'Lanières épaisses en cuir gras robuste avec semelle anatomique grand confort.',
    22000,
    'https://upload.wikimedia.org/wikipedia/commons/a/a9/Jesus_Shoes_B%26W_%283546114469%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 7
),
(
    'prod_3f51dce6-4', 'store_demo_15', 'cat_d15',
    'Portefeuille Compagnon Cuir Véritable',
    'Portefeuille à multiples fentes pour cartes bancaires, billets et pièces avec zip sécurisé.',
    16000,
    'https://cdn.dummyjson.com/product-images/womens-bags/heshe-women's-leather-bag/thumbnail.webp',
    1, NULL, 0, 8
),
(
    'prod_d2_1', 'store_demo_2', 'cat_d2',
    'Crème Visage Hydratante Éclat',
    'Hydratation intense 24h, teint unifié et lumineux. Texture légère non grasse.',
    6500,
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d2_2', 'store_demo_2', 'cat_d2',
    'Sérum Booster Vitamine C Glow',
    'Formule concentrée antioxydante pour estomper les taches et réveiller le teint.',
    9500,
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 2
),
(
    'prod_d2_3', 'store_demo_2', 'cat_d2',
    'Masque Purifiant & Hydratant',
    'Masque soin au miel et argile douce pour resserrer les pores et nourrir.',
    4500,
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d2_4', 'store_demo_2', 'cat_d2',
    'Baume Nourrissant Corps Karité',
    'Soin riche au pur beurre de karité pour peaux sèches et sensibles.',
    5500,
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_df72ac46-2', 'store_demo_2', 'cat_d2',
    'Mascara Volume & Allongement',
    'Mascara noir profond effet faux-cils longue tenue sans paquets.',
    4000,
    'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
    1, NULL, 0, 5
),
(
    'prod_5aeb6c10-a', 'store_demo_2', 'cat_d2',
    'Palette Fards à Paupières Nude & Gold',
    'Palette 12 teintes mates et irisées hautement pigmentées avec miroir.',
    8500,
    'https://cdn.dummyjson.com/product-images/beauty/eyeshadow-palette-with-mirror/thumbnail.webp',
    1, NULL, 0, 6
),
(
    'prod_137e2694-2', 'store_demo_2', 'cat_d2',
    'Poudre Libre Matifiante Teint Parfait',
    'Poudre fine anti-brillance idéale sous climat humide, tenue 12 heures.',
    5000,
    'https://cdn.dummyjson.com/product-images/beauty/powder-canister/thumbnail.webp',
    1, NULL, 0, 7
),
(
    'prod_0b63ea0d-8', 'store_demo_2', 'cat_d2',
    'Rouge à Lèvres Velours Rouge Passion',
    'Fini semi-mat crémeux et hydratant, couleur vibrante dès le premier passage.',
    3500,
    'https://cdn.dummyjson.com/product-images/beauty/red-lipstick/thumbnail.webp',
    1, NULL, 0, 8
),
(
    'prod_d8_1', 'store_demo_8', 'cat_d8',
    'Robe de Soirée Noire Fendue',
    'Coupe sirène sublime en tissu soyeux extensible, parfaite pour vos dîners et galas.',
    38000,
    'https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/thumbnail.webp',
    1, NULL, 1, 1
),
(
    'prod_d8_2', 'store_demo_8', 'cat_d8',
    'Robe Midi Chic Imprimée Fleurie',
    'Robe portefeuille fluide avec ceinture nouée, col en V très flatteur.',
    22000,
    'https://cdn.dummyjson.com/product-images/womens-dresses/dress-pea/thumbnail.webp',
    1, NULL, 1, 2
),
(
    'prod_d8_3', 'store_demo_8', 'cat_d8',
    'Ensemble Corset Cuir & Jupe Noire',
    'Look tendance sophistiqué avec corset structuré et jupe évasée.',
    32000,
    'https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/thumbnail.webp',
    1, NULL, 0, 3
),
(
    'prod_d8_4', 'store_demo_8', 'cat_d8',
    'Chemise en Lin Coupe Décontractée',
    'Chemise mixte en lin naturel lavé, respirante et chic pour le quotidien.',
    17500,
    'https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/thumbnail.webp',
    1, NULL, 0, 4
),
(
    'prod_0f6bcf24-a', 'store_demo_8', 'cat_d8',
    'Sac à Main Cuir Bleu Cobalt',
    'Sac bandoulière tendance pour femme avec fermoir métallique doré.',
    26000,
    'https://cdn.dummyjson.com/product-images/womens-bags/blue-women's-handbag/thumbnail.webp',
    1, NULL, 0, 5
),
(
    'prod_218e1e67-2', 'store_demo_8', 'cat_d8',
    'Sac de Luxe Cuir Marron Foncé',
    'Sac cabas spacieux en cuir pleine fleur, finitions soignées pour femme active.',
    35000,
    'https://cdn.dummyjson.com/product-images/womens-bags/heshe-women's-leather-bag/thumbnail.webp',
    1, NULL, 0, 6
),
(
    'prod_bc8d2eac-8', 'store_demo_8', 'cat_d8',
    'Escarpins Noirs Talons Aiguilles',
    'Chaussures à talons élégantes et confortables pour le bureau ou les soirées.',
    28000,
    'https://cdn.dummyjson.com/product-images/womens-shoes/calvin-klein-heel-shoes/thumbnail.webp',
    1, NULL, 0, 7
),
(
    'prod_49da5793-9', 'store_demo_8', 'cat_d8',
    'Sandales Dorées de Cérémonie',
    'Sandales festives dorées légères à bride ajustable pour sublimer vos tenues.',
    24000,
    'https://cdn.dummyjson.com/product-images/womens-shoes/golden-shoes-woman/thumbnail.webp',
    1, NULL, 0, 8
),
(
    'prod_d11_1', 'store_demo_11', 'cat_d11',
    'Canapé 3 Places Design Tissu Gris',
    'Canapé contemporain ultra confortable avec mousse haute résilience et pieds métal.',
    280000,
    'https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-sofa/thumbnail.webp',
    1, NULL, 1, 1
),
(
    'prod_d11_2', 'store_demo_11', 'cat_d11',
    'Grand Lit Double Annibale Colombo',
    'Lit king-size avec tête de lit capitonnée et cadre en bois noble.',
    350000,
    'https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-bed/thumbnail.webp',
    1, NULL, 1, 2
),
(
    'prod_d11_3', 'store_demo_11', 'cat_d11',
    'Table de Chevet Bois Massif African Cherry',
    'Chevet élégant avec tiroir silencieux et finition satinée naturelle.',
    48000,
    'https://cdn.dummyjson.com/product-images/furniture/bedside-table-african-cherry/thumbnail.webp',
    1, NULL, 0, 3
),
(
    'prod_d11_4', 'store_demo_11', 'cat_d11',
    'Fauteuil Conférence Knoll Saarinen',
    'Fauteuil ergonomique icône du design moderne, assise enveloppante et dossier galbé.',
    120000,
    'https://cdn.dummyjson.com/product-images/furniture/knoll-saarinen-executive-conference-chair/thumbnail.webp',
    1, NULL, 0, 4
),
(
    'prod_42201b1b-f', 'store_demo_11', 'cat_d11',
    'Cadre Photo Arbre Généalogique Décoratif',
    'Support mural artistique en métal laqué pour 6 photos souvenirs de famille.',
    15000,
    'https://cdn.dummyjson.com/product-images/home-decoration/family-tree-photo-frame/thumbnail.webp',
    1, NULL, 0, 5
),
(
    'prod_7e3d666c-c', 'store_demo_11', 'cat_d11',
    'Plante Décorative Artificielle d Intérieur',
    'Feuillage vert luxuriant ultra réaliste avec pot céramique pour salon ou bureau.',
    18000,
    'https://cdn.dummyjson.com/product-images/home-decoration/house-showpiece-plant/thumbnail.webp',
    1, NULL, 0, 6
),
(
    'prod_0fe4b051-c', 'store_demo_11', 'cat_d11',
    'Cache-Pot Contemporain Céramique',
    'Pot de fleurs géométrique pour sublimer vos plantes d intérieur.',
    12000,
    'https://cdn.dummyjson.com/product-images/home-decoration/plant-pot/thumbnail.webp',
    1, NULL, 0, 7
),
(
    'prod_34541776-6', 'store_demo_11', 'cat_d11',
    'Table Basse Salon Bois & Lignes Épurées',
    'Table basse rectangulaire moderne avec plateau spacieux et étagère inférieure.',
    75000,
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 8
),
(
    'prod_d7_1', 'store_demo_7', 'cat_d7',
    'Riz Blanc Grains Longs Sac 5kg',
    'Riz supérieur non collant, idéal pour riz sauté, jollof et repas familiaux.',
    7500,
    'https://cdn.dummyjson.com/product-images/groceries/rice/thumbnail.webp',
    1, NULL, 1, 1
),
(
    'prod_d7_2', 'store_demo_7', 'cat_d7',
    'Poulet Fermier Découpé Frais 1.5kg',
    'Morceaux de poulet nettoyés et prêts à cuire, chair tendre et savoureuse.',
    4200,
    'https://cdn.dummyjson.com/product-images/groceries/chicken-meat/thumbnail.webp',
    1, NULL, 1, 2
),
(
    'prod_d7_3', 'store_demo_7', 'cat_d7',
    'Viande de Bœuf Fraîche 1kg',
    'Steak et morceaux de bœuf sélectionnés sans gras superflu.',
    3800,
    'https://cdn.dummyjson.com/product-images/groceries/beef-steak/thumbnail.webp',
    1, NULL, 0, 3
),
(
    'prod_d7_4', 'store_demo_7', 'cat_d7',
    'Huile de Tournesol Raffinée Bouteille 1L',
    'Huile de cuisson saine et sans cholestérol pour toutes fritures.',
    1800,
    'https://cdn.dummyjson.com/product-images/groceries/cooking-oil/thumbnail.webp',
    1, NULL, 0, 4
),
(
    'prod_21e54f34-1', 'store_demo_7', 'cat_d7',
    'Pommes Fraîches Croquantes 1kg',
    'Pommes rouges juteuses importées, riches en vitamines.',
    2000,
    'https://cdn.dummyjson.com/product-images/groceries/apple/thumbnail.webp',
    1, NULL, 0, 5
),
(
    'prod_ac003fb4-6', 'store_demo_7', 'cat_d7',
    'Bananes Douces Régime',
    'Bananes de plantation mûres à point, cultivées localement.',
    1200,
    'https://cdn.dummyjson.com/product-images/groceries/banana/thumbnail.webp',
    1, NULL, 0, 6
),
(
    'prod_4625c65d-0', 'store_demo_7', 'cat_d7',
    'Poivrons Frais Assortis 1kg',
    'Poivrons rouges, jaunes et verts fermes et croquants pour vos sauces.',
    1500,
    'https://cdn.dummyjson.com/product-images/groceries/bell-pepper/thumbnail.webp',
    1, NULL, 0, 7
),
(
    'prod_4b0fff3a-c', 'store_demo_7', 'cat_d7',
    'Oeufs Frais Alvéole de 30',
    'Alvéole de trente œufs frais de ponte du jour garantis fermiers.',
    3000,
    'https://cdn.dummyjson.com/product-images/groceries/eggs/thumbnail.webp',
    1, NULL, 0, 8
),
(
    'prod_d5_1', 'store_demo_5', 'cat_d5',
    'Chanel Coco Noir Eau De Parfum',
    'L incarnation d un oriental lumineux aux notes de bergamote, rose, géranium et fève tonka.',
    75000,
    'https://cdn.dummyjson.com/product-images/fragrances/chanel-coco-noir-eau-de/thumbnail.webp',
    1, NULL, 1, 1
),
(
    'prod_d5_2', 'store_demo_5', 'cat_d5',
    'Dior J adore Eau de Parfum',
    'Bouquet floral iconique façonné sur mesure comme une fleur sur mesure. Flacon 100ml.',
    68000,
    'https://cdn.dummyjson.com/product-images/fragrances/dior-j'adore/thumbnail.webp',
    1, NULL, 1, 2
),
(
    'prod_d5_3', 'store_demo_5', 'cat_d5',
    'Dolce Shine Sillage Solaire',
    'Fragrance florale et fruitée ensoleillée aux notes de mangue juteuse et jasmin.',
    52000,
    'https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/thumbnail.webp',
    1, NULL, 0, 3
),
(
    'prod_d5_4', 'store_demo_5', 'cat_d5',
    'Calvin Klein CK One Fraîcheur',
    'Fragrance fraîche et pure, thé vert et cardamome pour un usage quotidien vivifiant.',
    38000,
    'https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp',
    1, NULL, 0, 4
),
(
    'prod_b233ee57-e', 'store_demo_5', 'cat_d5',
    'Gucci Bloom Floral Nectar',
    'Parfum raffiné capture l esprit des femmes Gucci contemporaines, tubéreuse et jasmin sambac.',
    62000,
    'https://cdn.dummyjson.com/product-images/fragrances/gucci-bloom-eau-de-palfum/thumbnail.webp',
    1, NULL, 0, 5
),
(
    'prod_293930a7-3', 'store_demo_5', 'cat_d5',
    'Eau de Parfum Oud Royal Somptueux',
    'Notes puissantes de bois de oud cambodgien, safran rouge et ambre gris chaud.',
    48000,
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 6
),
(
    'prod_081ed0df-4', 'store_demo_5', 'cat_d5',
    'Parfum Fleur d Oranger Délicate',
    'Essence pure de fleur d oranger et néroli distillé, fraîcheur apaisante.',
    28500,
    'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 7
),
(
    'prod_5c21ca9d-f', 'store_demo_5', 'cat_d5',
    'Brume Satinée Musc Blanc',
    'Brume légère et enveloppante pour le corps et les cheveux, tenue délicate.',
    14000,
    'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 8
),
(
    'prod_d6_1', 'store_demo_6', 'cat_d6',
    'Collier Perles Naturelles & Or',
    'Collier artisanal en véritables perles sélectionnées, fermoir plaqué or 18k.',
    18000,
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d6_2', 'store_demo_6', 'cat_d6',
    'Bracelet Perles et Laiton Brut',
    'Bracelet rigide orné de perles taillées et accents de laiton forgé main.',
    12000,
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 2
),
(
    'prod_d6_3', 'store_demo_6', 'cat_d6',
    'Boucles d Oreilles Créoles Dorées',
    'Grandes créoles martelées ultra légères avec reflets satinés.',
    8500,
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d6_4', 'store_demo_6', 'cat_d6',
    'Pendentif Pierre Précieuse Solaire',
    'Pendentif monté sur chaîne dorée fine, éclat naturel et taille cabochon.',
    22000,
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d1c8d291-2', 'store_demo_6', 'cat_d6',
    'Boucles Cristal Vert Émeraude',
    'Pendants d oreilles raffinés taillés en facettes de cristal vert forêt.',
    14000,
    'https://cdn.dummyjson.com/product-images/womens-jewellery/green-crystal-earring/thumbnail.webp',
    1, NULL, 0, 5
),
(
    'prod_56750c6a-a', 'store_demo_6', 'cat_d6',
    'Boucles d Oreilles Ovales Perle Verte',
    'Monture dorée élégante entourant une pierre ovale verte éclatante.',
    12500,
    'https://cdn.dummyjson.com/product-images/womens-jewellery/green-oval-earring/thumbnail.webp',
    1, NULL, 0, 6
),
(
    'prod_36d1b071-9', 'store_demo_6', 'cat_d6',
    'Boucles Tropicales Feuilles Dorées',
    'Design floral inspiré de la végétation tropicale camerounaise.',
    9500,
    'https://cdn.dummyjson.com/product-images/womens-jewellery/tropical-earring/thumbnail.webp',
    1, NULL, 0, 7
),
(
    'prod_964a815d-6', 'store_demo_6', 'cat_d6',
    'Parure Complète Perles & Laiton Tradition',
    'Ensemble collier ras-du-cou et bracelet assorti pour fêtes et mariages.',
    28000,
    'https://upload.wikimedia.org/wikipedia/commons/c/c7/Traditional_Beaded_Jewelry_Market_Stall.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 8
),
(
    'prod_d3_1', 'store_demo_3', 'cat_d3',
    'Samsung Galaxy S24 Ultra',
    'Écran Dynamic AMOLED 2X 120Hz, quadruple capteur photo 200MP, stylet S-Pen intégré.',
    520000,
    'https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s24-ultra/thumbnail.webp',
    1, NULL, 1, 1
),
(
    'prod_d3_2', 'store_demo_3', 'cat_d3',
    'iPhone 15 Pro Max Reconditionné',
    'Finition Titane naturel, puce A17 Pro, autonomie 29h. Testé et certifié avec garantie.',
    590000,
    'https://cdn.dummyjson.com/product-images/smartphones/iphone-15-pro-max/thumbnail.webp',
    1, NULL, 1, 2
),
(
    'prod_d3_3', 'store_demo_3', 'cat_d3',
    'Samsung Galaxy S10',
    'Smartphone compact et puissant, écran incurvé Quad HD+, capteur d empreinte ultrasonique.',
    135000,
    'https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s10/thumbnail.webp',
    1, NULL, 0, 3
),
(
    'prod_d3_4', 'store_demo_3', 'cat_d3',
    'iPhone 13 Pro 128Go',
    'Écran Super Retina XDR avec ProMotion, mode Cinématique, très bel état avec boîte.',
    380000,
    'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/thumbnail.webp',
    1, NULL, 0, 4
),
(
    'prod_64448bd4-2', 'store_demo_3', 'cat_d3',
    'Apple AirPods Max Argent',
    'Casque circum-auriculaire haute fidélité avec réduction active du bruit et audio spatial.',
    275000,
    'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp',
    1, NULL, 0, 5
),
(
    'prod_350817f5-8', 'store_demo_3', 'cat_d3',
    'Chargeur Rapide 20W Original USB-C',
    'Adaptateur secteur secteur charge ultra rapide compatible iPhone, iPad et Android.',
    15000,
    'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-iphone-charger/thumbnail.webp',
    1, NULL, 0, 6
),
(
    'prod_b9fc397d-1', 'store_demo_3', 'cat_d3',
    'Batterie MagSafe Sans Fil 5000mAh',
    'Powerbank aimantée compacte à fixation magnétique directe à l arrière du téléphone.',
    25000,
    'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-magsafe-battery-pack/thumbnail.webp',
    1, NULL, 0, 7
),
(
    'prod_114e4012-d', 'store_demo_3', 'cat_d3',
    'Coque Silicone Liquide & Protection Caméra',
    'Protection antichoc renforcée avec doublure microfibre douce et verre trempé inclus.',
    5000,
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 8
),
(
    'prod_d13_1', 'store_demo_13', 'cat_d13',
    'Ballon de Basketball Compétition',
    'Ballon taille officielle 7 avec grip texturé antidérapant pour intérieur et extérieur.',
    18000,
    'https://cdn.dummyjson.com/product-images/sports-accessories/basketball/thumbnail.webp',
    1, NULL, 1, 1
),
(
    'prod_d13_2', 'store_demo_13', 'cat_d13',
    'Ballon de Football Américain & Rugby',
    'Cuir synthétique résistant avec laçage pro pour entraînements intenses.',
    15000,
    'https://cdn.dummyjson.com/product-images/sports-accessories/american-football/thumbnail.webp',
    1, NULL, 1, 2
),
(
    'prod_d13_3', 'store_demo_13', 'cat_d13',
    'Gant de Baseball Cuir Véritable',
    'Gant de protection rembourré paume renforcée pour amortir chaque prise.',
    22000,
    'https://cdn.dummyjson.com/product-images/sports-accessories/baseball-glove/thumbnail.webp',
    1, NULL, 0, 3
),
(
    'prod_d13_4', 'store_demo_13', 'cat_d13',
    'Balle de Baseball Officielle Cuir Blanc',
    'Balle cousue main à coutures surélevées rouges conformes aux normes.',
    6000,
    'https://cdn.dummyjson.com/product-images/sports-accessories/baseball-ball/thumbnail.webp',
    1, NULL, 0, 4
),
(
    'prod_ca7f4f0b-3', 'store_demo_13', 'cat_d13',
    'Paire d Haltères Hexagonaux Fitness 10kg',
    'Haltères en fonte gainée caoutchouc antichoc avec poignées chromées ergonomiques.',
    35000,
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 5
),
(
    'prod_c5c56d74-a', 'store_demo_13', 'cat_d13',
    'Tapis de Gym & Yoga Antidérapant Épais',
    'Mousse haute densité 8mm anti-glisse avec sangle de transport incluse.',
    14000,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 6
),
(
    'prod_a7cdca52-2', 'store_demo_13', 'cat_d13',
    'Tenue de Sport Compression Respirante',
    'T-shirt technique et legging stretch à séchage rapide pour musculation et cardio.',
    18000,
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 7
),
(
    'prod_63209d6f-3', 'store_demo_13', 'cat_d13',
    'Gourde Isotherme Sport Métal 1L',
    'Garde l eau glacée pendant 24h sans condensation avec bouchon paille pratique.',
    8500,
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 8
),
(
    'prod_d9_1', 'store_demo_9', 'cat_d9',
    'Gâteau Anniversaire Personnalisé Chocolat',
    'Gâteau moelleux multi-étages nappé de ganache chocolat noir et décors soignés.',
    25000,
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d9_2', 'store_demo_9', 'cat_d9',
    'Gâteau Chocolat Noisette Gourmand',
    'Pâtisserie fine croustillante pralinée et mousse onctueuse.',
    28000,
    'https://upload.wikimedia.org/wikipedia/commons/6/6e/8-Layer_Chocolate_Hazelnut_Cake.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 1, 2
),
(
    'prod_d9_3', 'store_demo_9', 'cat_d9',
    'Cupcakes Décorés Boîte de 6',
    'Assortiment de cupcakes vanille, fraise et chocolat avec glaçage artisanal.',
    8500,
    'https://upload.wikimedia.org/wikipedia/commons/7/71/The_Perfect_Cupcake_%28Unsplash%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 3
),
(
    'prod_d9_4', 'store_demo_9', 'cat_d9',
    'Tartelettes & Mini Pâtisseries Plateau',
    'Plateau de 12 mignardises sucrées pour réceptions et fêtes.',
    18000,
    'https://upload.wikimedia.org/wikipedia/commons/d/d1/DFC_4093_Assorted_mini_cream-topped_pastries_drizzled_with_fruit_sauce_and_chocolate_ready_to_tempt_at_the_bakery_counter.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 4
),
(
    'prod_70aff2c7-7', 'store_demo_9', 'cat_d9',
    'Croissants au Beurre Dorés (Lot de 4)',
    'Croissants pur beurre croustillants feuilletés cuits le matin même.',
    3000,
    'https://upload.wikimedia.org/wikipedia/commons/d/d2/20231022_101836_Croissant_supr%C3%AAme.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 5
),
(
    'prod_2a6e912a-6', 'store_demo_9', 'cat_d9',
    'Gâteau Festif Génoise & Noix de Coco',
    'Génoise aérée à la vanille bourbon nappée de crème chocolat et copeaux de coco.',
    22000,
    'https://upload.wikimedia.org/wikipedia/commons/6/65/Homemade_vanilla_sponge_cake_with_dark_chocolate_frosting_and_shredded_coconut.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 6
),
(
    'prod_72438565-4', 'store_demo_9', 'cat_d9',
    'Cupcakes Glacés Parfum Vanille (Lot de 4)',
    'Glaçage royal soyeux et perles de sucre croquantes.',
    6000,
    'https://upload.wikimedia.org/wikipedia/commons/1/11/Icingdecoratedcupcakes.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 7
),
(
    'prod_4f652d92-3', 'store_demo_9', 'cat_d9',
    'Cake Fondant Tout Chocolat Entier',
    'Cœur fondant pur cacao avec perles croustillantes en surface.',
    15000,
    'https://upload.wikimedia.org/wikipedia/commons/c/cf/Layered_chocolate_cake.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
    1, NULL, 0, 8
),
(
    'prod_d12_1', 'store_demo_12', 'cat_d12',
    'Mixeur Blender Électrique 600W',
    'Blender haute puissance avec bol gradué incassable et lames inox pour smoothies et soupes.',
    28000,
    'https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/thumbnail.webp',
    1, NULL, 1, 1
),
(
    'prod_d12_2', 'store_demo_12', 'cat_d12',
    'Cuisinière & Plaque Électrique Rapide',
    'Plaque chauffante de cuisson compacte avec thermostat de précision.',
    35000,
    'https://cdn.dummyjson.com/product-images/kitchen-accessories/electric-stove/thumbnail.webp',
    1, NULL, 1, 2
),
(
    'prod_d12_3', 'store_demo_12', 'cat_d12',
    'Fouet Électrique & Batteur Cuisine',
    'Batteur à main ergonomique multi-vitesses pour crèmes, œufs et pâtes à gâteau.',
    14000,
    'https://cdn.dummyjson.com/product-images/kitchen-accessories/black-whisk/thumbnail.webp',
    1, NULL, 0, 3
),
(
    'prod_d12_4', 'store_demo_12', 'cat_d12',
    'Presse-Agrumes d Extraction Inox',
    'Presse-agrumes manuel robuste en acier inoxydable pour jus d oranges et citrons frais.',
    16500,
    'https://cdn.dummyjson.com/product-images/kitchen-accessories/citrus-squeezer/thumbnail.webp',
    1, NULL, 0, 4
),
(
    'prod_25f2f741-6', 'store_demo_12', 'cat_d12',
    'Casque Audio Sans Fil Réduction de Bruit',
    'Casque Bluetooth supra-aural autonomie 30h, basses profondes et micro intégré.',
    32000,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 5
),
(
    'prod_fbd30867-2', 'store_demo_12', 'cat_d12',
    'Fer à Repasser Vapeur Haute Pression',
    'Semelle céramique glisse parfaite avec système anti-calcaire et défroissage vertical.',
    24000,
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 6
),
(
    'prod_32f3e3c4-9', 'store_demo_12', 'cat_d12',
    'Bloc Chargeur Rapide Universel Multi-Ports',
    'Station de charge rapide 65W GaN avec 2x USB-C et 1x USB-A pour recharger 3 appareils.',
    18000,
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 7
),
(
    'prod_c1139355-3', 'store_demo_12', 'cat_d12',
    'Bouilloire Électrique Inox 1.8L',
    'Chauffe ultra rapide en 2 minutes avec arrêt automatique de sécurité et filtre amovible.',
    15000,
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 8
);

-- 8. Table des Notifications In-App (Générales et Ciblées)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    store_id TEXT,                         -- NULL = diffusion générale pour toutes les boutiques, ou store_id pour ciblée
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',              -- 'info' | 'success' | 'warning' | 'tip'
    link_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_store ON notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 9. Suivi des lectures de notifications par boutique
CREATE TABLE IF NOT EXISTS notification_reads (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    read_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(notification_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_reads_store ON notification_reads(store_id);

