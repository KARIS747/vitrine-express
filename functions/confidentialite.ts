import { serveAppShell } from './_lib/appShell';

export const onRequestGet = async (context: { request: Request; env: any }) =>
  serveAppShell(context, {
    title: 'Politique de confidentialité — VitrineExpress',
    description: 'Données collectées, finalités, sécurité et droits des utilisateurs VitrineExpress.',
    canonicalPath: '/confidentialite',
    type: 'website',
  });
