import { json } from '../_lib/security';
import { normalizeAnalyticsEvent, recordAnalyticsEvent } from '../_lib/analytics';

interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Requête invalide' }, 400);
  }

  const event = normalizeAnalyticsEvent(body?.event);
  if (!event) {
    return json({ error: 'Événement inconnu' }, 400);
  }

  const recorded = await recordAnalyticsEvent(context.env.DB, event, {
    storeRef: body?.storeRef,
    campaign: body?.campaign,
  });

  return json({ success: true, recorded });
};
