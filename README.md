# VitrineExpress

PWA de vitrines WhatsApp pour boutiques, pensée pour Karis (L3 Informatique, Cameroun) et conçue pour tourner à 100 % sur l'offre gratuite de Cloudflare Pages + D1.

## Modèle économique

1. Karis crée chaque boutique depuis le License Manager (`/admin`) et remet au commerçant son lien public, sa clé de licence et son PIN.
2. La formule de base coûte 5 000 FCFA/an et donne droit à 20 produits.
3. Les commandes se font directement sur WhatsApp, sans passerelle de paiement.
4. Les produits peuvent être marqués « en stock » ou « bientôt disponible » avec une date de réapprovisionnement.
5. Les photos sont compressées côté navigateur avant l'envoi.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Cloudflare Pages Functions
- Cloudflare D1
- `qrcode` pour la génération locale des affiches, `jsqr` pour scanner les QR codes côté client

## Espaces et routes

| Route | Accès | Description |
| --- | --- | --- |
| `/` | Public | Accueil : présentation, scan QR, collage de lien, boutiques en ligne, accès gérant |
| `/boutique/:slug` | Public | Vitrine client : catalogue, recherche, filtres, WhatsApp |
| `/merchant` | Clé de licence + PIN | Espace boutiquier : produits, catégories, QR code |
| `/admin` | Clé `ADMIN_KEY` | License Manager : boutiques, licences, suspension, renouvellement |

La page d'accueil scanne les QR codes directement dans le navigateur (caméra ou photo importée) et accepte aussi un lien complet, un slug ou l'ancien format `/?store=slug`.

## Développement local

### Frontend seul

```bash
npm install
npm run dev
```

Le frontend est disponible sur `http://localhost:5173`, mais les routes `/api/*` ne fonctionnent pas sans le runtime Cloudflare.

### Application complète (Pages Functions + D1 locale)

```bash
npm install
npm run db:local
printf 'ADMIN_KEY=une-cle-locale-longue-et-aleatoire\nPIN_PEPPER=un-secret-local-different\n' > .dev.vars
npm run dev:full
```

L'application complète est disponible sur `http://localhost:8788`.

- `.dev.vars` est ignoré par Git.
- `npm run db:local` applique `schema.sql` sur la base D1 locale.
- `ADMIN_KEY` et `PIN_PEPPER` doivent rester des valeurs longues et aléatoires, jamais des valeurs de production dans un fichier suivi par Git.

### Vérifications

```bash
npm run typecheck
npm run build
```

## Déploiement sur Cloudflare

### 1. Base D1

La base existe déjà en production. Pour appliquer ou remettre à jour le schéma :

```bash
npm run db:remote
```

Le schéma est idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`).

### 2. Secrets

La clé admin et le secret de hachage des PIN ne doivent jamais être stockés dans `wrangler.toml`. Configure-les comme secrets Pages :

```bash
npx wrangler pages secret put ADMIN_KEY --project-name=vitrine-express
npx wrangler pages secret put PIN_PEPPER --project-name=vitrine-express
```

`PIN_PEPPER` sert à signer les PIN hachés. S'il est perdu ou remplacé, les PIN existants ne sont plus vérifiables : utilise alors le bouton `PIN` du License Manager pour en générer de nouveaux.

### 3. Déploiement

```bash
npm run deploy
```

Ou via l'intégration Git de Cloudflare Pages :

- Framework preset : `Vite`
- Build command : `npm run build`
- Build output directory : `dist`
- D1 binding : variable `DB`, base `vitrine_express_db`

## Données de démonstration

`schema.sql` crée la boutique `kamer-kicks` avec 4 produits et 4 catégories. Pour le développement local, la licence est `LIC-KK2026-99` et le PIN est `1234`.

Ces identifiants sont publics dans le dépôt et ne doivent pas être utilisés tels quels en production. Le PIN de la boutique de démonstration en production a été remplacé par une valeur aléatoire.

## Sécurité

- PIN hachés avec HMAC-SHA256, un sel aléatoire par boutique et le secret serveur `PIN_PEPPER`.
- Les anciens PIN en clair sont acceptés une dernière fois puis migrés automatiquement après une connexion réussie.
- Le PIN n'est plus jamais réaffiché dans le License Manager : le bouton `PIN` génère un nouveau code et l'affiche une seule fois.
- Limitation des tentatives : 5 échecs par IP et par identifiant pour le login (blocage 15 min), 12 échecs pour les actions marchand, 5 échecs pour l'admin (blocage 30 min).
- Un PIN correct reste accepté même si l'IP a été temporairement bloquée, puis les compteurs sont remis à zéro.

## Checklist de mise en production

- [ ] Révoquer l'ancien token GitHub exposé.
- [x] Remplacer l'ancienne clé admin exposée par un secret aléatoire.
- [x] Changer le PIN de la boutique de démonstration en production.
- [x] Supprimer l'ancien mot de passe admin du bundle et de la configuration.
- [x] Hacher les PIN et limiter les tentatives de connexion.
- [ ] Vérifier que `ADMIN_KEY` et `PIN_PEPPER` n'apparaissent ni dans `wrangler.toml`, ni dans le bundle, ni dans Git.

## Commandes utiles

```bash
npm run dev        # frontend Vite seul
npm run dev:full   # build + Cloudflare Pages local
npm run typecheck  # vérification TypeScript
npm run build      # build de production
npm run deploy     # build + déploiement Cloudflare Pages
npm run db:local   # schéma + démo sur D1 locale
npm run db:remote  # schéma sur D1 distante
```
