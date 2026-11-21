import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { NotificationCenterModal } from '../NotificationCenterModal';
import { InAppNotification } from '../../types';

describe('Frontend Component: NotificationCenterModal', () => {
  const dummyNotifs: InAppNotification[] = [
    {
      id: 'notif_1',
      title: 'Mise à jour importante',
      message: 'Votre catalogue WhatsApp est désormais plus rapide',
      type: 'info',
      createdAt: '2026-11-21T10:00:00.000Z',
      isRead: false,
    },
    {
      id: 'notif_2',
      title: 'Conseil de vente',
      message: 'Partagez vos nouveautés le samedi',
      type: 'tip',
      linkUrl: 'https://vitrine-express.pages.dev/guide',
      createdAt: '2026-11-20T10:00:00.000Z',
      isRead: true,
    },
  ];

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <NotificationCenterModal
        isOpen={false}
        onClose={() => {}}
        notifications={dummyNotifs}
        onMarkAllAsRead={() => {}}
        onMarkAsRead={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('renders empty state message when notifications array is empty', () => {
    const html = renderToString(
      <NotificationCenterModal
        isOpen={true}
        onClose={() => {}}
        notifications={[]}
        onMarkAllAsRead={() => {}}
        onMarkAsRead={() => {}}
      />
    );

    expect(html).toContain('Centre de notifications');
    expect(html).toContain('Aucune notification pour le moment');
  });

  it('renders notification items, badges and link when open with notifications', () => {
    const html = renderToString(
      <NotificationCenterModal
        isOpen={true}
        onClose={() => {}}
        notifications={dummyNotifs}
        onMarkAllAsRead={() => {}}
        onMarkAsRead={() => {}}
      />
    );

    expect(html).toContain('Centre de notifications');
    expect(html).toContain('Mise à jour importante');
    expect(html).toContain('Votre catalogue WhatsApp est désormais plus rapide');
    expect(html).toContain('Conseil de vente');
    expect(html).toContain('Tout marquer comme lu');
    expect(html).toContain('En savoir plus');
  });
});
