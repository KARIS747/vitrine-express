import React from 'react';
import { InAppNotification } from '../types';
import { formatDate } from '../utils/formatters';
import {
  Bell,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  X,
  ExternalLink,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
}) => {
  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      case 'tip':
        return <Lightbulb className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-800 shadow-elevated overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ink-150 dark:border-ink-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-950 dark:text-white">
                Centre de notifications
              </h2>
              <p className="text-[11px] text-ink-500 dark:text-ink-400">
                Informations, conseils et alertes pour votre boutique
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tout marquer comme lu</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-white hover:bg-warm-100 dark:hover:bg-ink-800 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-8 h-8 text-ink-300 dark:text-ink-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-ink-700 dark:text-ink-300">
                Aucune notification pour le moment
              </p>
              <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-0.5">
                Vous recevrez ici les annonces, conseils de vente et alertes de votre vitrine.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) onMarkAsRead(notif.id);
                }}
                className={`p-3.5 rounded-xl border transition-all text-left relative ${
                  notif.isRead
                    ? 'bg-white dark:bg-ink-900 border-ink-150 dark:border-ink-800 opacity-80'
                    : 'bg-warm-50/70 dark:bg-ink-850 border-brand-200 dark:border-brand-800/80 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {getTypeIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-xs font-bold text-ink-950 dark:text-white truncate">
                        {notif.title}
                      </h3>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-300 leading-relaxed whitespace-pre-line">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-ink-100 dark:border-ink-800 text-[10px] text-ink-400">
                      <span>{formatDate(notif.createdAt)}</span>
                      {notif.linkUrl && (
                        <a
                          href={notif.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline font-medium"
                        >
                          <span>En savoir plus</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
