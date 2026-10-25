import type { jsPDF as JsPdf } from 'jspdf';
import { Store } from '../types';
import { formatDate } from './formatters';
import { generateQRCodeDataUrl } from './qrCode';

interface StoreAccessSheetInput {
  store: Store;
  licenseKey: string;
  pinCode?: string | null;
  expiresAt?: string | null;
  storeUrl?: string;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK: [number, number, number] = [23, 30, 38];
const INK_SOFT: [number, number, number] = [71, 85, 105];
const MUTED: [number, number, number] = [120, 113, 108];
const BRAND: [number, number, number] = [5, 150, 105];
const BRAND_DARK: [number, number, number] = [4, 120, 87];
const BRAND_LIGHT: [number, number, number] = [167, 243, 208];
const WARM: [number, number, number] = [250, 247, 242];
const WARM_BORDER: [number, number, number] = [231, 229, 228];
const AMBER: [number, number, number] = [245, 158, 11];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [185, 28, 28];
const RED_BG: [number, number, number] = [254, 242, 242];
const RED_BORDER: [number, number, number] = [254, 202, 202];

const formatLongDate = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

const fitFontSize = (
  doc: JsPdf,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
) => {
  let size = startSize;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
};

const safeSlug = (slug: string) =>
  slug.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'boutique';

export async function downloadStoreAccessPdf(input: StoreAccessSheetInput): Promise<void> {
  const { store, licenseKey, pinCode, expiresAt } = input;
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://vitrine-express.pages.dev';
  const storeUrl = input.storeUrl ?? `${origin}/boutique/${store.slug}`;
  const merchantUrl = `${origin}/merchant`;
  const qrDataUrl = await generateQRCodeDataUrl(storeUrl, 512, '#171E26', '#FFFFFF');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const generatedAt = new Date();
  const expiryDate = formatDate(expiresAt ?? store.expires_at) || 'Non définie';
  const location = [store.city, store.quarter].filter(Boolean).join(' · ') || 'Cameroun';

  doc.setProperties({
    title: `Fiche d'accès - ${store.name}`,
    subject: 'Identifiants de la boutique VitrineExpress',
    author: 'VitrineExpress',
    creator: 'VitrineExpress',
  });

  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_WIDTH, 44, 'F');

