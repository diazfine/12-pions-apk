import React, { useState } from 'react';
import { MessageSquare, Smile, X } from 'lucide-react';
import { PieceColor } from '../types';
import { useTranslation } from '../i18n/useTranslation';

export const IN_GAME_CHAT_ITEMS: { key: string; defaultText: string }[] = [
  { key: 'inGameChat_01', defaultText: 'Hi!' },
  { key: 'inGameChat_02', defaultText: 'Hello!' },
  { key: 'inGameChat_03', defaultText: 'Play Fast!' },
  { key: 'inGameChat_04', defaultText: 'Okay!' },
  { key: 'inGameChat_05', defaultText: 'Please add me as Buddy!' },
  { key: 'inGameChat_06', defaultText: 'Trap Me If You Can!' },
  { key: 'inGameChat_07', defaultText: 'I have to go. Bye!' },
  { key: 'inGameChat_08', defaultText: 'I will let you win!' },
  { key: 'inGameChat_09', defaultText: 'Like my picture?' },
  { key: 'inGameChat_10', defaultText: 'You should give up!' },
  { key: 'inGameChat_11', defaultText: 'I am going to win!' },
  { key: 'inGameChat_12', defaultText: 'Dare you to play me again!' },
  { key: 'inGameChat_13', defaultText: 'I am 12 PIONS!' },
  { key: 'inGameChat_14', defaultText: 'I am the king!' },
  { key: 'inGameChat_15', defaultText: 'I need to go, Sorry!' },
  { key: 'inGameChat_16', defaultText: "Don't run away!" },
  { key: 'inGameChat_17', defaultText: 'Some Urgent work, Bye!' },
  { key: 'inGameChat_18', defaultText: 'Game is Not Over yet!' },
  { key: 'inGameChat_19', defaultText: "You can't beat me!" },
  { key: 'inGameChat_20', defaultText: 'Bye! Bye!' },
  { key: 'inGameChat_21', defaultText: 'Hahahaha!' },
  { key: 'inGameChat_22', defaultText: 'Today is My Day!' },
  { key: 'inGameChat_23', defaultText: 'All the best!' },
  { key: 'inGameChat_24', defaultText: 'I am the best!' },
  { key: 'inGameChat_25', defaultText: 'Boom Boom' },
  { key: 'inGameChat_26', defaultText: 'Yeah!' },
  { key: 'inGameChat_27', defaultText: 'Oops!' },
  { key: 'inGameChat_28', defaultText: 'OMG' },
  { key: 'inGameChat_29', defaultText: 'LOL' },
];

export const QUICK_REACTIONS = ['😂', '😎', '😡', '👏', '🎯', '🔥', '👑', '😱', '💪', '🤔', '🙌', '💀'];

export interface ActiveInGameChatBubble {
  text: string;
  senderName: string;
  color?: PieceColor;
  from?: 'me' | 'opponent';
}

interface GameChatOverlayProps {
  onSendQuickPhrase: (phraseKey: string, localizedText: string) => void;
  onSendEmoji: (emoji: string) => void;
  activeChatBubble?: ActiveInGameChatBubble | null;
}

