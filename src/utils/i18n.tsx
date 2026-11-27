import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'fr' | 'en';

export interface Translations {
  // Navigation
  nav: {
    home: string;
    stores: string;
    merchantSpace: string;
    login: string;
    admin: string;
    terms: string;
    privacy: string;
    searchPlaceholder: string;
    subTitle: string;
  };
  register: {
    step1: string;
    step1Title: string;
    step1Hint: string;
    step2: string;
    step2Title: string;
    step2Hint: string;
    step3: string;
    step3Title: string;
    step3Hint: string;
    step4: string;
    step4Title: string;
    step4Hint: string;
    step5: string;
    step5Title: string;
    step5Hint: string;
    next: string;
    back: string;
    creating: string;
  };
  // Landing Page
  landing: {
    tagline: string;
    heroTitle: string;
    heroHighlight: string;
    heroDescription: string;
    featureNoApp: string;
    featureWhatsApp: string;
    featureInstant: string;
    ctaCreateStore: string;
    ctaDiscover: string;
    ctaHasQr: string;
    clientAccessTitle: string;
    clientAccessHeading: string;
    scanQrBtn: string;
    scanQrSub: string;
    or: string;
    pasteLinkPlaceholder: string;
    openStoreBtn: string;
    invalidLinkError: string;
    storeNotFound: string;
    qrInvalid: string;
    merchantCardTitle: string;
    merchantCardText: string;
    merchantLoginBtn: string;
    stepsSubtitle: string;
    stepsTitle: string;
    stepsDescription: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    discoverTitle: string;
    onlineStoresHeading: string;
    emptyStoresTitle: string;
    emptyStoresText: string;
    ticketEyebrow: string;
    catalogLabel: string;
    locationLabel: string;
    itemsLabel: string;
    fallbackStoreName: string;
    storesOnline: string;
    readyMessage: string;
    searchStores: string;
    viewStore: string;
    onlineLabel: string;
    fallbackDescription: string;
    pricingEyebrow: string;
    pricingTitle: string;
    pricingDescription: string;
    pricingNote: string;
    freeLabel: string;
    perYear: string;
    noTimeLimit: string;
    upToItems: string;
    createStoreCta: string;
    faqEyebrow: string;
    faqTitle: string;
    faq: { question: string; answer: string }[];
    finalCtaTitle: string;
    storesNav: string;
    plansNav: string;
    merchantSpace: string;
    footerSubtitle: string;
    footerDesignedBy: string;
  };
  // Storefront
  storefront: {
    searchPlaceholder: string;
    allArticles: string;
    inStock: string;
    restockingSoon: string;
    restockingOn: string;
    discussWhatsApp: string;
    orderWhatsApp: string;
    shareStore: string;
    linkCopied: string;
    qrModalTitle: string;
    qrModalDesc: string;
    printPoster: string;
    downloadPoster: string;
    noProductsFound: string;
    noProductsCategory: string;
    clearFilter: string;
    verifiedStore: string;
    contactBtn: string;
    callBtn: string;
    viewProductDetails: string;
    productDetails: string;
    close: string;
    orderPrompt: string;
    remainingDays: string;
    addToCart: string;
    cart: string;
    orderCart: string;
    clearCart: string;
    cartEmpty: string;
    cartItemsCount: string;
    totalAmount: string;
  };
  // Merchant Dashboard & Login
  merchant: {
    loginTitle: string;
    loginSubtitle: string;
    licenseKeyLabel: string;
    licenseKeyPlaceholder: string;
    pinLabel: string;
    pinPlaceholder: string;
    forgotPin: string;
    forgotPinMessage: string;
    loginBtn: string;
    loginLoading: string;
    loginError: string;
    dashboardTitle: string;
    quotaLabel: string;
    quotaWarning: string;
    addProductBtn: string;
    manageCategoriesBtn: string;
    myStoreBtn: string;
    logoutBtn: string;
    printQrBtn: string;
    viewPublicStore: string;
    editProduct: string;
    deleteProduct: string;
    deleteConfirm: string;
    statusInStock: string;
    statusRestocking: string;
    searchProducts: string;
    noProductsYet: string;
    noProductsYetDesc: string;
  };
}