  doc.setFillColor(...BRAND);
  doc.roundedRect(MARGIN, 14, 14, 14, 3.5, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text('V', MARGIN + 7, 23.5, { align: 'center' });

  doc.setFontSize(16);
  doc.text('VitrineExpress', MARGIN + 19, 22.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_LIGHT);
  doc.text('Boutiques Cameroun', MARGIN + 19, 28.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text("FICHE D'ACCÈS", PAGE_WIDTH - MARGIN, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...WHITE);
  doc.text(formatLongDate(generatedAt), PAGE_WIDTH - MARGIN, 24, { align: 'right' });
  doc.setTextColor(...BRAND_LIGHT);
  doc.setFontSize(7);
  doc.text('Document remis au commerçant', PAGE_WIDTH - MARGIN, 30, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND);
  doc.text("FICHE D'ACCÈS BOUTIQUE", MARGIN, 52);

  doc.setTextColor(...INK);
  fitFontSize(doc, store.name, CONTENT_WIDTH, 22, 14);
  doc.text(store.name, MARGIN, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK_SOFT);
  doc.text(location, MARGIN, 69);

  const linkY = 76;
  const linkH = 32;
  doc.setFillColor(...WARM);
  doc.setDrawColor(...WARM_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, linkY, CONTENT_WIDTH, linkH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('LIEN PUBLIC DE LA VITRINE', MARGIN + 5, linkY + 7);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(storeUrl, MARGIN + 5, linkY + 14, { maxWidth: 125 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_SOFT);
  doc.text('Partagez ce lien ou faites scanner le QR code par vos clients.', MARGIN + 5, linkY + 26);

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...WARM_BORDER);
  doc.roundedRect(PAGE_WIDTH - MARGIN - 31, linkY + 3, 28, 28, 2, 2, 'FD');
  doc.addImage(qrDataUrl, 'PNG', PAGE_WIDTH - MARGIN - 29.5, linkY + 4.5, 25, 25);

  const credLabelY = 117;
  const credY = 123;
  const credH = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND);
  doc.text('VOS IDENTIFIANTS', MARGIN, credLabelY);

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...WARM_BORDER);
  doc.roundedRect(MARGIN, credY, CONTENT_WIDTH, credH, 3, 3, 'FD');

  const leftX = MARGIN + 5;
  const rightX = MARGIN + 108;
  const rightW = CONTENT_WIDTH - 108 - 5;

  doc.setDrawColor(...WARM_BORDER);
  doc.line(MARGIN + 102, credY + 6, MARGIN + 102, credY + credH - 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text('CLÉ DE LICENCE', leftX, credY + 10);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(licenseKey || 'Non disponible', leftX, credY + 17, { maxWidth: 92 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text('ESPACE GÉRANT', leftX, credY + 29);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...INK);
  doc.text(merchantUrl, leftX, credY + 35, { maxWidth: 92 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text('EXPIRATION', leftX, credY + 47);

  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(expiryDate, leftX, credY + 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_SOFT);
  doc.text(`${store.max_products} articles inclus`, leftX + 43, credY + 53);

  doc.setFillColor(...WARM);
  doc.setDrawColor(...WARM_BORDER);
  doc.roundedRect(rightX, credY + 6, rightW, 46, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('CODE PIN', rightX + rightW / 2, credY + 13, { align: 'center' });

  if (pinCode) {
    doc.setFont('courier', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...BRAND_DARK);
    doc.text(pinCode, rightX + rightW / 2, credY + 30, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...INK_SOFT);
    doc.text('À conserver confidentiellement', rightX + rightW / 2, credY + 42, { align: 'center' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK_SOFT);
    doc.text('Non inclus', rightX + rightW / 2, credY + 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Régénérez le PIN depuis', rightX + rightW / 2, credY + 35, { align: 'center' });
    doc.text('le License Manager', rightX + rightW / 2, credY + 39, { align: 'center' });
  }

  const stepsLabelY = 191;
  const stepsY = 199;
  const stepGap = 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND);
  doc.text('POUR COMMENCER', MARGIN, stepsLabelY);

  const steps = [
    "Ouvrez l'espace gérant avec la clé de licence et le code PIN.",
    'Ajoutez vos produits, photos, prix et catégories.',
    'Partagez le lien public ou le QR code avec vos clients.',
    'Mettez à jour vos arrivages pour informer vos clients.',
  ];

  steps.forEach((step, index) => {
    const y = stepsY + index * stepGap;
    doc.setFillColor(...BRAND);
    doc.circle(MARGIN + 3.5, y - 1.2, 3.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...WHITE);
    doc.text(String(index + 1), MARGIN + 3.5, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(step, MARGIN + 11, y, { maxWidth: CONTENT_WIDTH - 12 });
  });

  const thankY = 237;
  const thankH = 26;
  doc.setFillColor(...WARM);
  doc.setDrawColor(...WARM_BORDER);
  doc.roundedRect(MARGIN, thankY, CONTENT_WIDTH, thankH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_DARK);
  doc.text('Merci de votre confiance', MARGIN + 5, thankY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_SOFT);
  doc.text(
    "Merci d'avoir choisi VitrineExpress pour faire rayonner votre boutique. Nous sommes heureux de vous accompagner dans la création de votre vitrine en ligne et de vous aider à vendre plus simplement sur WhatsApp. Toute l'équipe vous souhaite de belles ventes.",
    MARGIN + 5,
    thankY + 14.5,
    { maxWidth: CONTENT_WIDTH - 10 },
  );

  const confY = 270;
  const confH = 18;
  doc.setFillColor(...RED_BG);
  doc.setDrawColor(...RED_BORDER);
  doc.roundedRect(MARGIN, confY, CONTENT_WIDTH, confH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...RED);
  doc.text('DOCUMENT CONFIDENTIEL', MARGIN + 5, confY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...RED);
  doc.text(
    "Ce document contient les identifiants d'accès à votre boutique. Conservez-le en lieu sûr et ne le partagez pas. En cas de perte, générez un nouveau PIN depuis le License Manager.",
    MARGIN + 5,
    confY + 12,
    { maxWidth: CONTENT_WIDTH - 10 },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Généré le ${formatLongDate(generatedAt)} par VitrineExpress`,
    MARGIN,
    PAGE_HEIGHT - 4,
  );
  doc.text('vitrine-express.pages.dev', PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 4, { align: 'right' });

  doc.save(`acces-${safeSlug(store.slug)}.pdf`);
}
