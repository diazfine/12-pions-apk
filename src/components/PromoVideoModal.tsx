import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Sparkles,
  Share2,
  Copy,
  Check,
  Video,
  Clapperboard,
  Film,
} from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { copyTextSafely, getPublicAppUrl } from '../utils/serverConfig';

interface PromoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

// Generated cinematic visual assets
const AD_BOARD_IMG = '/src/assets/images/ad_board_cinematic_1790974875310.jpg';
const AD_DUEL_IMG = '/src/assets/images/ad_players_duel_1790974886422.jpg';
const AD_QUEEN_IMG = '/src/assets/images/ad_queen_crowning_1790974897832.jpg';
const LOGO_IMG = '/logo-du-jeu.png';
const PUBLISHER_IMG = '/publisher-logo.png';

const TOTAL_DURATION_SEC = 27; // 27 seconds high-impact commercial trailer

export const PromoVideoModal: React.FC<PromoVideoModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  // Audio synthesis context ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Loaded images cache
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Animation frame request ID
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Preload images
  useEffect(() => {
    const urls = [AD_BOARD_IMG, AD_DUEL_IMG, AD_QUEEN_IMG, LOGO_IMG, PUBLISHER_IMG];
    urls.forEach((src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        loadedImagesRef.current[src] = img;
      };
    });
  }, []);

  // Web Audio Music & Sound Effects synthesizer for the commercial trailer
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      audioDestRef.current = dest;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // Play synthetic cinematic sound effects matched to video beats
  const playSfx = useCallback((type: 'boom' | 'whoosh' | 'crack' | 'horn' | 'chime' | 'combo') => {
    if (isMuted || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const destNode = audioDestRef.current || ctx.destination;

      if (type === 'boom') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.9);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (audioDestRef.current) gain.connect(audioDestRef.current);
        osc.start(now);
        osc.stop(now + 0.9);
      } else if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (audioDestRef.current) gain.connect(audioDestRef.current);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'crack') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (audioDestRef.current) gain.connect(audioDestRef.current);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'horn') {
        [220, 277.18, 329.63, 440].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0.2, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          if (audioDestRef.current) gain.connect(audioDestRef.current);
          osc.start(now + i * 0.05);
          osc.stop(now + 1.2);
        });
      } else if (type === 'chime') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.35, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          if (audioDestRef.current) gain.connect(audioDestRef.current);
          osc.start(now + i * 0.08);
          osc.stop(now + 0.8);
        });
      } else if (type === 'combo') {
        [330, 440, 554, 660, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.3, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
          osc.connect(gain);
          gain.connect(ctx.destination);
          if (audioDestRef.current) gain.connect(audioDestRef.current);
          osc.start(now + i * 0.06);
          osc.stop(now + 0.9);
        });
      }
    } catch {
      // Audio stream fallback
    }
  }, [isMuted]);

  // Track scene trigger sounds
  const lastTriggeredSec = useRef<number>(-1);
  useEffect(() => {
    const sec = Math.floor(currentTime);
    if (sec !== lastTriggeredSec.current) {
      lastTriggeredSec.current = sec;
      if (sec === 0) playSfx('horn');
      else if (sec === 4) playSfx('whoosh');
      else if (sec === 8) playSfx('boom');
      else if (sec === 10) playSfx('crack');
      else if (sec === 12) playSfx('combo');
      else if (sec === 14) playSfx('chime');
      else if (sec === 18) playSfx('whoosh');
      else if (sec === 23) playSfx('horn');
    }
  }, [currentTime, playSfx]);

  // Main Render Frame onto Canvas
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // Background gradient: Deep royal emerald and cosmic dark green
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#021810');
    bgGrad.addColorStop(0.5, '#052b1e');
    bgGrad.addColorStop(1, '#01120b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Dynamic glowing floating particles
    const particleCount = 28;
    for (let i = 0; i < particleCount; i++) {
      const px = ((Math.sin(time * 0.5 + i * 1.3) + 1) / 2) * width;
      const py = ((Math.cos(time * 0.4 + i * 1.7) + 1) / 2) * height;
      const radius = 2 + (i % 3) * 1.5;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(245, 197, 24, 0.45)' : 'rgba(52, 211, 153, 0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#f59e0b';
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Helper: Draw text with golden stroke and drop shadow
    const drawGoldenText = (
      text: string,
      x: number,
      y: number,
      fontSize: number,
      weight: string = '900',
      align: CanvasTextAlign = 'center'
    ) => {
      ctx.save();
      ctx.font = `${weight} ${fontSize}px sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';

      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Golden gradient
      const grad = ctx.createLinearGradient(x - 150, y - fontSize / 2, x + 150, y + fontSize / 2);
      grad.addColorStop(0, '#ffe57f');
      grad.addColorStop(0.5, '#f5c518');
      grad.addColorStop(1, '#d48806');
      ctx.fillStyle = grad;
      ctx.fillText(text, x, y);

      // Subtle stroke
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#5a3e00';
      ctx.strokeText(text, x, y);
      ctx.restore();
    };

    // Helper: Draw image with Ken Burns slow zoom effect
    const drawCoverImage = (img: HTMLImageElement, zoomFactor: number = 1.0) => {
      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;
      let drawW = width * zoomFactor;
      let drawH = height * zoomFactor;

      if (imgAspect > canvasAspect) {
        drawW = height * imgAspect * zoomFactor;
      } else {
        drawH = (width / imgAspect) * zoomFactor;
      }

      const dx = (width - drawW) / 2;
      const dy = (height - drawH) / 2;
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();

      // Cinematic dark vignette overlay
      const vig = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.3,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);
    };

    // Helper: Draw animated 5x5 board in canvas
    const drawMiniAnimatedBoard = (cx: number, cy: number, size: number, phaseTime: number) => {
      ctx.save();
      ctx.translate(cx, cy);

      // Golden outer rim
      ctx.fillStyle = '#b7791f';
      ctx.beginPath();
      ctx.roundRect(-size / 2 - 8, -size / 2 - 8, size + 16, size + 16, 12);
      ctx.fill();

      // Board background
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 8);
      ctx.fill();

      // Grid lines
      const cellSize = size / 5;
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.strokeRect(-size / 2 + c * cellSize, -size / 2 + r * cellSize, cellSize, cellSize);
        }
      }

      // Animated jumping piece demo
      const jumpProgress = (phaseTime % 2.5) / 2.5; // 0 to 1
      const isJumping = jumpProgress < 0.6;
      const jumpT = jumpProgress / 0.6;

      // Green piece jumping from (1, 2) over Red piece (2, 2) to (3, 2)
      const startX = -size / 2 + 2 * cellSize + cellSize / 2;
      const startY = -size / 2 + 1 * cellSize + cellSize / 2;
      const endY = -size / 2 + 3 * cellSize + cellSize / 2;

      let pieceX = startX;
      let pieceY = isJumping ? startY + (endY - startY) * jumpT : endY;
      let pieceScale = isJumping ? 1 + Math.sin(jumpT * Math.PI) * 0.4 : 1;

      // Draw red piece (opponent) at (2,2)
      if (jumpProgress < 0.35) {
        ctx.beginPath();
        ctx.arc(-size / 2 + 2 * cellSize + cellSize / 2, -size / 2 + 2 * cellSize + cellSize / 2, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Capture explosion ring
        const expT = (jumpProgress - 0.35) / 0.35;
        if (expT < 1) {
          ctx.beginPath();
          ctx.arc(
            -size / 2 + 2 * cellSize + cellSize / 2,
            -size / 2 + 2 * cellSize + cellSize / 2,
            cellSize * (0.3 + expT * 0.6),
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = `rgba(245, 158, 11, ${1 - expT})`;
          ctx.lineWidth = 4 * (1 - expT);
          ctx.stroke();
        }
      }

      // Draw jumping green piece
      ctx.save();
      ctx.translate(pieceX, pieceY);
      ctx.scale(pieceScale, pieceScale);
      ctx.beginPath();
      ctx.arc(0, 0, cellSize * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = '#16a34a';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    // ─── SCENE DISPATCHER BASED ON CURRENT TIME ───
    if (time < 4.5) {
      // ════════════════════════════════════════════════
      // SCENE 1: L'HÉRITAGE ROYAL & LE TITRE DU JEU
      // ════════════════════════════════════════════════
      const sceneT = time;
      const zoom = 1 + sceneT * 0.03;

      // Background image if loaded
      const boardImg = loadedImagesRef.current[AD_BOARD_IMG];
      if (boardImg) drawCoverImage(boardImg, zoom);

      // Official Logo
      const logoImg = loadedImagesRef.current[LOGO_IMG];
      if (logoImg) {
        const logoSize = Math.min(width * 0.32, 160);
        const logoY = height * 0.28;
        ctx.save();
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#f59e0b';
        ctx.drawImage(logoImg, width / 2 - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
        ctx.restore();
      }

      // Title & Punchlines
      const titleScale = Math.min(1, sceneT * 2);
      ctx.save();
      ctx.translate(width / 2, height * 0.52);
      ctx.scale(titleScale, titleScale);
      drawGoldenText('12 PIONS', 0, 0, width > 600 ? 54 : 38);
      ctx.restore();

      drawGoldenText(t('promoCanvasSubtitle', 'JEU DE STRATÉGIE ROYAL'), width / 2, height * 0.61, width > 600 ? 20 : 15, '800');

      ctx.font = '600 13px sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'center';
      ctx.fillText(t('promoCanvasTagline', 'LE GRAND CLASSIQUE AFRICAIN RÉINVENTÉ'), width / 2, height * 0.67);

      // Crown Icon / Badge
      ctx.font = '32px sans-serif';
      ctx.fillText('👑', width / 2, height * 0.16);
    } else if (time < 9.0) {
      // ════════════════════════════════════════════════
      // SCENE 2: L'ÉCHIQUIER ET LES PIONS SACRÉS
      // ════════════════════════════════════════════════
      const sceneT = time - 4.5;
      const boardImg = loadedImagesRef.current[AD_BOARD_IMG];
      if (boardImg) drawCoverImage(boardImg, 1.05 + sceneT * 0.04);

      // Animated banner tag
      ctx.fillStyle = 'rgba(4, 30, 20, 0.88)';
      ctx.beginPath();
      ctx.roundRect(width * 0.1, height * 0.16, width * 0.8, 50, 16);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      drawGoldenText(t('promoCanvasGrid5x5', 'GRILLE ROYALE 5x5'), width / 2, height * 0.19, width > 600 ? 24 : 18);

      // Floating token showcase
      const miniBoardSize = Math.min(width * 0.65, height * 0.35, 230);
      drawMiniAnimatedBoard(width / 2, height * 0.48, miniBoardSize, sceneT);

      // Features badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.roundRect(width * 0.08, height * 0.72, width * 0.84, 75, 14);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      drawGoldenText(t('promoCanvasPawns24', '24 PIONS · VERT & ROUGE'), width / 2, height * 0.75, width > 600 ? 18 : 14);
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(t('promoCanvasCaptureGoal', 'Capturez tous les pions ou encerclez le Roi !'), width / 2, height * 0.8);
    } else if (time < 14.0) {
      // ════════════════════════════════════════════════
      // SCENE 3: GAMEPLAY CHOC & PIÈGES TACTIQUES
      // ════════════════════════════════════════════════
      const sceneT = time - 9.0;
      const duelImg = loadedImagesRef.current[AD_DUEL_IMG];
      if (duelImg) drawCoverImage(duelImg, 1.0 + sceneT * 0.03);

      // Dynamic combat header
      drawGoldenText(t('promoCanvasMultiTitle', 'PIÈGES & MULTI-PRISES'), width / 2, height * 0.17, width > 600 ? 28 : 20);

      ctx.font = '700 13px sans-serif';
      ctx.fillStyle = '#fca5a5';
      ctx.textAlign = 'center';
      ctx.fillText(t('promoCanvasMultiSub', '⚡ Tendez vos pièges · Enchaînez les sauts !'), width / 2, height * 0.23);

      // Interactive jumping demonstration
      const demoBoardSize = Math.min(width * 0.62, height * 0.32, 220);
      drawMiniAnimatedBoard(width / 2, height * 0.46, demoBoardSize, sceneT * 1.5);

      // Combo banner popup
      const comboScale = 1 + Math.sin(sceneT * 4) * 0.08;
      ctx.save();
      ctx.translate(width / 2, height * 0.74);
      ctx.scale(comboScale, comboScale);

      ctx.fillStyle = 'rgba(225, 29, 72, 0.95)';
      ctx.beginPath();
      ctx.roundRect(-width * 0.4, -22, width * 0.8, 44, 22);
      ctx.fill();
      ctx.strokeStyle = '#ffe4e6';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '900 16px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(t('promoCanvasCombo', '🔥 COMBO EXPLOSIF x3 !'), 0, 0);
      ctx.restore();

      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(t('promoCanvasRule', 'Règle authentique : 100% Stratégie Pure !'), width / 2, height * 0.84);
    } else if (time < 18.5) {
      // ════════════════════════════════════════════════
      // SCENE 4: LE SACRE DE LA REINE (DAME)
      // ════════════════════════════════════════════════
      const sceneT = time - 14.0;
      const queenImg = loadedImagesRef.current[AD_QUEEN_IMG];
      if (queenImg) drawCoverImage(queenImg, 1.0 + sceneT * 0.03);

      // Golden sunburst rays in background
      ctx.save();
      ctx.translate(width / 2, height * 0.42);
      ctx.rotate(sceneT * 0.3);
      for (let r = 0; r < 12; r++) {
        ctx.rotate((Math.PI * 2) / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, 300);
        ctx.lineTo(20, 300);
        ctx.closePath();
        ctx.fillStyle = 'rgba(245, 197, 24, 0.08)';
        ctx.fill();
      }
      ctx.restore();

      drawGoldenText(t('promoCanvasQueenCrown', 'LE SACRE DE LA DAME'), width / 2, height * 0.16, width > 600 ? 28 : 20);

      // Crown icon pulsing
      ctx.font = `${40 + Math.sin(sceneT * 5) * 4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('👑', width / 2, height * 0.4);

      // Queen banner
      ctx.fillStyle = 'rgba(5, 33, 24, 0.9)';
      ctx.beginPath();
      ctx.roundRect(width * 0.08, height * 0.68, width * 0.84, 80, 16);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      drawGoldenText(t('promoCanvasQueenTitle', 'PUISSANCE ILLIMITÉE'), width / 2, height * 0.72, width > 600 ? 20 : 15);
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText(t('promoCanvasQueenSub', 'Déplacements & sauts dans toutes les directions !'), width / 2, height * 0.78);
    } else if (time < 23.5) {
      // ════════════════════════════════════════════════
      // SCENE 5: MULTIJOUEUR MONDIAL & TOURNOIS
      // ════════════════════════════════════════════════
      const sceneT = time - 18.5;
      const duelImg = loadedImagesRef.current[AD_DUEL_IMG];
      if (duelImg) drawCoverImage(duelImg, 1.05 + sceneT * 0.02);

      drawGoldenText(t('promoCanvasArenaTitle', 'ARÈNE MONDIALE & EN LIGNE'), width / 2, height * 0.16, width > 600 ? 26 : 18);

      // Country flags parade
      const flags = '🇸🇳 🇲🇱 🇨🇮 🇬🇳 🇫🇷 🇺🇸 🇧🇷 🇩🇿 🇲🇦 🌍';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(flags, width / 2, height * 0.24);

      // Match modes card list
      const modes = [
        { label: t('promoCanvasTournBadge', '🏆 TOURNOIS À ÉLIMINATION DIRECTE'), icon: '⚡' },
        { label: t('promoCanvasFriendBadge', '👥 DÉFI EN DIRECT AVEC TES AMIS'), icon: '🎮' },
        { label: t('promoCanvasAiTactical', '🤖 INTELLIGENCE ARTIFICIELLE TACTIQUE'), icon: '🧠' },
      ];

      modes.forEach((m, idx) => {
        const itemY = height * 0.36 + idx * (height * 0.12);
        ctx.fillStyle = 'rgba(6, 36, 26, 0.92)';
        ctx.beginPath();
        ctx.roundRect(width * 0.08, itemY, width * 0.84, height * 0.09, 12);
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '700 12px sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(`${m.icon} ${m.label}`, width / 2, itemY + (height * 0.09) / 2);
      });

      // Active player count badge
      ctx.font = '800 13px sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText(t('promoCanvasPlayersOnline', '🟢 +50 000 Joueurs Connectés Chaque Jour'), width / 2, height * 0.78);
    } else {
      // ════════════════════════════════════════════════
      // SCENE 6: CALL TO ACTION FINAL (TÉLÉCHARGEMENT)
      // ════════════════════════════════════════════════
      const sceneT = time - 23.5;

      // Dark emerald luxury backdrop
      const ctaGrad = ctx.createLinearGradient(0, 0, width, height);
      ctaGrad.addColorStop(0, '#042217');
      ctaGrad.addColorStop(0.5, '#073a27');
      ctaGrad.addColorStop(1, '#02150e');
      ctx.fillStyle = ctaGrad;
      ctx.fillRect(0, 0, width, height);

      // Logo
      const logoImg = loadedImagesRef.current[LOGO_IMG];
      if (logoImg) {
        const logoSize = Math.min(width * 0.32, 140);
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f59e0b';
        ctx.drawImage(logoImg, width / 2 - logoSize / 2, height * 0.2 - logoSize / 2, logoSize, logoSize);
        ctx.restore();
      }

      drawGoldenText('12 PIONS', width / 2, height * 0.35, width > 600 ? 48 : 34);
      drawGoldenText(t('promoCanvasSubtitle', 'JEU DE STRATÉGIE ROYAL'), width / 2, height * 0.42, width > 600 ? 18 : 13, '800');

      // 5 Stars rating
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText(t('promoCanvasRating', '⭐⭐⭐⭐⭐ 4.9/5 · Recommandé'), width / 2, height * 0.48);

      // Big Glowing CTA Button
      const btnW = width * 0.82;
      const btnH = 54;
      const btnY = height * 0.58;

      const btnGrad = ctx.createLinearGradient(width / 2 - btnW / 2, btnY, width / 2 + btnW / 2, btnY + btnH);
      btnGrad.addColorStop(0, '#f59e0b');
      btnGrad.addColorStop(1, '#d97706');

      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#f59e0b';
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(width / 2 - btnW / 2, btnY, btnW, btnH, 27);
      ctx.fill();
      ctx.restore();

      ctx.font = '900 16px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(t('promoCanvasPlayNowFree', '🚀 JOUER MAINTENANT · GRATUIT'), width / 2, btnY + btnH / 2);

      // Store compatibility badges
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(t('promoCanvasPlatforms', '📱 Disponible sur Web, Android (PWA) & iOS'), width / 2, height * 0.72);

      // Publisher credits
      ctx.font = '500 11px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(t('promoCanvasCredits', 'Édité par DIAZ LE FACTEUR · Tous droits réservés'), width / 2, height * 0.84);
    }

    // Top watermark badge
    ctx.save();
    ctx.font = '800 10px sans-serif';
    ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
    ctx.textAlign = 'left';
    ctx.fillText(t('promoCanvasOfficialSpot', 'SPOT OFFICIEL · 12 PIONS'), 16, 24);
    ctx.restore();

    // Progress bar at the bottom
    const progress = Math.min(1, time / TOTAL_DURATION_SEC);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, height - 6, width, 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, height - 6, width * progress, 6);
  }, [t]);

  // Animation Loop Controller
  useEffect(() => {
    if (!isOpen) return;

    const render = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + deltaSec;
          if (next >= TOTAL_DURATION_SEC) {
            return 0; // Loop or end
          }
          return next;
        });
      }

      // Draw onto canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawFrame(ctx, canvas.width, canvas.height, currentTime);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      lastTimestampRef.current = null;
    };
  }, [isOpen, isPlaying, currentTime, drawFrame]);

  // Adjust canvas resolution based on aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (aspectRatio === '9:16') {
      canvas.width = 720;
      canvas.height = 1280;
    } else {
      canvas.width = 1280;
      canvas.height = 720;
    }
  }, [aspectRatio]);

  // Start real video export (.webm)
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initAudio();
    setIsRecording(true);
    setRecordProgress(0);
    setCurrentTime(0);
    setIsPlaying(true);

    try {
      // 1. Capture stream from canvas at 30 fps
      const canvasStream = canvas.captureStream(30);

      // 2. Mix audio destination if available
      const combinedTracks = [...canvasStream.getVideoTracks()];
      if (audioDestRef.current && audioDestRef.current.stream) {
        const audioTracks = audioDestRef.current.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedTracks.push(audioTracks[0]);
        }
      }

      const mixedStream = new MediaStream(combinedTracks);
      recordedChunksRef.current = [];

      // Supported mimeTypes
      let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType || '')) {
        options = { mimeType: 'video/webm' };
      }

      const recorder = new MediaRecorder(mixedStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `12_PIONS_Spot_Publicitaire_${aspectRatio === '9:16' ? 'Mobile' : 'Paysage'}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onShowToast(t('promoVideoSuccessToast', '🎉 Vidéo publicitaire générée et téléchargée avec succès !'));
      };

      recorder.start(100);

      // Progress interval
      const recordStartTime = Date.now();
      const progressTimer = setInterval(() => {
        const elapsed = (Date.now() - recordStartTime) / 1000;
        const pct = Math.min(100, Math.floor((elapsed / TOTAL_DURATION_SEC) * 100));
        setRecordProgress(pct);

        if (elapsed >= TOTAL_DURATION_SEC) {
          clearInterval(progressTimer);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 250);
    } catch (err) {
      setIsRecording(false);
      onShowToast(t('promoVideoErrorToast', '❌ Impossible d’enregistrer le flux vidéo sur cet appareil.'));
    }
  };

  // Copy promotional ad caption
  const handleCopyCaption = async () => {
    const originUrl = getPublicAppUrl();
    const caption = `${t('promoShareCaptionText', '👑 12 PIONS - Le Grand Classique Africain Réinventé !')}${originUrl ? `\n\n👉 ${originUrl}` : ''}`;
    await copyTextSafely(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    onShowToast(t('promoCaptionCopiedToast', '📋 Texte publicitaire copié dans le presse-papier !'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[96vh] bg-gradient-to-b from-[#083023] via-[#052118] to-[#02130e] border-2 border-amber-400/80 rounded-2xl shadow-[0_0_50px_rgba(245,197,24,0.4)] flex flex-col overflow-hidden text-white">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#031c13] border-b border-amber-500/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
              <Clapperboard className="w-4 h-4 text-slate-950 font-black" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-300 tracking-wide flex items-center gap-1.5">
                <span>{t('promoSpotTitle', 'SPOT PUBLICITAIRE OFFICIEL')}</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40 font-mono">
                  HD 60FPS
                </span>
              </h2>
              <p className="text-[11px] text-emerald-300/80">
                {t('promoTrailerSubtitle', 'Bande-annonce promotionnelle · 12 PIONS')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-rose-950 border border-slate-700 hover:border-rose-500 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Container & Timeline */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-3 sm:p-4 gap-4 overflow-y-auto">
          
          {/* Main Video Viewport */}
          <div className="relative flex flex-col items-center justify-center bg-black/80 rounded-xl border border-amber-500/30 p-1.5 shadow-2xl">
            <canvas
              ref={canvasRef}
              className={`rounded-lg shadow-inner max-h-[58vh] sm:max-h-[64vh] object-contain transition-all ${
                aspectRatio === '9:16' ? 'aspect-[9/16] w-auto' : 'aspect-[16/9] w-full max-w-lg'
              }`}
            />

            {/* Recording active overlay */}
            {isRecording && (
              <div className="absolute inset-0 bg-black/75 rounded-lg flex flex-col items-center justify-center p-4 backdrop-blur-sm z-30">
                <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-3" />
                <span className="text-sm font-black text-amber-300">
                  {t('promoRecordingInProgress', 'ENREGISTREMENT DU SPOT EN COURS...')}
                </span>
                <div className="w-48 h-2.5 bg-slate-800 rounded-full mt-3 overflow-hidden border border-amber-400/50">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-200"
                    style={{ width: `${recordProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-gray-300 mt-2">
                  {recordProgress}% ({Math.floor(currentTime)}s / {TOTAL_DURATION_SEC}s)
                </span>
              </div>
            )}
          </div>

          {/* Right Control & Action Panel */}
          <div className="w-full md:w-80 flex flex-col gap-3">
            
            {/* Format Selector (TikTok / Reel 9:16 vs YouTube / TV 16:9) */}
            <div className="bg-[#05261c] p-2.5 rounded-xl border border-amber-500/30">
              <span className="text-[10px] font-bold uppercase text-amber-300/80 mb-2 block tracking-wider">
                {t('promoFormatLabel', 'Format de la vidéo')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'bg-[#031c13] text-gray-300 hover:text-white border border-amber-500/20'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{t('promoFormatVertical', 'Story / Reels (9:16)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    aspectRatio === '16:9'
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'bg-[#031c13] text-gray-300 hover:text-white border border-amber-500/20'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{t('promoFormatLandscape', 'Paysage (16:9)')}</span>
                </button>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="bg-[#05261c] p-3 rounded-xl border border-amber-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                <span>00:{Math.floor(currentTime).toString().padStart(2, '0')}</span>
                <span>00:{TOTAL_DURATION_SEC}</span>
              </div>

              {/* Progress Bar Slider */}
              <input
                type="range"
                min="0"
                max={TOTAL_DURATION_SEC}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  setCurrentTime(parseFloat(e.target.value));
                  initAudio();
                }}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              {/* Play / Pause / Replay Buttons */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    initAudio();
                    setCurrentTime(0);
                    setIsPlaying(true);
                  }}
                  className="p-2 rounded-lg bg-[#031c13] border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                  title={t('restartFromBeginningTitle', 'Recommencer depuis le début')}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    initAudio();
                    setIsPlaying(!isPlaying);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? t('pause', 'PAUSE').toUpperCase() : t('play', 'LIRE').toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    initAudio();
                    setIsMuted(!isMuted);
                  }}
                  className="p-2 rounded-lg bg-[#031c13] border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                  title={isMuted ? t('promoSoundOn', 'Activer le son') : t('promoSoundOff', 'Couper le son')}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Big Action: Download Video File */}
            <button
              type="button"
              disabled={isRecording}
              onClick={handleExportVideo}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-500/30 border border-emerald-300 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t('promoDownloadWebm', 'TÉLÉCHARGER LA VIDÉO (.WEBM)')}</span>
            </button>

            {/* Copy Ad Copy / Caption for TikTok, WhatsApp, Facebook */}
            <button
              type="button"
              onClick={handleCopyCaption}
              className="w-full py-2.5 px-3 rounded-xl bg-[#031c13] hover:bg-[#072f21] border border-amber-400/40 text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCaption ? t('promoCaptionCopied', 'Texte copié !') : t('promoCopyCaption', 'Copier le texte d’annonce')}</span>
            </button>

            {/* Quick Promo description */}
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/80 leading-relaxed">
              💡 {t('promoCampaignTip', 'Idéal pour vos campagnes : partagez cette vidéo sur WhatsApp Statut, TikTok, Instagram Reels, YouTube Shorts ou Facebook.')}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
