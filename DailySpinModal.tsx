import React, { useState } from 'react';
import { X, Gift, Coins, Sparkles, Check } from 'lucide-react';
import { useTranslation } from '../i18n';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';

interface DailySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimReward: (coins: number) => void;
  canSpin: boolean;
  lastSpinDate?: string;
  userCoins?: number;
}

const SEGMENTS = [
  { value: 100, color: '#B45309', textCol: '#FEF3C7' },
  { value: 500, color: '#15803D', textCol: '#DCFCE7' },
  { value: 250, color: '#1D4ED8', textCol: '#DBEAFE' },
  { value: 1000, color: '#7E22CE', textCol: '#F3E8FF' },
  { value: 200, color: '#B91C1C', textCol: '#FEE2E2' },
  { value: 2500, color: '#C2410C', textCol: '#FFEDD5' },
  { value: 300, color: '#047857', textCol: '#D1FAE5' },
  { value: 5000, color: '#EAB308', textCol: '#422006', isJackpot: true },
];

export const DailySpinModal: React.FC<DailySpinModalProps> = ({
  isOpen,
  onClose,
  onClaimReward,
  canSpin,
  userCoins,
}) => {
  const { t, formatNumber } = useTranslation();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<number | null>(null);

  React.useEffect(() => {
    return () => {
      sound.stopWheelSpin();
    };
  }, []);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (spinning || !canSpin || wonReward !== null) return;
    setSpinning(true);
    // 🔊 Son mécanique de rotation progressif (tic-tac réaliste contre les picots qui ralentit progressivement)
    sound.playWheelSpin(4200);

    // Pick segment with probability weighting (5000 is rarest)
    const rand = Math.random();
    let chosenIdx = 0;
    if (rand < 0.35) chosenIdx = 0; // 100
    else if (rand < 0.60) chosenIdx = 4; // 200
    else if (rand < 0.75) chosenIdx = 2; // 250
    else if (rand < 0.85) chosenIdx = 6; // 300
    else if (rand < 0.93) chosenIdx = 1; // 500
    else if (rand < 0.97) chosenIdx = 3; // 1000
    else if (rand < 0.99) chosenIdx = 5; // 2500
    else chosenIdx = 7; // 5000 (Jackpot)

    const segmentAngle = 360 / SEGMENTS.length;
    // Target pointer is at TOP (270 deg or 90 deg depending on circle orientation)
    // Slices are drawn starting from 0 deg (right, 3 o'clock)
    // To land on index i at top (270 deg), we rotate:
    const targetSegmentCenter = chosenIdx * segmentAngle + segmentAngle / 2;
    const finalRotAngle = 360 * 5 + (270 - targetSegmentCenter);

    setRotation(finalRotAngle);

    setTimeout(() => {
      setSpinning(false);
      const reward = SEGMENTS[chosenIdx].value;
      setWonReward(reward);

      // 🪙 Son immersif de pluie de pièces d'or (cascades métalliques successives)
      sound.playCoins();
      setTimeout(() => sound.playCoins(), 320);
      setTimeout(() => sound.playCoins(), 680);

      // 🪙 Animation de pièces d'or circulaires dorées (remplace tout ruban par des pièces d'or pures)
      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.55 },
          shapes: ['circle'],
          colors: ['#FFD700', '#F59E0B', '#FBBF24', '#FFE082', '#D97706'],
          scalar: 1.6,
          gravity: 1.25,
          ticks: 240,
        });
      } catch {}

      onClaimReward(reward);
    }, 4200);
  };

  const handleClose = () => {
    if (spinning) return;
    sound.stopWheelSpin();
    setWonReward(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wheel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-[#06241a] via-[#041a12] to-[#02100b] border-2 border-amber-400/80 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.9)] text-center relative flex flex-col items-center gap-3.5 overflow-hidden">
        {/* Glow corner accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-tr-full pointer-events-none" />

        {/* 🪙 Pluie animée de Pièces d'Or lorsque le gain est attribué */}
        {wonReward !== null && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
            {Array.from({ length: 24 }).map((_, i) => {
              const left = (i * 4.3 + (i % 3) * 2.5) % 92 + 4;
              const delay = (i * 0.11) % 1.5;
              const dur = 1.6 + ((i * 0.17) % 0.8);
              const size = 18 + (i % 4) * 4;
              return (
                <div
                  key={i}
                  className="absolute animate-coin-drop"
                  style={{
                    left: `${left}%`,
                    top: '-25px',
                    fontSize: `${size}px`,
                    animationDuration: `${dur}s`,
                    animationDelay: `${delay}s`,
                    animationIterationCount: 'infinite',
                    filter: 'drop-shadow(0 2px 6px rgba(245,197,24,0.75))',
                  }}
                >
                  🪙
                </div>
              );
            })}
          </div>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label={t.close || 'Close'}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 border-2 border-white shadow-md flex items-center justify-center text-slate-950">
            <Gift className="w-5 h-5 fill-current" />
          </div>
          <h3 id="wheel-modal-title" className="text-base font-black text-amber-300 uppercase tracking-wide">
            {t('fortuneWheel', t('spinWheelBonusTitle', 'Fortune Wheel'))}
          </h3>
        </div>

        {/* Live Coins Balance Pill */}
        <div className="flex items-center gap-2 bg-[#041a12]/90 border border-amber-400/60 px-3 py-1 rounded-full shadow-inner">
          <span className="text-xs">🪙</span>
          <span className="text-xs font-black text-amber-300 font-mono">
            {formatNumber(userCoins ?? 0)} {t('gold', 'Coins')}
          </span>
        </div>

        <p className="text-xs text-amber-200/80 -mt-1 leading-tight">
          {canSpin
            ? t('spinWheelDesc', 'Spin the wheel every day to win free gold coins!')
            : t('alreadySpunToday', '✓ Already spun today!')}
        </p>

        {/* 3D WHEEL CONTAINER */}
        <div className="relative w-64 h-64 my-0.5 flex items-center justify-center">
          {/* Wheel Indicator Pointer (Top Pin) */}
          <div className="absolute -top-3 z-30 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
            <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-200 -mt-1 shadow-sm" />
          </div>

          {/* Golden Bezel Rim */}
          <div className="w-full h-full rounded-full p-2.5 bg-gradient-to-b from-amber-300 via-amber-600 to-amber-800 shadow-[0_8px_25px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-amber-300/60 flex items-center justify-center">
            {/* Inner Wheel that rotates */}
            <div
              className="w-full h-full rounded-full relative overflow-hidden shadow-inner transition-transform"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? '4200ms' : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.25, 1)',
              }}
            >
              {/* SVG Wheel Segments */}
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {SEGMENTS.map((seg, idx) => {
                  const angle = 360 / SEGMENTS.length;
                  const startAngle = idx * angle;
                  const endAngle = startAngle + angle;
                  const rad1 = (startAngle * Math.PI) / 180;
                  const rad2 = (endAngle * Math.PI) / 180;
                  const x1 = 100 + 100 * Math.cos(rad1);
                  const y1 = 100 + 100 * Math.sin(rad1);
                  const x2 = 100 + 100 * Math.cos(rad2);
                  const y2 = 100 + 100 * Math.sin(rad2);

                  const midAngle = startAngle + angle / 2;
                  const textRad = (midAngle * Math.PI) / 180;
                  const tx = 100 + 64 * Math.cos(textRad);
                  const ty = 100 + 64 * Math.sin(textRad);

                  const labelStr = seg.isJackpot
                    ? `★ ${formatNumber(seg.value)}`
                    : formatNumber(seg.value);

                  return (
                    <g key={idx}>
                      <path
                        d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                        fill={seg.color}
                        stroke="#F5C518"
                        strokeWidth="1.5"
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill={seg.textCol}
                        fontSize={seg.isJackpot ? '9' : '10'}
                        fontWeight="900"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                      >
                        {labelStr}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Center Golden Core */}
              <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 border-2 border-amber-100 shadow-[0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-950 fill-amber-950" />
              </div>
            </div>
          </div>
        </div>

        {/* REWARD CELEBRATION */}
        {wonReward !== null && (
          <div className="bg-emerald-950/90 border-2 border-emerald-400 rounded-2xl py-2.5 px-4 flex items-center justify-center gap-2 animate-bounce-in shadow-[0_0_20px_rgba(52,211,153,0.4)]">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
            <span className="text-sm font-black text-emerald-300">
              +{formatNumber(wonReward)} {t('gold', 'Coins')} {t('victory', 'WIN!')}
            </span>
          </div>
        )}

        {/* SPIN OR CLAIM BUTTONS */}
        <div className="w-full flex flex-col gap-2">
          {canSpin && wonReward === null ? (
            <button
              type="button"
              disabled={spinning}
              onClick={handleSpin}
              className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all ${
                !spinning
                  ? 'bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 text-slate-950 cursor-pointer shadow-[0_6px_20px_rgba(245,197,24,0.45)]'
                  : 'bg-gray-800/80 border border-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>
                {spinning
                  ? (t.wheelSpinning || 'Spinning...')
                  : (t.spinWheelBtn || 'Spin Wheel!')}
              </span>
            </button>
          ) : wonReward !== null ? (
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_6px_20px_rgba(245,197,24,0.45)] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Coins className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>{t.collectAndClose || t.receiveBtn || 'Claim coins'}</span>
              </button>
              <div className="w-full py-2.5 px-3 rounded-xl bg-[#041a12] border border-amber-500/30 flex flex-col items-center gap-1 shadow-inner">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.alreadySpunToday || '✓ Already claimed today!'}</span>
                </div>
                <span className="text-[10px] text-amber-200/80 text-center font-medium">
                  {t.comeBackTomorrow || 'Come back tomorrow for a new free spin!'}
                </span>
                <span className="text-[9px] text-amber-400/90 text-center font-bold mt-0.5 bg-black/40 px-2 py-0.5 rounded-full border border-amber-400/20">
                  {t.spinMonetizedNotice || '🎬 Additional spins coming with monetization!'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2">
              <div className="w-full py-3 px-4 rounded-2xl bg-[#041a12] border border-amber-500/40 flex flex-col items-center gap-1 shadow-inner">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm">
                  <Check className="w-4 h-4" />
                  <span>{t.alreadySpunToday || '✓ Already claimed today!'}</span>
                </div>
                <span className="text-[10px] text-amber-200/80 text-center font-medium">
                  {t.comeBackTomorrow || 'Come back tomorrow for a new free spin!'}
                </span>
                <span className="text-[9px] text-amber-400/90 text-center font-bold mt-0.5 bg-black/40 px-2 py-0.5 rounded-full border border-amber-400/20">
                  {t.spinMonetizedNotice || '🎬 Additional spins coming with monetization!'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 rounded-xl text-xs font-bold text-amber-200/90 hover:text-white bg-white/10 hover:bg-white/15 border border-amber-400/30 transition-colors cursor-pointer"
              >
                {t.close || 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
