# VitrineExpress — Guide de Référence Agent (AGENT.md)

Ce document constitue la source unique de vérité pour tout agent IA (Antigravity, OpenCode, Claude Code, Aider, Cursor, Copilot) ou développeur travaillant sur le projet **VitrineExpress**.

---

## 1. Vision & Modèle Produit

**VitrineExpress** est une plateforme SaaS de vitrines e-commerce ultra-légères optimisées pour les commerçants d'Afrique subsaharienne (Cameroun en priorité : Douala, Yaoundé, Bafoussam...).

### Piliers fondateurs :
1. **0 FCFA d'infrastructure récurrente** : Le projet fonctionne entièrement sur les quotas gratuits de Cloudflare (Pages, Functions, D1 Database).
2. **Tunnel d'achat WhatsApp direct** : Pas de passerelle de paiement lourde ni de compte client obligatoire. Le client clique sur "Commander sur WhatsApp", ce qui préremplit un message WhatsApp structuré directement envoyé au commerçant.
3. **Connexion Commerçant sans friction** : Connexion avec le **Nom de la boutique** ou son **Numéro WhatsApp** + un **Code PIN** à 4-6 chiffres. Plus besoin de clé de licence complexe.
4. **Design Fintech Professionnel** : Palette sobre (émeraude, ardoise/zinc, ambre), typographie soignée, composants épurés. **Aucun emoji dans l'UI**, pas d'icône d'étincelles générique (*Sparkles*).
5. **Image Corporate** : Ne jamais mentionner de nom personnel dans l'UI ou les messages clients ("Karis"). Toujours utiliser *"un conseiller VitrineExpress"* ou *"l'équipe VitrineExpress"*.

---

## 2. Tarification & Codes Promo

### Les 3 Formules d'Abonnement
| Formule | Prix Standard | Prix Promo (1ère année) | Quota Produits | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Découverte** | **0 FCFA** (Gratuit) | 0 FCFA | **8 articles** | Idéal pour tester sans risque |
| **Pro** | **8 000 FCFA / an** | **5 000 FCFA / an** | **30 articles** | Pour les commerces actifs |
| **Premium** | **20 000 FCFA / an** | **14 000 FCFA / an** | **Illimité (999)** | Pour les boutiques établies |

### Codes Promotionnels Actifs
- Codes acceptés : `VIP237`, `PROMO10`, `EXPRESS`, `LANCEMENT`, `DOUALA`, `YAOUNDE`
- **Application** :
  - Formule Pro : réduction de 3 000 FCFA (soit 5 000 FCFA/an au lieu de 8 000 FCFA)
  - Formule Premium : réduction de 6 000 FCFA (soit 14 000 FCFA/an au lieu de 20 000 FCFA)
- Les codes sont validés côté client dans `src/views/RegisterView.tsx` et vérifiés côté serveur dans `functions/api/register.ts`.
- Contact commercial WhatsApp pour les paiements manuels (Orange Money / MTN MoMo) : `237681610040`.

---

## 3. Architecture Technique

### Stack
- **Frontend SPA** : React 18, TypeScript 5.7, Vite 6, Tailwind CSS 3.4, Lucide Icons, Framer Motion, Sonner (toasts).
- **Backend Edge / Serverless** : Cloudflare Pages Functions (`functions/`).
- **Base de Données** : Cloudflare D1 (SQLite serverless managé).
- **Stockage Photos** : Cloudflare R2 ou URLs compressées / CDN Unsplash pour les démos.
- **Tests** : Vitest (couverture backend functions + frontend components).

### Configuration Cloudflare (`wrangler.toml`)
- Database Binding : `DB`
- Nom D1 : `vitrine_express_db`
- ID D1 : `e3621be0-d364-447f-9608-774c58a9f053`
- *Règle CLI* : Le projet possède un fichier `wrangler.toml` — toujours utiliser la commande `wrangler` (et non `cf`).

---

## 4. Schéma de la Base de Données (D1)

Le schéma complet est défini dans `schema.sql`.

### Tables Principales :
1. **`stores`** : Boutiques commerçantes.
   - Champs clés : `id`, `slug` (unique), `name`, `whatsapp_number`, `pin_code` (haché HMAC-SHA256 ou rétro-compatible), `max_products` (8, 30 ou 999), `expires_at`, `license_key`, `is_active`.
2. **`categories`** : Catégories d'articles liées à un `store_id`.
3. **`products`** : Articles en vente (`store_id`, `category_id`, `name`, `price`, `image_url`, `is_available`, `restock_date`, `is_featured`).
4. **`notifications`** : Centre de notifications in-app.
   - `id`, `store_id` (NULL = broadcast général, ou ID boutique = ciblé), `title`, `message`, `type` (`info`|`success`|`warning`|`tip`), `link_url`, `created_at`.
