import React from 'react';
import { MoveHistoryItem } from '../types';
import { History, Swords } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface MoveHistoryBarProps {
  history: MoveHistoryItem[];
  turnCount: number;
}

export const MoveHistoryBar: React.FC<MoveHistoryBarProps> = ({ history, turnCount }) => {
  const { t, formatNumber } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest move
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [history.length]);

  if (history.length === 0) {
    return (
      <div className="w-full max-w-[370px] sm:max-w-[420px] bg-[#041a12]/90 border border-amber-500/20 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-amber-400/80" />
          <span>{t('moveHistoryTitle', 'Move History')}</span>
        </div>
        <span className="text-[10px] text-gray-400">{t('moveStep1', 'Move 1')}</span>
      </div>
    );
  }

  const capCount = history.filter(h => h.isCap).length;

  return (
    <div className="w-full max-w-[370px] sm:max-w-[420px] bg-[#041a12]/95 border border-amber-500/25 rounded-xl px-3 py-2 flex flex-col gap-1 shadow-md">
      <div className="flex items-center justify-between text-[10px] font-bold text-amber-400/90 border-b border-amber-500/15 pb-1">
        <div className="flex items-center gap-1.5">
          <History className="w-3 h-3 text-amber-400" />
          <span>
            {t('moveHistoryCount', `HISTORY (${formatNumber(turnCount)} moves)`).replace('{count}', formatNumber(turnCount))}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <Swords className="w-3 h-3 text-amber-400/70" />
          <span>
            {t('capturesCount', `${formatNumber(capCount)} captures`).replace('{count}', formatNumber(capCount))}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent text-xs whitespace-nowrap"
      >
        {history.map((m, idx) => {
          const isGreen = m.color === 'green';
          return (
            <div
              key={m.id}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold transition-all ${
                idx === history.length - 1
                  ? 'bg-amber-500/20 border-amber-400/80 text-amber-300 shadow-sm'
                  : 'bg-[#062a1e] border-amber-500/15 text-gray-300'
              }`}
            >
              <span className="text-[9px] text-gray-500 font-sans">{formatNumber(idx + 1)}.</span>
              <span className={isGreen ? 'text-emerald-400' : 'text-rose-400'}>
                {isGreen ? '🟢' : '🔴'}
              </span>
              <span>
                {m.from} {m.isCap ? '×' : '→'} {m.to}
              </span>
              {m.isPromo && <span className="text-amber-400 text-xs">★</span>}
              {m.isCap && m.capCount && m.capCount > 1 && (
                <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded font-sans">
                  +{formatNumber(m.capCount)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