export const translations: Record<Language, Translations> = {
  fr: {
    nav: {
      home: 'Accueil',
      stores: 'Boutiques',
      merchantSpace: 'Espace gérant',
      login: 'Se connecter',
      admin: 'Administration',
      terms: 'CGU/CGV',
      privacy: 'Confidentialité',
      searchPlaceholder: 'Rechercher un article...',
      subTitle: 'Vitrines en ligne',
    },
    register: {
      step1: 'Votre boutique',
      step1Title: 'Donnez un nom à votre vitrine',
      step1Hint: 'Ce nom apparaîtra sur votre lien public et vos messages WhatsApp.',
      step2: 'Votre contact',
      step2Title: 'Votre numéro WhatsApp',
      step2Hint: 'Ce numéro reçoit directement les commandes de vos clients.',
      step3: 'Votre emplacement',
      step3Title: 'Où se trouve votre commerce ?',
      step3Hint: 'Ajoutez votre préférence de contact pour l’assistance.',
      step4: 'Votre accès',
      step4Title: 'Créez votre code PIN secret',
      step4Hint: 'Entre 4 et 12 caractères. Il ne sera affiché qu’une seule fois.',
      step5: 'Votre formule',
      step5Title: 'Choisissez votre point de départ',
      step5Hint: 'Commencez gratuitement, puis évoluez quand vous le souhaitez.',
      next: 'Continuer',
      back: 'Retour',
      creating: 'Création de votre vitrine en cours...',
    },
    landing: {
      tagline: 'Le commerce de proximité, en ligne',
      heroTitle: 'Votre boutique,',
      heroHighlight: 'prête à être partagée.',
      heroDescription: 'Un catalogue élégant, un lien simple et un QR code à scanner. Vos clients découvrent vos produits et vous écrivent directement sur WhatsApp, sans installer d’application.',
      featureNoApp: 'Sans application',
      featureWhatsApp: 'Commande WhatsApp',
      featureInstant: 'Mise à jour instantanée',
      ctaCreateStore: 'Créer ma boutique sur WhatsApp',
      ctaDiscover: 'Découvrir les boutiques',
      ctaHasQr: 'J’ai un QR code',
      clientAccessTitle: 'Accès client',
      clientAccessHeading: 'Entrer dans une boutique',
      scanQrBtn: 'Scanner un QR code',
      scanQrSub: 'Avec la caméra ou une photo',
      or: 'ou',
      pasteLinkPlaceholder: 'Coller un lien ou un nom de boutique...',
      openStoreBtn: 'Ouvrir',
      invalidLinkError: 'Ce lien ne correspond pas à une boutique VitrineExpress. Vérifiez le lien ou son QR code.',
      storeNotFound: 'Boutique introuvable ou indisponible pour le moment.',
      qrInvalid: 'Ce QR code ne contient pas de lien vers une boutique VitrineExpress.',
      merchantCardTitle: 'Vous êtes boutiquier ?',
      merchantCardText: 'Gérez votre catalogue, vos prix et vos arrivages.',
      merchantLoginBtn: 'Se connecter à mon espace',
      stepsSubtitle: 'Simple pour vos clients',
      stepsTitle: 'Un lien, un catalogue, une conversation WhatsApp.',
      stepsDescription: 'Pas de compte à créer, pas d’application à installer. Vos clients arrivent directement sur votre vitrine et commandent là où ils sont déjà.',
      step1Title: 'Scannez ou ouvrez le lien',
      step1Desc: 'Le QR code de la boutique vous emmène directement sur son catalogue.',
      step2Title: 'Parcourez les articles',
      step2Desc: 'Photos, prix, disponibilité et arrivages : tout est clair en un coup d’œil.',
      step3Title: 'Commandez sur WhatsApp',
      step3Desc: 'Un article vous plaît ? La conversation s’ouvre avec le message déjà prêt.',
      discoverTitle: 'À découvrir',
      onlineStoresHeading: 'Boutiques en ligne',
      emptyStoresTitle: 'Les premières vitrines arrivent bientôt',
      emptyStoresText: 'Vous êtes commerçant ? Connectez-vous à votre espace pour mettre votre catalogue en ligne.',
      ticketEyebrow: 'Vitrine en ligne',
      catalogLabel: 'Catalogue',
      locationLabel: 'Emplacement',
      itemsLabel: 'articles',
      fallbackStoreName: 'Boutique Douala',
      storesOnline: '{count} boutiques en ligne',
      readyMessage: 'Le message est déjà prêt.',
      searchStores: 'Rechercher une boutique',
      viewStore: 'Voir la boutique',
      onlineLabel: 'En ligne',
      fallbackDescription: 'Découvrez les articles disponibles dans cette boutique.',
      pricingEyebrow: 'Formules',
      pricingTitle: 'Commencez petit, grandissez à votre rythme',
      pricingDescription: 'Une vitrine gratuite pour démarrer, puis plus de place quand votre catalogue grandit.',
      pricingNote: 'Codes promo : {codes}. Pro à {pro} et Premium à {premium} la première année.',
      freeLabel: 'Gratuit',
      perYear: 'par an',
      noTimeLimit: 'sans limite de temps',
      upToItems: 'Jusqu’à {count} articles',
      createStoreCta: 'Créer ma vitrine',
      faqEyebrow: 'Questions fréquentes',
      faqTitle: 'Ce que vous demandez le plus',
      faq: [
        {
          question: 'Ai-je besoin de compétences techniques ou d’un ordinateur ?',
          answer: 'Non. Tout se fait depuis votre téléphone : créer la boutique, ajouter des photos, modifier les prix et télécharger votre affiche QR.',
        },
        {
          question: 'Prenez-vous une commission sur mes ventes ?',
          answer: 'Jamais. Vos clients vous envoient leurs commandes sur WhatsApp et vous réglez directement avec eux.',
        },
        {
          question: 'Combien coûte l’ouverture d’une boutique ?',
          answer: 'Le plan Découverte est gratuit jusqu’à {freeQuota} articles. Pro coûte {proPrice} par an et Premium {premiumPrice}.',
        },
      ],
      finalCtaTitle: 'Votre vitrine est prête.',
      storesNav: 'Boutiques',
      plansNav: 'Formules',
      merchantSpace: 'Espace gérant',
      footerSubtitle: 'Vitrines WhatsApp pour les commerçants.',
      footerDesignedBy: 'VitrineExpress, tous droits réservés.',
    },
    storefront: {
      searchPlaceholder: 'Rechercher un article...',
      allArticles: 'Tous les articles',
      inStock: 'En stock',
      restockingSoon: 'Bientôt dispo',
      restockingOn: 'Arrive le',
      discussWhatsApp: 'Discuter sur WhatsApp',
      orderWhatsApp: 'Commander sur WhatsApp',
      shareStore: 'Partager',
      linkCopied: 'Lien de la boutique copié !',
      qrModalTitle: 'Affiche de la boutique',
      qrModalDesc: 'Scannez pour ouvrir le catalogue de la boutique sur votre téléphone.',
      printPoster: 'Imprimer l’affiche',
      downloadPoster: 'Télécharger',
      noProductsFound: 'Aucun article trouvé pour cette recherche.',
      noProductsCategory: 'Aucun article dans cette catégorie pour le moment.',
      clearFilter: 'Réinitialiser les filtres',
      verifiedStore: 'Vitrine vérifiée',
      contactBtn: 'Contacter',
      callBtn: 'Appeler',
      viewProductDetails: 'Détails du produit',
      productDetails: 'Détails',
      close: 'Fermer',
      orderPrompt: 'Bonjour {storeName} ! J’ai vu cet article sur votre vitrine en ligne et je souhaite passer commande :',
      remainingDays: 'jours restants',
      addToCart: 'Ajouter au panier',
      cart: 'Mon panier',
      orderCart: 'Commander la sélection sur WhatsApp',
      clearCart: 'Vider le panier',
      cartEmpty: 'Votre panier est vide',
      cartItemsCount: 'articles',
      totalAmount: 'Total estimé',
    },
    merchant: {
      loginTitle: 'Espace professionnel sécurisé',
      loginSubtitle: 'Votre vitrine en ligne à portée de main. Entrez vos accès pour gérer vos articles et voir vos performances.',
      licenseKeyLabel: 'Nom de la boutique ou Numéro WhatsApp',
      licenseKeyPlaceholder: 'Ex : GLAMOUR SHOP ou 699112233',
      pinLabel: 'Code PIN secret',
      pinPlaceholder: 'Code à 4 à 6 chiffres',
      forgotPin: 'Code PIN oublié ?',
      forgotPinMessage: "Bonjour, j'ai oublié le code PIN de ma boutique{identifier}. Merci de m'aider à le réinitialiser.",
      loginBtn: 'Accéder à mon tableau de bord',
      loginLoading: 'Vérification de vos accès...',
      loginError: 'Identifiants invalides ou compte inactif.',
      dashboardTitle: 'Tableau de bord commerçant',
      quotaLabel: 'Quota d’articles',
      quotaWarning: 'Quota presque atteint ou plein',
      addProductBtn: 'Ajouter un article',
      manageCategoriesBtn: 'Gérer les catégories',
      myStoreBtn: 'Ma boutique',
      logoutBtn: 'Déconnexion',
      printQrBtn: 'Imprimer mon QR code',
      viewPublicStore: 'Voir ma vitrine publique',
      editProduct: 'Modifier',
      deleteProduct: 'Supprimer',
      deleteConfirm: 'Voulez-vous vraiment supprimer cet article ?',
      statusInStock: 'En stock',
      statusRestocking: 'En arrivage',
      searchProducts: 'Rechercher parmi mes articles...',
      noProductsYet: 'Aucun article pour le moment',
      noProductsYetDesc: 'Ajoutez votre premier produit en cliquant sur "Ajouter un article".',
    },
  },
  en: {
    nav: {
      home: 'Home',
      stores: 'Stores',
      merchantSpace: 'Merchant space',
      login: 'Sign in',
      admin: 'Admin',
      terms: 'Terms',
      privacy: 'Privacy',
      searchPlaceholder: 'Search for an item...',
      subTitle: 'Online storefronts',
    },
    register: {
      step1: 'Your store',
      step1Title: 'Name your storefront',
      step1Hint: 'This name appears on your public link and WhatsApp messages.',
      step2: 'Your contact',
      step2Title: 'Your WhatsApp number',
      step2Hint: 'This number receives your customers’ orders directly.',
      step3: 'Your location',
      step3Title: 'Where is your business?',
      step3Hint: 'Add your contact preference for support.',
      step4: 'Your access',
      step4Title: 'Create your secret PIN',
      step4Hint: '4 to 12 characters. It is shown only once.',
      step5: 'Your plan',
      step5Title: 'Choose your starting point',
      step5Hint: 'Start free, then upgrade whenever you want.',
      next: 'Continue',
      back: 'Back',
      creating: 'Creating your storefront...',
    },
    landing: {
      tagline: 'Local commerce, made digital',
      heroTitle: 'Your store,',
      heroHighlight: 'ready to be shared.',
      heroDescription: 'An elegant catalog, a simple link, and a scannable QR code. Your customers browse your items and reach you directly on WhatsApp, with no app install required.',
      featureNoApp: 'No app required',
      featureWhatsApp: 'WhatsApp orders',
      featureInstant: 'Instant updates',
      ctaCreateStore: 'Create my store on WhatsApp',
      ctaDiscover: 'Explore stores',
      ctaHasQr: 'I have a QR code',
      clientAccessTitle: 'Customer access',
      clientAccessHeading: 'Enter a store',
      scanQrBtn: 'Scan a QR code',
      scanQrSub: 'With camera or upload photo',
      or: 'or',
      pasteLinkPlaceholder: 'Paste a link or store name...',
      openStoreBtn: 'Open',
      invalidLinkError: 'This link does not belong to a VitrineExpress store. Please check the URL or QR code.',
      storeNotFound: 'Store not found or currently unavailable.',
      qrInvalid: 'This QR code does not link to a VitrineExpress store.',
      merchantCardTitle: 'Are you a shop owner?',
      merchantCardText: 'Manage your catalog, prices and upcoming stock arrivals.',
      merchantLoginBtn: 'Log in to my space',
      stepsSubtitle: 'Effortless for your clients',
      stepsTitle: 'One link, one catalog, one WhatsApp chat.',
      stepsDescription: 'No account needed, no app to download. Customers land right on your storefront and order where they already chat.',
      step1Title: 'Scan or open the link',
      step1Desc: 'The shop’s QR code leads straight to its live catalog.',
      step2Title: 'Browse products',
      step2Desc: 'Photos, prices, live availability and restock dates: clear at a glance.',
      step3Title: 'Order on WhatsApp',
      step3Desc: 'Like an item? The chat opens with the order message already written.',
      discoverTitle: 'Discover',
      onlineStoresHeading: 'Online stores',
      emptyStoresTitle: 'First storefronts coming soon',
      emptyStoresText: 'Are you a merchant? Sign in to your dashboard to publish your catalog.',
      ticketEyebrow: 'Online store',
      catalogLabel: 'Catalog',
      locationLabel: 'Location',
      itemsLabel: 'items',
      fallbackStoreName: 'Douala Store',
      storesOnline: '{count} stores online',
      readyMessage: 'The message is already ready.',
      searchStores: 'Search a store',
      viewStore: 'View store',
      onlineLabel: 'Online',
      fallbackDescription: 'Discover the items available in this store.',
      pricingEyebrow: 'Plans',
      pricingTitle: 'Start small, grow at your pace',
      pricingDescription: 'A free storefront to start, then more room as your catalog grows.',
      pricingNote: 'Promo codes: {codes}. Pro at {pro} and Premium at {premium} for the first year.',
      freeLabel: 'Free',
      perYear: 'per year',
      noTimeLimit: 'no time limit',
      upToItems: 'Up to {count} items',
      createStoreCta: 'Create my storefront',
      faqEyebrow: 'Common questions',
      faqTitle: 'What you ask most',
      faq: [
        {
          question: 'Do I need technical skills or a laptop?',
          answer: 'No. Everything happens on your phone: create the store, add photos, update prices, and download your QR poster.',
        },
        {
          question: 'Do you charge a commission on sales?',
          answer: 'Never. Customers send orders to your WhatsApp and settle payment directly with you.',
        },
        {
          question: 'How much does it cost to start?',
          answer: 'The Découverte plan is free up to {freeQuota} items. Pro costs {proPrice} per year and Premium {premiumPrice}.',
        },
      ],
      finalCtaTitle: 'Your storefront is ready.',
      storesNav: 'Stores',
      plansNav: 'Plans',
      merchantSpace: 'Merchant space',
      footerSubtitle: 'WhatsApp storefronts for local businesses.',
      footerDesignedBy: 'VitrineExpress, all rights reserved.',
    },
    storefront: {
      searchPlaceholder: 'Search for an item...',
      allArticles: 'All items',
      inStock: 'In stock',
      restockingSoon: 'Coming soon',
      restockingOn: 'Arriving on',
      discussWhatsApp: 'Chat on WhatsApp',
      orderWhatsApp: 'Order on WhatsApp',
      shareStore: 'Share',
      linkCopied: 'Store link copied to clipboard!',
      qrModalTitle: 'Store counter poster',
      qrModalDesc: 'Scan to open this catalog right on your smartphone.',
      printPoster: 'Print poster',
      downloadPoster: 'Download',
      noProductsFound: 'No items match your search.',
      noProductsCategory: 'No items in this category yet.',
      clearFilter: 'Reset filters',
      verifiedStore: 'Verified store',
      contactBtn: 'Contact',
      callBtn: 'Call',
      viewProductDetails: 'Product details',
      productDetails: 'Details',
      close: 'Close',
      orderPrompt: 'Hello {storeName}! I saw this item on your online storefront and I would like to place an order:',
      remainingDays: 'days left',
      addToCart: 'Add to cart',
      cart: 'My cart',
      orderCart: 'Order selection on WhatsApp',
      clearCart: 'Clear cart',
      cartEmpty: 'Your cart is empty',
      cartItemsCount: 'items',
      totalAmount: 'Estimated total',
    },
    merchant: {
      loginTitle: 'Secure Merchant Portal',
      loginSubtitle: 'Your online storefront at your fingertips. Enter your credentials to manage items and monitor activity.',
      licenseKeyLabel: 'Store name or WhatsApp number',
      licenseKeyPlaceholder: 'E.g.: GLAMOUR SHOP or 699112233',
      pinLabel: 'Secret PIN code',
      pinPlaceholder: '4 to 6-digit code',
      forgotPin: 'Forgot your PIN?',
      forgotPinMessage: "Hello, I forgot the PIN for my store{identifier}. Please help me reset it.",
      loginBtn: 'Access my dashboard',
      loginLoading: 'Checking credentials...',
      loginError: 'Invalid credentials or inactive store.',
      dashboardTitle: 'Merchant Dashboard',
      quotaLabel: 'Product quota',
      quotaWarning: 'Quota almost reached or full',
      addProductBtn: 'Add a product',
      manageCategoriesBtn: 'Manage categories',
      myStoreBtn: 'My store',
      logoutBtn: 'Sign out',
      printQrBtn: 'Print my QR code',
      viewPublicStore: 'View public storefront',
      editProduct: 'Edit',
      deleteProduct: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this item?',
      statusInStock: 'In stock',
      statusRestocking: 'Restocking',
      searchProducts: 'Search among my items...',
      noProductsYet: 'No items added yet',
      noProductsYetDesc: 'Add your first product by clicking "Add a product".',
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'vitrine_express_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (saved === 'fr' || saved === 'en') return saved;
      // Détecter la langue du navigateur
      const browserLang = navigator.language.slice(0, 2).toLowerCase();
      if (browserLang === 'en') return 'en';
    } catch {
      // Ignorer les erreurs d'accès localStorage
    }
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignorer
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
