import React from 'react';
import { useLanguage } from '../utils/i18n';

type LegalKind = 'terms' | 'privacy';

interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

interface LegalPage {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
  contact: string;
}

const SUPPORT_URL = 'https://wa.me/237681610040';

export const LegalView: React.FC<{ kind: LegalKind; onGoHome: () => void }> = ({ kind, onGoHome }) => {
  const { language } = useLanguage();

  const pages: Record<'fr' | 'en', Record<LegalKind, LegalPage>> = {
    fr: {
      terms: {
        eyebrow: 'Informations légales',
        title: 'Conditions générales d’utilisation et de vente',
        intro:
          'Dernière mise à jour : 26 novembre 2026. Ces conditions régissent l’utilisation de VitrineExpress, service de vitrines en ligne connectées à WhatsApp.',
        sections: [
          {
            title: '1. Éditeur du service',
            paragraphs: [
              'VitrineExpress est un service numérique qui permet aux commerçants de créer une vitrine en ligne, d’y publier un catalogue et de recevoir des commandes directement sur WhatsApp. Pour toute question relative au service, contactez l’équipe VitrineExpress sur le numéro WhatsApp officiel : 237 681 61 00 40.',
            ],
          },
          {
            title: '2. Objet et fonctionnement',
            paragraphs: [
              'Le service met à disposition une page publique, un lien personnalisé, un code QR, un espace de gestion du catalogue et un outil de génération de messages WhatsApp. VitrineExpress agit comme intermédiaire technique : il ne stocke pas de paiement de client final et ne livre pas les produits.',
            ],
          },
          {
            title: '3. Création d’un espace marchand',
            paragraphs: [
              'L’accès à l’espace marchand se fait avec le nom de la boutique, le numéro WhatsApp ou la clé de licence, associés à un code PIN personnel de 4 à 6 chiffres. Le code PIN est haché côté serveur. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les actions réalisées depuis votre session.',
            ],
          },
          {
            title: '4. Formules et règlement',
            paragraphs: [
              'La formule Découverte est gratuite et limite le catalogue à 8 articles. Les formules Pro et Premium proposent respectivement 30 et 999 articles, moyennant un abonnement annuel. Les prix affichés au moment de la souscription font foi. Les codes promotionnels peuvent réduire la première année.',
              'Le règlement s’effectue manuellement auprès d’un conseiller VitrineExpress, par Orange Money, MTN MoMo ou tout autre moyen convenu. Aucun prélèvement automatique ni paiement par carte bancaire n’est appliqué. La formule payante est activée après validation du règlement par l’administration du service.',
            ],
          },
          {
            title: '5. Obligations du marchand',
            paragraphs: [
              'Vous vous engagez à fournir des informations exactes, à publier des produits dont vous êtes autorisé à disposer, à afficher des prix clairs et à respecter la législation en vigueur. Il est interdit d’utiliser le service pour diffuser du contenu illicite, trompeur, discriminatoire ou portant atteinte aux droits de tiers.',
            ],
          },
          {
            title: '6. Commandes et responsabilité',
            paragraphs: [
              'Les commandes sont envoyées par WhatsApp au commerçant. La négociation, le paiement, la livraison et le service après-vente relèvent exclusivement du commerçant et de son client. VitrineExpress ne peut être tenu responsable d’un litige commercial, d’un retard de livraison ou d’un produit défectueux.',
            ],
          },
          {
            title: '7. Propriété intellectuelle',
            paragraphs: [
              'Vous conservez la propriété des textes, photos et prix que vous publiez. Le code, la marque, les modèles graphiques et les outils de VitrineExpress restent la propriété du service. Toute reproduction non autorisée de ces éléments est interdite.',
            ],
          },
          {
            title: '8. Disponibilité et modifications',
            paragraphs: [
              'Le service est fourni dans le cadre d’une infrastructure Cloudflare et vise une disponibilité continue, sans garantie absolue. Des maintenances ou incidents peuvent interrompre temporairement l’accès. VitrineExpress peut faire évoluer les fonctionnalités et les présentes conditions ; la date de mise à jour figure en tête de page.',
            ],
          },
          {
            title: '9. Suspension et résiliation',
            paragraphs: [
              'Vous pouvez cesser d’utiliser le service à tout moment. VitrineExpress peut suspendre une boutique en cas d’usage frauduleux, de contenu illicite, de non-paiement d’une formule souscrite ou de risque pour la sécurité du service. Les données sont alors traitées conformément à la politique de confidentialité.',
            ],
          },
          {
            title: '10. Droit applicable et contact',
            paragraphs: [
              'Les présentes conditions sont soumises au droit camerounais. Pour toute question, une réclamation ou une demande de précision, écrivez à l’équipe VitrineExpress via le lien de contact ci-dessous.',
            ],
          },
        ],
        contact: 'Contacter l’équipe VitrineExpress sur WhatsApp',
      },
      privacy: {
        eyebrow: 'Protection des données',
        title: 'Politique de confidentialité',
        intro:
          'Dernière mise à jour : 26 novembre 2026. Cette politique explique quelles données sont traitées par VitrineExpress, pourquoi, et comment vous pouvez en disposer.',
        sections: [
          {
            title: '1. Données collectées',
            paragraphs: [
              'Nous traitons les informations que vous fournissez lors de la création et de la gestion de votre boutique : nom de la boutique, numéro WhatsApp, numéro d’appel, pays, ville, quartier, adresse e-mail si vous choisissez ce canal, photos et descriptions des produits, prix et disponibilités.',
              'Nous traitons également des données techniques et de gestion : adresse IP, type de navigateur, cookies de session, dates de connexion, formule souscrite, montants réglés ou dus, référence de paiement et notes internes saisies par l’administration.',
            ],
          },
          {
            title: '2. Finalités des traitements',
            paragraphs: [
              'Ces données servent à créer et héberger votre vitrine, à vous authentifier, à afficher votre catalogue aux visiteurs, à générer les messages WhatsApp de commande, à gérer les abonnements et les paiements, à prévenir les abus et à améliorer le service.',
            ],
          },
          {
            title: '3. Cookies et sessions',
            paragraphs: [
              'VitrineExpress utilise des cookies de session HttpOnly pour maintenir la connexion de l’espace marchand et de l’administration. Ces cookies sont nécessaires au fonctionnement du service. Aucun cookie publicitaire ni traceur tiers à des fins de ciblage n’est utilisé.',
            ],
          },
          {
            title: '4. Hébergement et sous-traitants',
            paragraphs: [
              'Le service est hébergé sur Cloudflare Pages, avec des fonctions serveur et une base de données D1. Les données sont accessibles uniquement aux composants techniques nécessaires au fonctionnement du service. Lorsqu’un visiteur clique sur « Commander sur WhatsApp », seules les informations choisies dans le message sont transmises à WhatsApp.',
            ],
          },
          {
            title: '5. Paiements',
            paragraphs: [
              'VitrineExpress ne collecte pas de numéro de carte bancaire et ne traite pas de paiement en ligne. Les règlements sont effectués hors plateforme via Orange Money, MTN MoMo ou tout autre moyen convenu avec un conseiller. Les références de transaction que vous transmettez sont conservées uniquement pour la gestion de votre licence.',
            ],
          },
          {
            title: '6. Sécurité',
            paragraphs: [
              'Les échanges se déroulent en HTTPS. Les codes PIN sont hachés avant stockage, les sessions peuvent être révoquées, en particulier lors d’un reset PIN, et les actions administratives sensibles font l’objet d’un journal d’audit interne sans secret. L’accès à la base de données est restreint.',
            ],
          },
          {
            title: '7. Conservation des données',
            paragraphs: [
              'Les données de boutique et de catalogue sont conservées tant que le service est utilisé. Les informations de licence et de paiement peuvent être conservées plus longtemps pour répondre à des obligations comptables et à des besoins de preuve. Vous pouvez demander la suppression de vos données via le contact ci-dessous.',
            ],
          },
          {
            title: '8. Vos droits',
            paragraphs: [
              'Selon la législation applicable, vous pouvez demander l’accès à vos données, leur rectification, leur suppression, leur portabilité ou vous opposer à certains traitements. Une demande peut être envoyée via WhatsApp ; une pièce d’identité pourra être demandée pour vérifier l’identité du demandeur.',
            ],
          },
          {
            title: '9. Mineurs',
            paragraphs: [
              'Le service s’adresse à des commerçants majeurs ou à des personnes disposant de l’autorité nécessaire pour publier un catalogue. Il n’est pas destiné aux mineurs.',
            ],
          },
          {
            title: '10. Modifications',
            paragraphs: [
              'Cette politique peut être mise à jour. La date de dernière modification figure en tête de page. Les changements importants seront portés à votre connaissance lorsque cela est raisonnablement possible.',
            ],
          },
        ],
        contact: 'Faire une demande de données sur WhatsApp',
      },
    },
    en: {
      terms: {
        eyebrow: 'Legal information',
        title: 'Terms of use and sale',
        intro:
          'Last updated: 26 November 2026. These terms govern the use of VitrineExpress, an online storefront service connected to WhatsApp.',
        sections: [
          {
            title: '1. Service provider',
            paragraphs: [
              'VitrineExpress is a digital service that lets merchants create an online storefront, publish a catalog, and receive orders directly on WhatsApp. For any question about the service, contact the VitrineExpress team on the official WhatsApp number: +237 681 61 00 40.',
            ],
          },
          {
            title: '2. Purpose and operation',
            paragraphs: [
              'The service provides a public page, a custom link, a QR code, a catalog management area, and a WhatsApp message generator. VitrineExpress acts as a technical intermediary: it does not store end-customer payments and does not deliver products.',
            ],
          },
          {
            title: '3. Merchant account',
            paragraphs: [
              'Merchant access uses the store name, WhatsApp number, or license key, together with a personal 4 to 6 digit PIN. The PIN is hashed server-side. You are responsible for keeping your credentials confidential and for all actions performed from your session.',
            ],
          },
          {
            title: '4. Plans and payment',
            paragraphs: [
              'The Découverte plan is free and limits the catalog to 8 items. The Pro and Premium plans offer 30 and 999 items respectively, through an annual subscription. The prices shown when subscribing apply. Promo codes may reduce the first year.',
              'Payment is made manually to a VitrineExpress advisor through Orange Money, MTN MoMo, or another agreed method. No automatic debit or card payment is applied. A paid plan is activated after the advisor validates the payment.',
            ],
          },
          {
            title: '5. Merchant obligations',
            paragraphs: [
              'You agree to provide accurate information, publish products you are authorized to sell, display clear prices, and comply with applicable law. The service must not be used to distribute unlawful, misleading, discriminatory, or infringing content.',
            ],
          },
          {
            title: '6. Orders and liability',
            paragraphs: [
              'Orders are sent to the merchant on WhatsApp. Negotiation, payment, delivery, and after-sales service are entirely between the merchant and the customer. VitrineExpress cannot be held liable for a commercial dispute, a delivery delay, or a defective product.',
            ],
          },
          {
            title: '7. Intellectual property',
            paragraphs: [
              'You keep ownership of the text, photos, and prices you publish. The code, brand, graphic templates, and tools of VitrineExpress remain the property of the service. Unauthorized reproduction of these elements is prohibited.',
            ],
          },
          {
            title: '8. Availability and changes',
            paragraphs: [
              'The service runs on Cloudflare infrastructure and aims for continuous availability, without absolute guarantee. Maintenance or incidents may temporarily interrupt access. VitrineExpress may evolve the features and these terms; the update date appears at the top of this page.',
            ],
          },
          {
            title: '9. Suspension and termination',
            paragraphs: [
              'You may stop using the service at any time. VitrineExpress may suspend a store for fraud, unlawful content, non-payment of a subscribed plan, or risk to service security. Data is then handled in accordance with the privacy policy.',
            ],
          },
          {
            title: '10. Governing law and contact',
            paragraphs: [
              'These terms are governed by Cameroonian law. For any question, complaint, or clarification, write to the VitrineExpress team using the contact link below.',
            ],
          },
        ],
        contact: 'Contact the VitrineExpress team on WhatsApp',
      },
      privacy: {
        eyebrow: 'Data protection',
        title: 'Privacy policy',
        intro:
          'Last updated: 26 November 2026. This policy explains what data VitrineExpress processes, why, and how you can exercise your rights.',
        sections: [
          {
            title: '1. Data collected',
            paragraphs: [
              'We process the information you provide when creating and managing your store: store name, WhatsApp number, call number, country, city, neighborhood, email address if you choose that channel, product photos and descriptions, prices, and availability.',
              'We also process technical and management data: IP address, browser type, session cookies, connection dates, subscribed plan, amounts paid or due, payment reference, and internal notes entered by the administrator.',
            ],
          },
          {
            title: '2. Purposes',
            paragraphs: [
              'This data is used to create and host your storefront, authenticate you, display your catalog to visitors, generate WhatsApp order messages, manage subscriptions and payments, prevent abuse, and improve the service.',
            ],
          },
          {
            title: '3. Cookies and sessions',
            paragraphs: [
              'VitrineExpress uses HttpOnly session cookies to keep the merchant and admin areas connected. These cookies are required for the service to work. No advertising cookies or third-party tracking cookies are used.',
            ],
          },
          {
            title: '4. Hosting and processors',
            paragraphs: [
              'The service is hosted on Cloudflare Pages, with server functions and a D1 database. Data is accessible only to the technical components required to operate the service. When a visitor clicks “Order on WhatsApp”, only the information included in the generated message is sent to WhatsApp.',
            ],
          },
          {
            title: '5. Payments',
            paragraphs: [
              'VitrineExpress does not collect card numbers and does not process online payments. Payments are made outside the platform through Orange Money, MTN MoMo, or another agreed method with an advisor. Transaction references you provide are kept only to manage your license.',
            ],
          },
          {
            title: '6. Security',
            paragraphs: [
              'Exchanges use HTTPS. PIN codes are hashed before storage, sessions can be revoked, especially after a PIN reset, and sensitive admin actions are recorded in an internal audit log without secrets. Database access is restricted.',
            ],
          },
          {
            title: '7. Data retention',
            paragraphs: [
              'Store and catalog data are kept while the service is in use. License and payment information may be kept longer for accounting and evidentiary purposes. You can request deletion of your data using the contact below.',
            ],
          },
          {
            title: '8. Your rights',
            paragraphs: [
              'Under applicable law, you may request access to your data, correction, deletion, portability, or object to certain processing. A request can be sent on WhatsApp; proof of identity may be requested to verify the requester.',
            ],
          },
          {
            title: '9. Minors',
            paragraphs: [
              'The service is intended for adult merchants or people with the authority to publish a catalog. It is not intended for minors.',
            ],
          },
          {
            title: '10. Changes',
            paragraphs: [
              'This policy may be updated. The last modification date appears at the top of the page. Significant changes will be communicated when reasonably possible.',
            ],
          },
        ],
        contact: 'Make a data request on WhatsApp',
      },
    },
  };

  const page = pages[language][kind];

  return (
    <main className="flex-1 bg-ledger-surface font-ledger text-ledger-ink">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-sm text-ledger-green">{page.eyebrow}</p>
        <h1 className="mt-3 font-registry text-3xl leading-tight tracking-[-0.02em] sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ledger-muted">{page.intro}</p>

        <div className="mt-10 border-t border-ledger-line">
          {page.sections.map((section) => (
            <section key={section.title} className="border-b border-ledger-line py-6">
              <h2 className="font-registry text-lg text-ledger-ink">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-ledger-muted">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items && (
                  <ul className="list-disc pl-5 space-y-1">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 rounded-md bg-ledger-green px-5 py-3 text-sm font-semibold text-ledger-surface transition-colors hover:bg-ledger-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
          >
            {page.contact}
          </a>
          <button
            type="button"
            onClick={onGoHome}
            className="min-h-11 rounded-md border border-ledger-line px-5 py-3 text-sm font-semibold text-ledger-ink transition-colors hover:border-ledger-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ledger-green"
          >
            {language === 'fr' ? 'Retour à l’accueil' : 'Back to home'}
          </button>
        </div>
      </div>
    </main>
  );
};
