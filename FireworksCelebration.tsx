import React, { useEffect, useRef } from 'react';
import { sound } from '../utils/audio';

interface FireworksCelebrationProps {
  active: boolean;
}

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  colorIdx: number;
  isFountain: boolean;
  gravity: number;
  friction: number;
}

interface Rocket {
  alive: boolean;
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  colorIdx: number;
}

const COLORS = [
  '#FFD700', // Or Royal
  '#EF4444', // Rubis
  '#10B981', // Émeraude
  '#3B82F6', // Saphir
  '#FFFFFF', // Étoile Blanche
  '#F59E0B', // Ambre
];

export const FireworksCelebration: React.FC<FireworksCelebrationProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Pre-render glowing spark textures on offscreen canvases for 100% GPU acceleration
    const spriteSize = 32;
    const halfSprite = spriteSize / 2;
    const glowSprites: HTMLCanvasElement[] = COLORS.map(color => {
      const off = document.createElement('canvas');
      off.width = spriteSize;
      off.height = spriteSize;
      const oCtx = off.getContext('2d');
      if (oCtx) {
        const grad = oCtx.createRadialGradient(halfSprite, halfSprite, 0, halfSprite, halfSprite, halfSprite);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.35, color);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        oCtx.fillStyle = grad;
        oCtx.beginPath();
        oCtx.arc(halfSprite, halfSprite, halfSprite, 0, Math.PI * 2);
        oCtx.fill();
      }
      return off;
    });

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Pre-allocated Particle Pool (zero GC allocations during animation)
    const MAX_PARTICLES = 480;
    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      alpha: 1,
      decay: 0.02,
      size: 4,
      colorIdx: 0,
      isFountain: false,
      gravity: 120,
      friction: 0.96,
    }));

    const MAX_ROCKETS = 6;
    const rockets: Rocket[] = Array.from({ length: MAX_ROCKETS }, () => ({
      alive: false,
      x: 0,
      y: 0,
      targetY: 0,
      vx: 0,
      vy: 0,
      colorIdx: 0,
    }));

    const spawnParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      colorIdx: number,
      size: number,
      decay: number,
      isFountain: boolean,
      gravity = 140,
      friction = 0.96
    ) => {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.alive) {
          p.alive = true;
          p.x = x;
          p.y = y;
          p.vx = vx;
          p.vy = vy;
          p.alpha = 1;
          p.decay = decay;
          p.size = size;
          p.colorIdx = colorIdx;
          p.isFountain = isFountain;
          p.gravity = gravity;
          p.friction = friction;
          return;
        }
      }
    };

    const spawnRocket = (startX?: number, targetY?: number) => {
      for (let i = 0; i < MAX_ROCKETS; i++) {
        const r = rockets[i];
        if (!r.alive) {
          r.alive = true;
          r.x = startX !== undefined ? startX : width * 0.18 + Math.random() * (width * 0.64);
          r.y = height + 10;
          r.targetY = targetY !== undefined ? targetY : height * 0.10 + Math.random() * (height * 0.32);
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.28;
          const speed = 520 + Math.random() * 200;
          r.vx = Math.cos(angle) * speed;
          r.vy = Math.sin(angle) * speed;
          r.colorIdx = Math.floor(Math.random() * COLORS.length);
          return;
        }
      }
    };

    const explodeRocket = (x: number, y: number, colorIdx: number) => {
      sound.playFireworkBurst();
      const count = 48;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 90 + Math.random() * 280;
        const cIdx = Math.random() < 0.35 ? 4 : colorIdx; // occasional white sparkle
        spawnParticle(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          cIdx,
          2.6 + Math.random() * 3.8,
          0.010 + Math.random() * 0.014,
          false,
          135,
          0.955
        );
      }
    };

    // Pyrotechnic Side Fountains (Fontaines d'étincelles latérales denses comme dans la vidéo Ludo King)
    let fountainTimer = 0;
    const emitFountains = () => {
      const emitterLeft = width * 0.05;
      const emitterRight = width * 0.95;
      const fountainY = height * 0.68;

      // 5-6 étincelles explosives par côté avec vitesse ascendante haute
      for (let i = 0; i < 5; i++) {
        spawnParticle(
          emitterLeft + (Math.random() - 0.5) * 20,
          fountainY,
          (Math.random() - 0.25) * 60,
          -380 - Math.random() * 280,
          Math.random() < 0.65 ? 0 : 4,
          2.4 + Math.random() * 2.5,
          0.018 + Math.random() * 0.018,
          true,
          360,
          0.985
        );
      }

      for (let i = 0; i < 5; i++) {
        spawnParticle(
          emitterRight + (Math.random() - 0.5) * 20,
          fountainY,
          (-Math.random() + 0.25) * 60,
          -380 - Math.random() * 280,
          Math.random() < 0.65 ? 0 : 1,
          2.4 + Math.random() * 2.5,
          0.018 + Math.random() * 0.018,
          true,
          360,
          0.985
        );
      }
    };

    // Initial instant celebration bursts
    explodeRocket(width * 0.5, height * 0.20, 0);
    setTimeout(() => explodeRocket(width * 0.28, height * 0.28, 2), 120);
    setTimeout(() => explodeRocket(width * 0.72, height * 0.25, 1), 260);

    spawnRocket(width * 0.35, height * 0.16);
    setTimeout(() => spawnRocket(width * 0.65, height * 0.18), 350);

    let lastTime = performance.now();
    let rocketTimer = 0;

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // Delta time locked
      lastTime = now;

      // Soft trail clearing
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, width, height);

      // High-speed GPU lighter blend mode
      ctx.globalCompositeOperation = 'lighter';

      // Fountain rhythm (every 45ms for dense continuous sparkle column)
      fountainTimer += dt;
      if (fountainTimer >= 0.045) {
        fountainTimer = 0;
        emitFountains();
      }

      // Rocket spawn rhythm (every 750ms)
      rocketTimer += dt;
      if (rocketTimer >= 0.75) {
        rocketTimer = 0;
        spawnRocket();
      }

      // ─── Update & Render Rockets ───
      for (let i = 0; i < MAX_ROCKETS; i++) {
        const r = rockets[i];
        if (!r.alive) continue;

        r.x += r.vx * dt;
        r.y += r.vy * dt;

        // Draw rocket head using pre-rendered sprite
        const sprite = glowSprites[r.colorIdx];
        ctx.globalAlpha = 0.95;
        ctx.drawImage(sprite, r.x - 7, r.y - 7, 14, 14);

        if (r.vy >= 0 || r.y <= r.targetY) {
          r.alive = false;
          explodeRocket(r.x, r.y, r.colorIdx);
        }
      }

      // ─── Update & Render Particles (Batch Draw via Sprites) ───
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.alive) continue;

        p.vx *= p.friction;
        p.vy = p.vy * p.friction + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * (dt * 60);

        if (p.alpha <= 0.02) {
          p.alive = false;
          continue;
        }

        ctx.globalAlpha = p.alpha;
        const sprite = glowSprites[p.colorIdx];
        const sz = p.size * (0.6 + p.alpha * 0.4);
        ctx.drawImage(sprite, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      sound.killAllCelebrationAudio();
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[80] pointer-events-none w-full h-full transform-gpu will-change-transform"
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        touchAction: 'none',
      }}
    />
  );
};
