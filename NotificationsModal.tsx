import React, { useState } from 'react';
import { Bell, X, CheckCheck, Trash2, ArrowRight, RotateCw, Sparkles, Check } from 'lucide-react';
import { NotificationItem } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead?: (id: string) => void;
  onRefresh?: () => void;
  onClearAll: () => void;
  onNotificationAction: (actionTarget?: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onRefresh,
  onClearAll,
  onNotificationAction,
}) => {
  const { t, language, formatNumber } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const getTranslatedTitle = (notif: NotificationItem) => {
    if (notif.id.includes('welcome') || notif.title === 'notifWelcomeTitle') {
      return `👑 ${t('notifWelcomeTitle', 'Bienvenue sur 12 PIONS')}`;
    }
    if (notif.id.includes('multiplayer') || notif.id.includes('real_chat') || notif.title === 'notifMultiplayerTitle') {
      return `🌐 ${t('notifMultiplayerTitle', 'Multijoueur & Messagerie entre Amis')}`;
    }
    if (notif.id.includes('roadmap') || notif.id.includes('notes') || notif.title === 'notifRoadmapTitle') {
      return `🚀 ${t('notifRoadmapTitle', 'Notes de Futures Mises à Jour')}`;
    }
    if (notif.id.includes('tactic') || notif.title === 'notifTacticTitle') {
      return `🎯 ${t('notifTacticTitle', 'Conseil Tactique des Maîtres')}`;
    }
    return t(notif.title, notif.title);
  };

  const getTranslatedMessage = (notif: NotificationItem) => {
    if (notif.id.includes('welcome') || notif.message === 'notifWelcomeDesc') {
      return t(
        'notifWelcomeDesc',
        'Plateforme officielle 12 PIONS : découvrez les règles traditionnelles et affrontez des passionnés du monde entier.'
      );
    }
    if (notif.id.includes('multiplayer') || notif.id.includes('real_chat') || notif.message === 'notifMultiplayerDesc') {
      return t(
        'notifMultiplayerDesc',
        'Discutez en direct avec vos amis, partagez vos salons privés et lancez des défis instantanés !'
      );
    }
    if (notif.id.includes('roadmap') || notif.id.includes('notes') || notif.message === 'notifRoadmapDesc') {
      return t(
        'notifRoadmapDesc',
        'Prochaines fonctionnalités en développement : ligues compétitives, personnalisation avancée des pions et classements certifiés.'
      );
    }
    if (notif.id.includes('tactic') || notif.message === 'notifTacticDesc') {
      return t(
        'notifTacticDesc',
        'Contrôlez les diagonales centrales pour forcer les prises multiples de l’adversaire.'
      );
    }
    return t(notif.message, notif.message);
  };

  const getTranslatedActionLabel = (notif: NotificationItem) => {
    if (notif.actionTarget === 'friends' || notif.actionLabel === 'chat') {
      return t('chat', 'Chat');
    }
    if (notif.actionTarget === 'online' || notif.actionLabel === 'play') {
      return t('play', 'Jouer');
    }
    return t(notif.actionLabel || 'consult', 'Consulter');
  };

  const formatTimestamp = (ts: string) => {
    if (ts === 'today' || ts.includes('Aujourd') || ts.includes('Today')) {
      return t('today', 'Aujourd’hui');
    }
    if (ts === 'justNow' || ts.includes('instant') || ts.includes('Just') || ts.includes('now')) {
      return t('justNow', 'À l’instant');
    }
    if (ts.includes('min')) {
      const match = ts.match(/\d+/);
      const minVal = match ? formatNumber(match[0]) : '';
      if (language === 'AR') {
        return `منذ ${minVal} د`;
      }
      return language === 'FR' ? `Il y a ${minVal} min` : `${minVal} min ${t('minutesAgo', 'ago')}`.trim();
    }
    if (ts.includes('heure') || ts.includes('hour') || ts.includes('h')) {
      const match = ts.match(/\d+/);
      const hVal = match ? formatNumber(match[0]) : '';
      if (language === 'AR') {
        return `منذ ${hVal} س`;
      }
      return language === 'FR' ? `Il y a ${hVal} h` : `${hVal} h ${t('hoursAgo', 'ago')}`.trim();
    }
    return t(ts, ts);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#093526] via-[#052319] to-[#02130e] border-2 border-amber-400/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,197,24,0.3)] flex flex-col max-h-[85vh] overflow-hidden text-[#f0e6c8]">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#041d14] via-[#083b2a] to-[#041d14] border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                  {formatNumber(unreadCount)}
                </span>
              )}
            </div>
            <div>
              <h2 id="notifications-modal-title" className="text-sm font-black text-amber-300 uppercase tracking-wider">
                {t('notificationsTitle', 'Notifications Royales')}
              </h2>
              <p className="text-[10px] text-amber-200/70">
                {unreadCount > 0
                  ? `${formatNumber(unreadCount)} ${t('notificationsUnread', 'non lues')}`
                  : (t('notificationsInboxUpToDate', 'Boîte de réception à jour'))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 transition-all cursor-pointer disabled:opacity-50"
              title={t('refreshNotifications', 'Actualiser les notifications')}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-400/30 transition-colors cursor-pointer"
                title={t('notificationsMarkAllRead', 'Tout marquer comme lu')}
              >
                <CheckCheck className="w-3 h-3" />
                <span className="hidden xs:inline">{t('notificationsMarkAllRead', 'Tout lire')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close', 'Fermer')}
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-3 overflow-y-auto space-y-2.5 flex-1">
          {notifications.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-600 opacity-50" />
              {t('notificationsEmpty', 'Aucune notification pour le moment.')}
            </div>
          ) : (
            notifications.map((notif) => {
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead && onMarkAsRead) {
                      onMarkAsRead(notif.id);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    !notif.isRead
                      ? 'bg-gradient-to-r from-[#0d3f2e] to-[#082a1e] border-amber-400/70 shadow-md ring-1 ring-amber-400/30'
                      : 'bg-black/25 border-white/5 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-lg shrink-0">
                      {notif.icon || '🔔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="text-xs font-bold text-amber-200 truncate">
                            {getTranslatedTitle(notif)}
                          </h4>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 shrink-0 font-mono">
                          {formatTimestamp(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-snug mb-2">
                        {getTranslatedMessage(notif)}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        {notif.actionLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notif.isRead && onMarkAsRead) {
                                onMarkAsRead(notif.id);
                              }
                              onNotificationAction(notif.actionTarget);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                          >
                            <span>{getTranslatedActionLabel(notif)}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMarkAsRead) {
                                onMarkAsRead(notif.id);
                              }
                            }}
                            className="text-[9px] text-amber-300/80 hover:text-amber-200 flex items-center gap-1 ml-auto"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>{t('markAsRead', 'Marquer lu')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 bg-gradient-to-r from-[#041d14] to-[#041d14] border-t border-amber-500/30 flex items-center justify-between text-[11px]">
            <span className="text-gray-400 text-[10px]">
              {t('officialSystem', 'Système officiel 12 PIONS')}
            </span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-rose-400/80 hover:text-rose-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t('notificationsClearAll', 'Effacer tout')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
