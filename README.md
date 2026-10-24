# 🛍️ VitrineExpress — Vitrines PWA & WhatsApp pour Boutiques

Conçu et développé sur-mesure pour **Karis** (L3 Informatique, Cameroun) pour lancer un business rentable de création de vitrines de boutiques à **5 000 FCFA / an**.

---

## 🎯 Le Concept & Modèle Économique (Business Model)

1. **Aucun compte complexe à créer par les commerçants :**
   * Tu gères tout depuis ton **License Manager Admin**.
   * Tu vends la création de la boutique à **5 000 FCFA pour 1 an** (environ 415 FCFA / mois).
   * Tu fournis au commerçant : son lien public, son code PIN et son **affiche QR Code comptoir** prête à imprimer.

2. **La règle stricte des 20 produits :**
   * Chaque boutique est limitée à **20 articles max**.
   * Cette limite force le commerçant à exposer ses best-sellers et te garantit de **rester 100% dans les quotas gratuits de Cloudflare D1 et Pages** (0 FCFA de frais de serveur pour toi).
   * Si un commerçant veut plus de 20 articles, tu lui proposes la formule Pro à 10 000 FCFA/an !

3. **100% WhatsApp-First :**
   * Zéro passerelle de paiement compliquée.
   * Chaque produit dispose du bouton **"Discuter sur WhatsApp"** avec un message pré-rempli sur-mesure contenant le nom du produit, le prix en FCFA, le lien et la demande de disponibilité.

4. **Gestion des disponibilités & "Bientôt disponible" :**
   * Badge vert **"En stock"** pour les articles en rayon.
   * Badge ambre **"Arrive le JJ/MM/AAAA"** pour les réapprovisionnements en cours, incitant les clients à réserver à l'avance sur WhatsApp.

5. **Compression intelligente des photos intégrée (0 Ko de data gaspillée) :**
   * Le commerçant prend une photo de 8 Mo avec son téléphone.
   * Le navigateur la compresse automatiquement à **~90 Ko** avant l'envoi.
   * Chargement instantané même sur le réseau 3G/4G camerounais (Orange / MTN).

---

## 🚀 Démarrage Local

```bash
cd /home/karis/PROJECT/vitrine-express
npm run dev
```

L'application s'ouvre sur `http://localhost:5173`.

---

## ☁️ Déploiement 100% Gratuit sur Cloudflare (Pages + D1)

### Étape 1 : Créer la Base de Données Cloudflare D1
Dans ton terminal ou sur le dashboard Cloudflare :
```bash
# 1. Créer la base D1
npx wrangler d1 create vitrine_express_db

# 2. Exécuter le schéma SQL (tables & données de démo)
npx wrangler d1 execute vitrine_express_db --file=./schema.sql
```

### Étape 2 : Déployer sur Cloudflare Pages
1. Pousse ton code sur ton compte GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit VitrineExpress"
   git remote add origin https://github.com/ton-profil/vitrine-express.git
   git push -u origin main
   ```
2. Rends-toi sur [dash.cloudflare.com](https://dash.cloudflare.com/) ➔ **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
3. Sélectionne ton dépôt :
   * **Framework preset :** `Vite`
   * **Build command :** `npm run build`
   * **Build output directory :** `dist`
4. Dans **Settings** ➔ **Functions** ➔ **D1 database bindings** :
   * Nom de la variable : `DB`
   * Sélectionne ta base : `vitrine_express_db`
5. Clique sur **Deploy** ! Ton site est en ligne en HTTPS gratuit avec bande passante illimitée !

---

## 📱 Les 3 Espaces de l'Application

1. **Vitrine Client (`/?store=kamer-kicks`) :**
   * Header avec couverture, logo officiel, ville, quartier, bouton d'appel direct.
   * Barre de recherche instantanée et filtres par catégories fluides.
   * Grille produit avec badges de stock, prix FCFA et bouton de commande WhatsApp.
   * Fiche détaillée en pop-up moderne.
2. **Espace Gérant :**
   * Jauge en temps réel du quota : `14 / 20 produits utilisés`.
   * Bouton d'ajout avec compression d'image en direct.
   * Bouton pour basculer un article en "En stock" ou "Bientôt disponible" avec date.
   * Générateur d'affiche QR Code pour le comptoir ou la porte du magasin.
3. **Licence Manager Karis (`/admin`) :**
   * Tableau de bord réservé à Karis.
   * Création instantanée d'une nouvelle boutique (attribution de la clé licence et du PIN).
   * Calcul en temps réel du Chiffre d'Affaires encaissé (X boutiques × 5 000 FCFA).
   * Suivi des dates d'échéances pour relancer les paiements annuels.
   * Suspension ou réactivation en 1 clic.
