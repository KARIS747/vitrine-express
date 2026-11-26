import { serveAppShell } from './_lib/appShell';

export const onRequestGet = async (context: { request: Request; env: any }) =>
  serveAppShell(context, {
    title: 'CGU/CGV — VitrineExpress',
    description: 'Conditions générales d’utilisation et de vente du service VitrineExpress.',
    canonicalPath: '/cgu-cgv',
    type: 'website',
  });