export const GameChatOverlay: React.FC<GameChatOverlayProps> = ({
  onSendQuickPhrase,
  onSendEmoji,
  activeChatBubble,
}) => {
  const { t } = useTranslation();
  const [openPanel, setOpenPanel] = useState<'phrases' | 'emojis' | null>(null);

  const handleSelectPhrase = (item: { key: string; defaultText: string }) => {
    const localizedText = t(item.key, item.defaultText);
    onSendQuickPhrase(item.key, localizedText);
    setOpenPanel(null);
  };

  const handleSelectEmoji = (emoji: string) => {
    onSendEmoji(emoji);
    setOpenPanel(null);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-1.5 pt-0.5 select-none">
      {/* Floating Incoming/Outgoing Quick Phrase Bubble */}
      {activeChatBubble && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in max-w-[90vw]`}
        >
          <div
            className={`px-4 py-2 rounded-2xl border-2 shadow-[0_10px_28px_rgba(0,0,0,0.85)] flex items-center gap-2 backdrop-blur-md ${
              activeChatBubble.from === 'me'
                ? 'bg-gradient-to-r from-amber-500/95 to-amber-600/95 border-amber-200 text-slate-950'
                : 'bg-gradient-to-b from-[#0a3828]/95 to-[#041a12]/95 border-amber-400 text-amber-200'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
              {activeChatBubble.senderName}:
            </span>
            <span className="text-xs sm:text-sm font-black">{activeChatBubble.text}</span>
          </div>
        </div>
      )}

      {/* Compact Two-Icon Inline Bar (Lowest element on the game screen) */}
      <div className="flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === 'phrases' ? null : 'phrases')}
          className={`w-9 h-9 rounded-full border transition-all active:scale-90 flex items-center justify-center shadow-md cursor-pointer ${
            openPanel === 'phrases'
              ? 'bg-amber-400 border-amber-200 text-slate-950'
              : 'bg-[#052118]/95 hover:bg-[#0b3b2b] border-amber-500/45 text-amber-300 hover:text-amber-200'
          }`}
          title={t('quickMessagesTitle', 'Messages rapides')}
          aria-label={t('quickMessagesTitle', 'Messages rapides')}
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === 'emojis' ? null : 'emojis')}
          className={`w-9 h-9 rounded-full border transition-all active:scale-90 flex items-center justify-center shadow-md cursor-pointer ${
            openPanel === 'emojis'
              ? 'bg-amber-400 border-amber-200 text-slate-950'
              : 'bg-[#052118]/95 hover:bg-[#0b3b2b] border-amber-500/45 text-amber-300 hover:text-amber-200'
          }`}
          title={t('emojiReactionsTitle', 'Émojis')}
          aria-label={t('emojiReactionsTitle', 'Émojis')}
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {/* PANEL 1: 29 INDEPENDENT QUICK-CHAT BUTTONS */}
      {openPanel === 'phrases' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/30 animate-fade-in"
          onClick={() => setOpenPanel(null)}
        >
          <div
            className="w-full max-w-sm bg-[#041d15]/78 backdrop-blur-md border-2 border-amber-400/75 rounded-3xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.7),0_0_25px_rgba(245,197,24,0.18)] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/25">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider drop-shadow-sm">
                  {t('quickMessagesTitle', 'Messages rapides')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-gray-200 hover:text-white cursor-pointer"
                aria-label={t('close', 'Fermer')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
              {IN_GAME_CHAT_ITEMS.map((item) => {
                const label = t(item.key, item.defaultText);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectPhrase(item)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-[#02120c]/60 hover:bg-amber-400/25 active:bg-amber-400/35 border border-amber-500/25 hover:border-amber-400/70 text-left text-xs font-bold text-white hover:text-amber-200 transition-all flex items-center justify-between cursor-pointer drop-shadow-sm"
                  >
                    <span>{label}</span>
                    <span className="text-amber-400/75 text-[10px]">↵</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: EMOJI REACTIONS GRID */}
      {openPanel === 'emojis' && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/30 animate-fade-in"
          onClick={() => setOpenPanel(null)}
        >
          <div
            className="w-full max-w-xs bg-[#041d15]/78 backdrop-blur-md border-2 border-amber-400/75 rounded-3xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.7),0_0_25px_rgba(245,197,24,0.18)] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/25">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center">
                  <Smile className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider drop-shadow-sm">
                  {t('emojiReactionsTitle', 'Émojis')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-gray-200 hover:text-white cursor-pointer"
                aria-label={t('close', 'Fermer')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 py-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className="h-12 rounded-2xl bg-[#02120c]/60 hover:bg-amber-400/25 border border-amber-500/25 hover:border-amber-400 flex items-center justify-center text-2xl transition-transform active:scale-125 shadow-sm cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
