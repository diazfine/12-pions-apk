import React, { useState } from 'react';
import { Translations } from '../utils/translations';
import { ChevronDown, ArrowLeft, Target, Footprints, Swords, Crown, Sparkles } from 'lucide-react';

interface RulesScreenProps {
  t: Translations;
  onBack: () => void;
  onPlay: () => void;
}

export const RulesScreen: React.FC<RulesScreenProps> = ({ t, onBack, onPlay }) => {
  const [openSection, setOpenSection] = useState<number | null>(0);

  const sections = [
    {
      title: t.objective,
      icon: <Target className="w-5 h-5 text-amber-400" />,
      items: [t.objectiveText1, t.objectiveText2],
    },
    {
      title: t.moving,
      icon: <Footprints className="w-5 h-5 text-emerald-400" />,
      items: [t.movingText1, t.movingText2, t.movingText3],
    },
    {
      title: t.captures,
      icon: <Swords className="w-5 h-5 text-rose-400" />,
      items: [t.capturesText1, t.capturesText2, t.capturesText3, t.capturesText4],
      tip: t.capturesTip,
    },
    {
      title: t.queen,
      icon: <Crown className="w-5 h-5 text-amber-300" />,
      items: [t.queenText1, t.queenText2, t.queenText3],
    },
  ];

  return (
    <div className="w-full max-w-[480px] flex flex-col gap-4 py-2 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-[#052118] px-3 py-1.5 rounded-lg border border-amber-500/30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.home}</span>
        </button>
        <h2 className="text-lg font-black text-amber-400 tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          <span>{t.rules.toUpperCase()}</span>
        </h2>
        <div className="w-16"></div>
      </div>

      {/* Accordion List */}
      <div className="flex flex-col gap-2.5">
        {sections.map((sec, idx) => {
          const isOpen = openSection === idx;
          return (
            <div
              key={idx}
              className="bg-[#06241a] border border-amber-500/30 rounded-xl overflow-hidden transition-all duration-200 shadow-md"
            >
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-3.5 text-left bg-[#083124] hover:bg-[#0b3e2d] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {sec.icon}
                  <span className="text-sm font-bold text-[#f0e6c8]">{sec.title}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-amber-400/80 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="p-3.5 flex flex-col gap-2 bg-[#041a12] border-t border-amber-500/20">
                  {sec.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>
                      <span>{item}</span>
                    </div>
                  ))}
                  {sec.title === t.captures && (
                    <div className="mt-1 p-2.5 rounded-lg bg-emerald-950/70 border border-amber-400/40 text-[11px] text-amber-300 leading-relaxed">
                      ✨ {t.noImmediateReturnRule || 'Règle du non-retour immédiat : Lors d’une multi-capture en chaîne, il est interdit de faire demi-tour à 180° sur le même axe. On doit capturer perpendiculairement avant de pouvoir repartir.'}
                    </div>
                  )}
                  {sec.tip && (
                    <div className="mt-1 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-medium">
                      {sec.tip}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Big Action Button */}
      <button
        type="button"
        onClick={onPlay}
        className="w-full py-3 mt-2 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-300 active:scale-98 transition-all"
      >
        {t.letsPlay}
      </button>
    </div>
  );
};
