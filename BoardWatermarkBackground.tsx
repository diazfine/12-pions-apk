import React from 'react';

/**
 * Renders the 12 Pions board watermark in the background with low opacity,
 * tilted and repeating like in the Ludo King wallpaper screenshot.
 */
export const BoardWatermarkBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Deep Royal Emerald & Imperial Obsidian Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#06241a] via-[#041d15] to-[#02130e]" />

      {/* Subtle radial emerald-gold glow in the center behind the logo & buttons */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Repeating 12 Pions Board Watermarks at Low Opacity */}
      {/* Board 1: Top Left, rotated */}
      <div
        className="absolute -top-16 -left-20 w-80 h-80 opacity-[0.11] transform -rotate-12"
        style={{ filter: 'brightness(1.15)' }}
      >
        <BoardSVG />
      </div>

      {/* Board 2: Top Right, rotated */}
      <div
        className="absolute -top-10 -right-24 w-88 h-88 opacity-[0.10] transform rotate-15"
        style={{ filter: 'brightness(1.15)' }}
      >
        <BoardSVG />
      </div>

      {/* Board 3: Center Background, large, low opacity (5x5 grid with star and diagonal lines) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] opacity-[0.08] transform rotate-6"
        style={{ filter: 'brightness(1.2)' }}
      >
        <BoardSVG />
      </div>

      {/* Board 4: Bottom Left, rotated */}
      <div
        className="absolute -bottom-16 -left-20 w-84 h-84 opacity-[0.10] transform rotate-12"
        style={{ filter: 'brightness(1.15)' }}
      >
        <BoardSVG />
      </div>

      {/* Board 5: Bottom Right, rotated */}
      <div
        className="absolute -bottom-10 -right-16 w-80 h-80 opacity-[0.11] transform -rotate-15"
        style={{ filter: 'brightness(1.15)' }}
      >
        <BoardSVG />
      </div>

      {/* Star sparkles overlay */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffd54f_1px,transparent_1px)] [background-size:24px_24px]" />
    </div>
  );
};

/**
 * Vector representation of the 12 Pions (Dama) 5x5 board:
 * Features golden borders, 5x5 cells, the center black star, and the initial 12 green + 12 red pieces
 */
const BoardSVG: React.FC = () => {
  return (
    <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-xl" fill="none">
      {/* Outer Golden Border */}
      <rect
        x="6"
        y="6"
        width="288"
        height="288"
        rx="18"
        stroke="#ffd54f"
        strokeWidth="6"
        fill="#072b20"
      />
      <rect
        x="16"
        y="16"
        width="268"
        height="268"
        rx="12"
        stroke="#f59e0b"
        strokeWidth="3"
        fill="#052118"
      />

      {/* 5x5 Grid Cells */}
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 5 }).map((__, c) => {
          const x = 24 + c * 50.4;
          const y = 24 + r * 50.4;
          const isCenter = r === 2 && c === 2;
          const isGreen = r < 2 || (r === 2 && c < 2);
          const isRed = r > 2 || (r === 2 && c > 2);

          return (
            <g key={`${r}-${c}`}>
              {/* Cell background & border */}
              <rect
                x={x}
                y={y}
                width="48"
                height="48"
                rx="4"
                fill="#0a3224"
                stroke="#ffd54f"
                strokeWidth="1.5"
                strokeOpacity="0.7"
              />

              {/* Diagonal connecting lines */}
              {(r + c) % 2 === 0 && (
                <line
                  x1={x + 4}
                  y1={y + 4}
                  x2={x + 44}
                  y2={y + 44}
                  stroke="#ffd54f"
                  strokeWidth="0.8"
                  strokeOpacity="0.4"
                />
              )}
              {Math.abs(r - c) % 2 === 0 && (
                <line
                  x1={x + 44}
                  y1={y + 4}
                  x2={x + 4}
                  y2={y + 44}
                  stroke="#ffd54f"
                  strokeWidth="0.8"
                  strokeOpacity="0.4"
                />
              )}

              {/* Center Black Star */}
              {isCenter && (
                <polygon
                  points={`${x + 24},${y + 10} ${x + 28},${y + 20} ${x + 38},${y + 20} ${x + 30},${y + 26} ${x + 33},${y + 36} ${x + 24},${y + 30} ${x + 15},${y + 36} ${x + 18},${y + 26} ${x + 10},${y + 20} ${x + 20},${y + 20}`}
                  fill="#ffd54f"
                />
              )}

              {/* Green piece */}
              {isGreen && (
                <circle
                  cx={x + 24}
                  cy={y + 24}
                  r="16"
                  fill="#10b981"
                  stroke="#ffd54f"
                  strokeWidth="1.5"
                />
              )}

              {/* Red piece */}
              {isRed && (
                <circle
                  cx={x + 24}
                  cy={y + 24}
                  r="16"
                  fill="#ef4444"
                  stroke="#ffd54f"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })
      )}
    </svg>
  );
};