5. **`notification_reads`** : Suivi de lecture des notifications (`notification_id`, `store_id`, `read_at`).
6. **`license_payments`** : Grand livre comptable des règlements et créances par licence (`id`, `store_id`, `license_key`, `plan`, `months`, `amount`, `status` ['paid'|'due'|'cancelled'], `note`, `created_at`).
7. **`sessions`** : Sessions HttpOnly pour marchands et administrateur (`token_hash`, `scope`, `store_id`, `expires_at`).
8. **`auth_attempts`** : Protection anti-brute force / rate limiting.
9. **`licenses`** : Historique et facturation interne.

---

## 4b. Modules Partagés de Plans (`plans.ts`)
- Backend : `functions/_lib/plans.ts`
- Frontend : `src/utils/plans.ts`
Contient les définitions uniques des plans (`PLAN_IDS`, `PLANS`, `normalizePlan`, `planPrice`, `planFromQuota`, `planLabel`, `addMonths`, `proratedPrice`, `isPromoCode`). Doit toujours rester synchronisé entre front et back.

---

## 5. API Endpoints (`functions/`)

### Routes Publiques
- `GET /api/stores` : Liste des boutiques actives (pour vitrine globale/annuaire).
- `GET /api/stores/[slug]` : Données publiques complètes d'une boutique (infos, catégories, produits en stock).
- `POST /api/register` : Inscription d'un nouveau commerçant (vérification d'unicité du nom insensible à la casse, application code promo, attribution plan).
- `GET /boutique/[slug]` : App Shell SSR pour SEO et prévisualisation OpenGraph.

### Routes Espace Marchand (`functions/api/merchant/`)
- `POST /api/merchant/login` : Authentification multi-critères (Nom de boutique, Slug, Téléphone WhatsApp avec/sans 237, ou Licence) + Code PIN.
- `GET /api/merchant/session` : Vérification du cookie de session marchand.
- `GET /api/merchant/store` : Profil complet de la boutique connectée.
- `PUT /api/merchant/store` : Mise à jour des informations de la boutique.
- `GET|POST|PUT|DELETE /api/merchant/products` : Gestion du catalogue (respect du quota `max_products`).
- `GET|POST|PUT|DELETE /api/merchant/categories` : Gestion des catégories de la boutique.
- `GET /api/merchant/notifications` : Récupération des notifications in-app et du compteur non-lu (`unreadCount`).
- `POST /api/merchant/notifications` : Marquer une ou toutes les notifications comme lues.
- `POST /api/merchant/logout` : Révocation de la session marchand.

### Routes Administrateur (`functions/api/admin/`)
- `POST /api/admin/login` : Connexion administrateur avec mot de passe maître sécurisé.
- `GET|POST|PUT /api/admin/licenses` : Gestion des boutiques et licences.
- `GET|POST /api/admin/notifications` : Diffusion de notifications in-app (générales ou ciblées).
- `POST /api/admin/logout` : Déconnexion administrateur.

---

## 6. Commandes Utiles & Environnement

Dans cet environnement (Linux, `mise` ou binaires locaux), toujours exécuter via `./node_modules/.bin/` si `npm` n'est pas dans le PATH sandbox.

### Tests & Qualité de code
```bash
# Lancer toute la suite de tests (95 tests)
./node_modules/.bin/vitest run

# Vérification stricte TypeScript (0 erreur tolérée)
./node_modules/.bin/tsc --noEmit

# Compiler la production Vite
./node_modules/.bin/vite build
```

### Base de données D1 (Wrangler)
```bash
# Appliquer le schéma en local
./node_modules/.bin/wrangler d1 execute vitrine_express_db --local --file=./schema.sql

# Appliquer le schéma en production Cloudflare (nécessite connexion réseau)
./node_modules/.bin/wrangler d1 execute vitrine_express_db --remote --file=./schema.sql
```

### Déploiement Cloudflare Pages
- **Dépôt Git** : Synchronisé sur `main` via `git push origin main`.
- **Mise en ligne de production (`vitrine-express.pages.dev`)** : Le projet Cloudflare Pages fonctionne en mode **Direct Upload** (Wrangler). Pousser sur GitHub archive le code, mais pour déployer la production en direct, il faut compiler et déployer via Wrangler :
  ```bash
  ./node_modules/.bin/vite build && ./node_modules/.bin/wrangler pages deploy dist --project-name=vitrine-express --branch=main
  ```
- Les fonctions serverless (`functions/`) et les en-têtes HTTP de sécurité (`dist/_headers`) sont uploadés et déployés automatiquement par cette commande.

---

## 7. Règles Clés de Contribution pour les Agents

1. **Ne jamais casser les tests existants** : Toujours exécuter `./node_modules/.bin/vitest run` et `./node_modules/.bin/tsc --noEmit` après toute modification.
2. **Pas de régression sur la connexion sans friction** : L'identifiant marchand doit toujours accepter indifféremment le nom de la boutique, le numéro WhatsApp ou la clé de licence.
3. **Respect strict des quotas** : La création de produit (`addProduct`) doit toujours refuser l'ajout si `products.length >= maxProducts`.
4. **Neutralité et Professionnalisme** : Conserver le ton institutionnel fintech, la clarté pour l'utilisateur mobile (boutons tactiles 44px min), et l'absence d'emojis dans les interfaces.
