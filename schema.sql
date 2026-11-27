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
    'prod_d2_1', 'store_demo_2', 'cat_d2',
    'Crème Visage Éclat',
    'Hydratation quotidienne et teint lumineux. Formule légère adaptée au climat de Douala.',
    6500,
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d2_2', 'store_demo_2', 'cat_d2',
    'Sérum Vitamine C Glow',
    'Sérum concentré pour raviver l éclat et uniformiser le teint. Flacon de 30ml.',
    9500,
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d2_3', 'store_demo_2', 'cat_d2',
    'Masque Hydratant Miel',
    'Masque nourrissant au miel et karité. Idéal pour une routine beauté hebdomadaire.',
    4500,
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d2_4', 'store_demo_2', 'cat_d2',
    'Baume Corps Karité',
    'Baume hydratant corps au karité pur. Convient aux peaux sèches et sensibles.',
    5500,
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d3_1', 'store_demo_3', 'cat_d3',
    'Smartphone Galaxy A15',
    'Grand écran AMOLED, batterie longue durée et appareil photo 50MP. Garantie 12 mois.',
    145000,
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d3_2', 'store_demo_3', 'cat_d3',
    'iPhone Reconditionné Pro',
    'Modèle reconditionné contrôlé, batterie neuve. État excellent avec accessoires.',
    320000,
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d3_3', 'store_demo_3', 'cat_d3',
    'Écouteurs Bluetooth TWS',
    'Écouteurs sans fil avec boîtier de charge. Son clair et autonomie jusqu à 6 heures.',
    12000,
    'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d3_4', 'store_demo_3', 'cat_d3',
    'Coque Silicone et Verre Trempé',
    'Protection complète pour smartphone. Livrée avec verre trempé et chiffon nettoyant.',
    3500,
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d4_1', 'store_demo_4', 'cat_d4',
    'Pagne Wax Traditionnel',
    'Pagne wax 100% coton, motif traditionnel. Vendu par pièce de 6 yards.',
    12500,
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d4_2', 'store_demo_4', 'cat_d4',
    'Tenue Traditionnelle Brodée',
    'Ensemble brodé main pour femmes. Confection sur commande, plusieurs coloris disponibles.',
    28000,
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d4_3', 'store_demo_4', 'cat_d4',
    'Chemise Pagne Sur Mesure',
    'Chemise confectionnée dans notre atelier. Coupe ajustée et finitions soignées.',
    18000,
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d4_4', 'store_demo_4', 'cat_d4',
    'Écharpe Motif Kora',
    'Écharpe légère en coton imprimé. Accessoire idéal pour compléter une tenue traditionnelle.',
    8500,
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d5_1', 'store_demo_5', 'cat_d5',
    'Eau de Parfum Oud Royal',
    'Fragrance orientale intense aux notes de bois et d épices. Flacon 100ml.',
    45000,
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d5_2', 'store_demo_5', 'cat_d5',
    'Parfum Fleur d Oranger',
    'Sillage frais et floral, parfait pour la saison sèche. Disponible en 50 et 100ml.',
    28500,
    'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d5_3', 'store_demo_5', 'cat_d5',
    'Brume Corps Musc Blanc',
    'Brume légère pour le corps. Notes douces de musc et de vanille.',
    12000,
    'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d5_4', 'store_demo_5', 'cat_d5',
    'Coffret Miniatures Découverte',
    'Coffret de quatre miniatures pour découvrir nos fragrances favorites. Idéal pour offrir.',
    18000,
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d6_1', 'store_demo_6', 'cat_d6',
    'Collier Perles Naturelles',
    'Collier en perles d eau douce, fermoir doré. Longueur 45cm.',
    15000,
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d6_2', 'store_demo_6', 'cat_d6',
    'Bracelet Perles et Laiton',
    'Bracelet artisanal ajustable, perles naturelles et détails en laiton.',
    9500,
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d6_3', 'store_demo_6', 'cat_d6',
    'Boucles d Oreilles Créoles',
    'Créoles dorées légères, parfaites pour un usage quotidien ou une occasion spéciale.',
    7500,
    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d6_4', 'store_demo_6', 'cat_d6',
    'Pendentif Pierre Précieuse',
    'Pendentif en pierre naturelle monté sur chaîne. Chaque pièce est unique.',
    22000,
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d7_1', 'store_demo_7', 'cat_d7',
    'Riz Basmati 5kg',
    'Riz basmati de qualité supérieure, grains longs et parfumés. Sac de 5kg.',
    8500,
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d7_2', 'store_demo_7', 'cat_d7',
    'Huile de Palme Raffinée 2L',
    'Huile alimentaire raffinée, conditionnée en bouteille de 2 litres.',
    4500,
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d7_3', 'store_demo_7', 'cat_d7',
    'Assortiment Légumes Frais',
    'Panier de légumes frais du marché: tomates, oignons, piments et feuilles.',
    3000,
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d7_4', 'store_demo_7', 'cat_d7',
    'Panier Épicerie Famille',
    'Panier complet avec riz, huile, pâtes, conserves et légumes pour une semaine.',
    25000,
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d8_1', 'store_demo_8', 'cat_d8',
    'Robe Midi Imprimée',
    'Robe midi fluide avec imprimé original. Disponible en plusieurs tailles.',
    22000,
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d8_2', 'store_demo_8', 'cat_d8',
    'Chemise en Lin Élégante',
    'Chemise en lin respirant, idéale pour le climat chaud. Coupe détendue.',
    16500,
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d8_3', 'store_demo_8', 'cat_d8',
    'Pantalon Taille Haute',
    'Pantalon taille haute avec ceinture ajustable. Disponible en noir et beige.',
    14000,
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d8_4', 'store_demo_8', 'cat_d8',
    'Blazer Structuré',
    'Blazer coupe droite pour femme, parfait pour le bureau ou les sorties.',
    35000,
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d9_1', 'store_demo_9', 'cat_d9',
    'Gâteau Personnalisé',
    'Gâteau d anniversaire sur commande, décoré selon vos envies. Commandez 48h à l avance.',
    25000,
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d9_2', 'store_demo_9', 'cat_d9',
    'Tarte aux Fruits Frais',
    'Tarte fine garnie de fruits de saison. Une douceur idéale pour partager.',
    12000,
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d9_3', 'store_demo_9', 'cat_d9',
    'Cupcakes Assortiment',
    'Lot de six cupcakes aux saveurs variées: vanille, chocolat et framboise.',
    8500,
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d9_4', 'store_demo_9', 'cat_d9',
    'Plateau Desserts Événement',
    'Assortiment de petits gâteaux et pâtisseries pour réceptions et événements.',
    40000,
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d10_1', 'store_demo_10', 'cat_d10',
    'Poussette Bébé Pliable',
    'Poussette légère et pliable avec canopy ajustable et freins sécurisés.',
    95000,
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d10_2', 'store_demo_10', 'cat_d10',
    'Lit Bébé en Bois',
    'Lit bébé robuste en bois naturel avec barreaux espacés et matelas inclus.',
    120000,
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d10_3', 'store_demo_10', 'cat_d10',
    'Body Bébé Coton Lot de 5',
    'Lot de cinq bodies en coton doux, tailles 0 à 24 mois, coloris variés.',
    6500,
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d10_4', 'store_demo_10', 'cat_d10',
    'Couches Taille 4 Pack',
    'Paquet de couches taille 4, haute absorption et confort pour bébé.',
    11000,
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d11_1', 'store_demo_11', 'cat_d11',
    'Canapé 3 Places Tissu',
    'Canapé trois places en tissu résistant, confort quotidien pour le salon.',
    250000,
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d11_2', 'store_demo_11', 'cat_d11',
    'Table Basse Bois Massif',
    'Table basse en bois massif avec finition naturelle. Livraison à Douala.',
    95000,
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d11_3', 'store_demo_11', 'cat_d11',
    'Lampe de Table Design',
    'Lampe de table au design moderne, éclairage chaleureux pour chambre ou bureau.',
    22000,
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d11_4', 'store_demo_11', 'cat_d11',
    'Coussin Décoratif Motif',
    'Coussin décoratif avec motif africain. Housse lavable et rembourrage moelleux.',
    5500,
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d12_1', 'store_demo_12', 'cat_d12',
    'Mixeur Blender 600W',
    'Blender électrique 600W avec plusieurs lames pour smoothies et sauces.',
    35000,
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d12_2', 'store_demo_12', 'cat_d12',
    'Fer à Repasser Vapeur',
    'Fer à repasser vapeur avec semelle antiadhésive et réservoir de 300ml.',
    28000,
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d12_3', 'store_demo_12', 'cat_d12',
    'Casque Audio Sans Fil',
    'Casque audio Bluetooth avec réduction de bruit et autonomie de 20 heures.',
    32000,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d12_4', 'store_demo_12', 'cat_d12',
    'Chargeur Rapide Universel',
    'Chargeur rapide avec ports USB-C pour smartphones et tablettes.',
    8500,
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d13_1', 'store_demo_13', 'cat_d13',
    'Haltères Ajustables 20kg',
    'Paire d haltères ajustables jusqu à 20kg pour un entraînement à domicile.',
    45000,
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d13_2', 'store_demo_13', 'cat_d13',
    'Tapis de Yoga Antidérapant',
    'Tapis de yoga épais et antidérapant, livré avec sangle de transport.',
    12000,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d13_3', 'store_demo_13', 'cat_d13',
    'Tenue de Sport Respirante',
    'Ensemble sportif en tissu respirant à séchage rapide. Plusieurs tailles.',
    15000,
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d13_4', 'store_demo_13', 'cat_d13',
    'Gourde Isotherme 1L',
    'Gourde isotherme en acier inoxydable, garde les boissons froides toute la journée.',
    7500,
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d14_1', 'store_demo_14', 'cat_d14',
    'Cahiers A4 Lot de 10',
    'Lot de dix cahiers A4 à 96 pages, couverture cartonnée et lignes internes.',
    5500,
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d14_2', 'store_demo_14', 'cat_d14',
    'Stylos Bille Lot de 12',
    'Boîte de douze stylos bille bleus et noirs, écriture fluide et confortable.',
    3500,
    'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d14_3', 'store_demo_14', 'cat_d14',
    'Classeur Carton A4',
    'Classeur carton A4 avec intercalaires et poche pour documents.',
    4500,
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d14_4', 'store_demo_14', 'cat_d14',
    'Agenda 2027 Couverture Cuir',
    'Agenda annuel 2027 avec couverture simili cuir et pages plannifiées.',
    6500,
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
),
(
    'prod_d15_1', 'store_demo_15', 'cat_d15',
    'Chaussures Cuir Oxford',
    'Chaussures de ville en cuir véritable, semelle cuir et finitions soignées.',
    45000,
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
    1, NULL, 1, 1
),
(
    'prod_d15_2', 'store_demo_15', 'cat_d15',
    'Bottines Cuir Femme',
    'Bottines en cuir souple avec talon confortable. Disponibles en plusieurs pointures.',
    52000,
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
    0, '2026-12-15', 1, 2
),
(
    'prod_d15_3', 'store_demo_15', 'cat_d15',
    'Sandales Cuir Artisanales',
    'Sandales faites main en cuir naturel, semelle antidérapante et bracelet ajustable.',
    28000,
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 3
),
(
    'prod_d15_4', 'store_demo_15', 'cat_d15',
    'Ceinture Cuir Véritable',
    'Ceinture en cuir pleine fleur avec boucle métallique. Plusieurs tailles disponibles.',
    12000,
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
    1, NULL, 0, 4
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

