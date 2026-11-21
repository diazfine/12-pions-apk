import React from 'react';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { getLegalTerms } from '../i18n/legalTerms';
import { Language } from '../types';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
  language?: Language;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
  language: propLang,
}) => {
  const { language: contextLang } = useTranslation();
  const activeLang = propLang || contextLang || 'FR';
  const lt = getLegalTerms(activeLang);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md select-none animate-fade-in"
    >
      <div className="w-full max-w-lg bg-gradient-to-b from-[#06241a] via-[#041a12] to-[#02100a] border-2 border-amber-400/70 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.3)] flex flex-col max-h-[88vh] text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 id="terms-modal-title" className="text-base font-black text-amber-300 tracking-wide flex items-center gap-1.5">
                <span>{lt.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  {lt.studioName}
                </span>
              </h3>
              <p className="text-[10px] font-bold text-gray-400">
                {lt.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={lt.closeBtn}
            aria-label={lt.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 text-xs text-gray-300 leading-relaxed custom-scrollbar">
          {/* Studio Banner */}
          <div className="p-3 rounded-2xl bg-black/50 border border-amber-500/30 flex items-center gap-3">
            <img
              src="/publisher-logo.jpg"
              alt="SG"
              className="w-10 h-10 object-contain rounded-lg border border-amber-400/40 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-black text-amber-300 tracking-wider">{lt.studioName}</span>
              <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-wider">
                {lt.officialPublisher}
              </span>
              <span className="text-[9px] text-gray-400">
                {lt.certifiedApp}
              </span>
            </div>
          </div>

          {/* Section 1 */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <h4 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">1</span>
              {lt.sec1Title}
            </h4>
            <p className="text-[11px] text-gray-300">
              {lt.sec1Body}
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <h4 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">2</span>
              {lt.sec2Title}
            </h4>
            <p className="text-[11px] text-gray-300">
              {lt.sec2Body}
            </p>
            <ul className="list-disc list-inside text-[11px] text-gray-300 pl-1 space-y-0.5">
              <li>{lt.sec2Item1}</li>
              <li>{lt.sec2Item2}</li>
              <li>{lt.sec2Item3}</li>
            </ul>
            <p className="text-[11px] text-emerald-400 font-semibold pt-0.5">
              {lt.sec2Guarantee}
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <h4 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">3</span>
              {lt.sec3Title}
            </h4>
            <ul className="list-disc list-inside text-[11px] text-gray-300 pl-1 space-y-0.5">
              <li>{lt.sec3Item1}</li>
              <li>{lt.sec3Item2}</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <h4 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">4</span>
              {lt.sec4Title}
            </h4>
            <p className="text-[11px] text-gray-300">
              {lt.sec4Body}
            </p>
            <ul className="list-disc list-inside text-[11px] text-gray-300 pl-1 space-y-0.5">
              <li>{lt.sec4Item1}</li>
              <li>{lt.sec4Item2}</li>
            </ul>
            <p className="text-[11px] text-rose-300">
              {lt.sec4Warning}
            </p>
          </div>

          {/* Section 5 */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <h4 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">5</span>
              {lt.sec5Title}
            </h4>
            <p className="text-[11px] text-gray-300">
              {lt.sec5Body}
            </p>
          </div>

          {/* Section 6 */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <h4 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">6</span>
              {lt.sec6Title}
            </h4>
            <p className="text-[11px] text-gray-300">
              {lt.sec6Body}
            </p>
          </div>

          {/* Section 7 */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <h4 className="font-black text-amber-300 text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">7</span>
              {lt.sec7Title}
            </h4>
            <p className="text-[11px] text-gray-300">
              {lt.sec7Body}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-amber-500/20 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-300 transition-colors cursor-pointer"
          >
            {lt.closeBtn}
          </button>
          {showAcceptButton && onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lt.acceptBtn}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
