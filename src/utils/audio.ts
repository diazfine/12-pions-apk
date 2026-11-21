import { App as CapApp } from '@capacitor/app';

/**
 * Royal High-Fidelity Audio & Haptics Engine for 12 Pions
 * Includes punchy tactile piece physics sounds, deep bass capture thumps,
 * and realistic stadium applause with crowd cheering jubilation upon victory!
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private musicInterval: number | null = null;
  private beat: number = 0;
  public sfxEnabled: boolean = true;
  public musicEnabled: boolean = true;
  public vibrationEnabled: boolean = true;
  public musicVolume: number = 1.0; // 100% MAXIMUM BGM volume as requested
  public currentTrack: 'menu' | 'game' = 'menu';
  private isMuted: boolean = false;
  private isAppBackgrounded: boolean = false;
  private duckMultiplier: number = 1.0;
  private duckingTimer: number | null = null;
  private fadeInMultiplier: number = 1.0;
  private fadeInTimer: number | null = null;
  private wheelSpinTimeouts: number[] = [];
  private victoryAudio: HTMLAudioElement | null = null;
  private burstAudios: HTMLAudioElement[] = [];
  private burstIndex: number = 0;
  private victoryCelebrationInterval: number | null = null;
  private isVictoryCelebrating: boolean = false;
  private victoryMasterGain: GainNode | null = null;
  private victoryCrowdSource: AudioBufferSourceNode | null = null;
  private victoryCrowdLfo: OscillatorNode | null = null;
  private victoryApplauseInterval: number | null = null;
  private victoryFireworksInterval: number | null = null;
  private victoryWhistleInterval: number | null = null;
  private victoryFanfareInterval: number | null = null;
  private victoryFadeTimer: number | null = null;
  private activeFanfareOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private puzzleOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private lastCaptureTime: number = 0;

  private readonly SCALE = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]; // C D E F G A B C

  public isGloballyMuted(): boolean {
    return this.isMuted || this.isAppBackgrounded;
  }

  public isGamePaused: boolean = false;

  public setGamePaused(paused: boolean) {
    this.isGamePaused = paused;
    if (paused) {
      this.stopMusic();
    }
  }

  /**
   * Mute completely when app is pushed to background or user presses device Home button
   */
  public pauseForBackground() {
    this.isAppBackgrounded = true;
    this.killAllCelebrationAudio();
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  /**
   * Unmute and resume soundtrack when user re-opens the game window
   */
  public resumeFromBackground() {
    this.isAppBackgrounded = false;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.musicEnabled && !this.isMuted && !this.isGamePaused) {
      this.startMusic(this.currentTrack);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopMusic();
    } else {
      if (this.musicEnabled) {
        this.startMusic(this.currentTrack);
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public duckMusic(durationMs: number = 320) {
    this.duckMultiplier = 0.3; // duck music by 70% during SFX for crystal-clear piece impact
    if (this.duckingTimer !== null) {
      window.clearTimeout(this.duckingTimer);
    }
    this.duckingTimer = window.setTimeout(() => {
      this.duckMultiplier = 1.0;
      this.duckingTimer = null;
    }, durationMs);
  }

  public initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Device haptic vibration feedback with crisp patterns
   */
  public vibrate(pattern: number | number[]) {
    if (!this.vibrationEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors on unsupported devices
    }
  }

  /**
   * Neutral game start sound chime (ascending soft gong/bells, NOT victory celebration)
   */
  public playStartSound() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.initContext();
    this.vibrate([30, 20, 40]);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Gentle warm triad ascending chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    } catch {
      // Audio context restricted
    }
  }

  /**
   * Tactile piece selection click - crisp metallic-wood snap with high shimmer
   */
  public playSelect() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.initContext();
    this.vibrate(25);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // High-pitched crystal bell overtone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.04);
      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);

      // Harmonic chime
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1320, now);
      chime.frequency.exponentialRampToValueAtTime(2640, now + 0.05);
      chimeGain.gain.setValueAtTime(0.16, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      chime.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chime.start(now);
      chime.stop(now + 0.07);
    } catch {
      // Restricted context
    }
  }

  /**
   * Tactile piece placement thud - tuned softer than background music as requested
   */
  public playMove() {
    if (this.isMuted || !this.sfxEnabled) return;
    // Music is kept at maximum volume without ducking during moves
    this.initContext();
    this.vibrate([25, 10, 20]);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // Layer 1: Sub-Bass Kick (soft tactile click, much quieter than menu music)
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(36, now + 0.08);
      subGain.gain.setValueAtTime(0.12, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.09);

      // Layer 2: Resonant Wood Slap
      const wood = this.ctx.createOscillator();
      const woodGain = this.ctx.createGain();
      wood.type = 'triangle';
      wood.frequency.setValueAtTime(340, now);
      wood.frequency.exponentialRampToValueAtTime(95, now + 0.06);
      woodGain.gain.setValueAtTime(0.10, now);
      woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      wood.connect(woodGain);
      woodGain.connect(this.ctx.destination);
      wood.start(now);
      wood.stop(now + 0.07);

      // Layer 3: High-frequency tactile board snap
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'sawtooth';
      snap.frequency.setValueAtTime(900, now);
      snap.frequency.exponentialRampToValueAtTime(200, now + 0.025);
      snapGain.gain.setValueAtTime(0.06, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      snap.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snap.start(now);
      snap.stop(now + 0.025);
    } catch {
      // Audio context restricted
    }
  }

  /**
   * THUNDEROUS CAPTURE STRIKE - Cinematic Whoosh + Sub-Bass Explosion + Shattering Crack
   * Debounced to eliminate parasitic repetitive "tac tac" double sound during multi-captures.
   */
  public playCapture() {
    if (this.isMuted || !this.sfxEnabled) return;
    const nowMs = Date.now();
    // Debounce protection: ensure at least 220ms between capture sound triggers to prevent "tac tac" echoes
    if (nowMs - this.lastCaptureTime < 220) {
      return;
    }
    this.lastCaptureTime = nowMs;

    this.duckMusic(420);
    this.initContext();
    this.vibrate([80, 30, 90]);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      // 1. Deep Sub-Bass Impact (220Hz -> 28Hz)
      const bass = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(220, now);
      bass.frequency.exponentialRampToValueAtTime(28, now + 0.32);
      bassGain.gain.setValueAtTime(0.85, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      bass.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bass.start(now);
      bass.stop(now + 0.32);

      // 2. Resonant Wood & Drum Strike (warm triangle wave to eliminate harsh click/buzz)
      const clash = this.ctx.createOscillator();
      const clashGain = this.ctx.createGain();
      clash.type = 'triangle';
      clash.frequency.setValueAtTime(420, now);
      clash.frequency.exponentialRampToValueAtTime(65, now + 0.16);
      clashGain.gain.setValueAtTime(0.70, now);
      clashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      clash.connect(clashGain);
      clashGain.connect(this.ctx.destination);
      clash.start(now);
      clash.stop(now + 0.16);

      // 3. Shimmering gong overtone
      const gong = this.ctx.createOscillator();
      const gongGain = this.ctx.createGain();
      gong.type = 'triangle';
      gong.frequency.setValueAtTime(880, now);
      gong.frequency.exponentialRampToValueAtTime(320, now + 0.22);
      gongGain.gain.setValueAtTime(0.40, now);
      gongGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      gong.connect(gongGain);
      gongGain.connect(this.ctx.destination);
      gong.start(now);
      gong.stop(now + 0.22);
    } catch {
      // Audio context restricted
    }
  }

  /**
   * Crisp Arcade Timer Tick Sound when countdown is urgent (<= 5s)
   */
  public playTimerTick() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.initContext();
    this.vibrate(20);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio context restricted
    }
  }

  /**
   * Royal Queen (Dame) Promotion Fanfare & Shimmer
   */
  public playPromotion() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.duckMusic(500);
    this.initContext();
    this.vibrate([40, 20, 60, 20, 100]);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const fanfareNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6

      fanfareNotes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = now + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.85, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch {
      // Audio context restricted
    }
  }

  /**
   * Mandatory capture penalty warning & Move Error sound (100% gain)
   */
  public playPenalty() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.duckMusic(380);
    this.initContext();
    this.vibrate([100, 40, 100]);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.25);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // Audio context restricted
    }
  }

  /**
   * Alias for error sound effect at 100% gain
   */
  public playError() {
    this.playPenalty();
  }

  /**
   * Somber, respectful defeat / loss audio chime (descending minor notes)
   */
  public playDefeat() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.duckMusic(1200);
    this.initContext();
    this.vibrate([200, 100, 300]);
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Expressive descending minor phrase: Eb4 -> D4 -> C4 -> G3 with subtle fifth harmony
      const notes = [
        { freq: 311.13, delay: 0, dur: 0.32 },
        { freq: 293.66, delay: 0.28, dur: 0.32 },
        { freq: 261.63, delay: 0.56, dur: 0.42 },
        { freq: 196.0, delay: 0.92, dur: 0.85 },
      ];
      notes.forEach(n => {
        if (!this.ctx) return;
        // Primary voice
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.delay);
        gain.gain.setValueAtTime(0.45, now + n.delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + n.delay);
        osc.stop(now + n.delay + n.dur);

        // Sub-octave warm tone
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(n.freq / 2, now + n.delay);
        subGain.gain.setValueAtTime(0.25, now + n.delay);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.dur);
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now + n.delay);
        subOsc.stop(now + n.delay + n.dur);
      });
    } catch {
      // Audio context restricted
    }
  }

  /**
   * ⚖️ SON SPÉCIFIQUE DU MATCH NUL (Harmonieux, digne & équilibré)
   * Carillon royal neutre et apaisant (accords suspendus purs & résonance de bol/kalimba)
   * Zéro applaudissement, zéro clameur de victoire, zéro défaite, symbolisant le partage équitable.
   */
  public playDraw() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.stopVictoryCelebrationLoop(true);
    this.duckMusic(1400);
    this.initContext();
    this.vibrate([45, 60, 45]);
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Accord suspendu noble et équilibré : D4 (293.66) -> A4 (440.0) -> D5 (587.33) -> A5 (880.0)
      const chimes = [
        { freq: 293.66, delay: 0.00, dur: 1.4, vol: 0.40, type: 'sine' as OscillatorType },
        { freq: 440.00, delay: 0.08, dur: 1.5, vol: 0.45, type: 'triangle' as OscillatorType },
        { freq: 587.33, delay: 0.18, dur: 1.6, vol: 0.35, type: 'sine' as OscillatorType },
        { freq: 880.00, delay: 0.28, dur: 1.8, vol: 0.25, type: 'triangle' as OscillatorType },
      ];

      chimes.forEach(ch => {
        if (!this.ctx) return;
        const t = now + ch.delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = ch.type;
        osc.frequency.setValueAtTime(ch.freq, t);

        // Attaque douce et résonance aérienne cristalline
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(ch.vol, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + ch.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + ch.dur);

        // Overtone chaleureux pour timbre boisé / cloche royale
        const overtone = this.ctx.createOscillator();
        const otGain = this.ctx.createGain();
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(ch.freq * 2.02, t);
        otGain.gain.setValueAtTime(0.001, t);
        otGain.gain.linearRampToValueAtTime(ch.vol * 0.22, t + 0.02);
        otGain.gain.exponentialRampToValueAtTime(0.001, t + ch.dur * 0.6);

        overtone.connect(otGain);
        otGain.connect(this.ctx.destination);
        overtone.start(t);
        overtone.stop(t + ch.dur * 0.6);
      });
    } catch {
      // Audio context restricted
    }
  }

  /**
   * 🎆 SPECTACULAR CELEBRATORY FIREWORKS SOUND FX (Impacts réalistes "BOUM" / "POP")
   * Déclenche de véritables impacts de feux d'artifice synchronisés sans sifflet ni crépitement parasite
   */
  public playFireworks() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.playFireworkBurst();
    window.setTimeout(() => this.playFireworkBurst(), 360);
    window.setTimeout(() => this.playFireworkBurst(), 820);
  }

  /**
   * Stop any ongoing fortune wheel ticker timeouts
   */
  public stopWheelSpin() {
    this.wheelSpinTimeouts.forEach(id => window.clearTimeout(id));
    this.wheelSpinTimeouts = [];
  }

  /**
   * Authentic Fortune Wheel (Roue de la Fortune) sound:
   * Rapid clicking of the pointer against pegs that progressively decelerates
   * over the spin duration (starts at ~36ms intervals, widening to 450ms+ before settling)
   */
  public playWheelSpin(durationMs: number = 4200) {
    if (this.isMuted || !this.sfxEnabled) return;
    this.stopWheelSpin();
    this.initContext();
    if (!this.ctx) return;

    let currentTime = 0;
    let step = 36;
    let clickIndex = 0;

    while (currentTime < durationMs - 50) {
      const clickDelay = currentTime;
      const isFinalClick = currentTime + step >= durationMs - 50;
      const idx = clickIndex;

      const timeoutId = window.setTimeout(() => {
        if (!this.ctx || this.isMuted || !this.sfxEnabled) return;
        try {
          const now = this.ctx.currentTime;
          // Alternating click frequency to simulate physical peg resistance
          const baseFreq = idx % 2 === 0 ? 1450 : 1300;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.016);

          const vol = isFinalClick ? 0.7 : Math.min(0.55, 0.35 + (idx / 40) * 0.15);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinalClick ? 0.045 : 0.02));

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + (isFinalClick ? 0.045 : 0.02));

          if (isFinalClick) {
            this.vibrate(35);
          } else if (idx % 3 === 0) {
            this.vibrate(8);
          }
        } catch {
          // Audio restricted
        }
      }, clickDelay);

      this.wheelSpinTimeouts.push(timeoutId);

      // Deceleration curve: step increases as time progresses
      const progress = currentTime / durationMs;
      step = 36 + Math.pow(progress, 2.3) * 430;
      currentTime += step;
      clickIndex++;
    }
  }

  /**
   * Realistic Gold Coins Shower & Jingle Payout sound:
   * Cascading bright metallic clinks of coins dropping into a tray/purse
   * (Frequencies 2200Hz - 4800Hz with shimmering metallic resonance)
   */
  public playCoins() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.initContext();
    this.vibrate([25, 30, 25, 40, 20, 50, 30]);
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Staggered coin clinks: pairs of metallic harmonics
      const coinDrops = [
        { delay: 0.00, f1: 2400, f2: 3600, dur: 0.14, vol: 0.45 },
        { delay: 0.07, f1: 2900, f2: 4400, dur: 0.15, vol: 0.50 },
        { delay: 0.14, f1: 2200, f2: 3300, dur: 0.16, vol: 0.55 },
        { delay: 0.22, f1: 3100, f2: 4800, dur: 0.18, vol: 0.60 },
        { delay: 0.31, f1: 2600, f2: 3900, dur: 0.17, vol: 0.55 },
        { delay: 0.40, f1: 3400, f2: 5100, dur: 0.20, vol: 0.50 },
        { delay: 0.52, f1: 2800, f2: 4200, dur: 0.22, vol: 0.45 },
        { delay: 0.66, f1: 3600, f2: 5400, dur: 0.25, vol: 0.40 },
        { delay: 0.82, f1: 3200, f2: 4600, dur: 0.28, vol: 0.35 },
      ];

      coinDrops.forEach(drop => {
        if (!this.ctx) return;
        const t = now + drop.delay;

        // Primary metallic tone
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(drop.f1, t);
        gain1.gain.setValueAtTime(drop.vol * 0.4, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + drop.dur);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(t);
        osc1.stop(t + drop.dur);

        // Overtone metallic ring (gives distinct coin clatter shimmer)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(drop.f2, t);
        gain2.gain.setValueAtTime(drop.vol * 0.25, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + drop.dur * 0.85);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t);
        osc2.stop(t + drop.dur);
      });
    } catch {
      // Audio restricted
    }
  }

  /**
   * 🌟 CÉLÉBRATION DE VICTOIRE (HUMAINE & FESTIVE)
   * Joue l'ambiance sonore réelle de la vidéo : vrais applaudissements de foule,
   * clameurs de joie et acclamations de stade (aucun synthétiseur arcade).
   */
  public playVictory() {
    if (this.isMuted || !this.sfxEnabled || this.isAppBackgrounded) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.stopVictoryCelebrationLoop(true);
    this.vibrate([120, 60, 180, 60, 300, 80, 600]);
    this.initContext();

    // 1. Fanfare triomphale complète (synthétiseur royal haute fidélité)
    this.playVictoryFanfare();

    // 2. Acclamations et cris de joie réels de stade
    try {
      this.victoryAudio = new Audio('/sounds/victory_human_cheer.mp3');
      this.victoryAudio.preload = 'auto';
      this.victoryAudio.loop = false;
      this.victoryAudio.currentTime = 0;
      this.victoryAudio.volume = Math.min(1.0, this.musicVolume);
      const playPromise = this.victoryAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Si la lecture est annulée ou échoue, ne pas réinstancier
        });
      }
    } catch {}
  }

  /**
   * 💥 BRUITAGE SYNCHRONISÉ DE DÉTONATION DE FEU D'ARTIFICE (Couche 2 SFX)
   * Déclenche de véritables impacts de feux d'artifice authentiques ("BOUM!" & "POP!" réels)
   * sans aucun oscillateur ou son synthétique, exactement comme dans la vidéo de référence Ludo King.
   */
  public playFireworkBurst() {
    if (this.isMuted || !this.sfxEnabled) return;

    try {
      if (this.burstAudios.length === 0) {
        const soundFiles = [
          '/sounds/firework_burst_1.mp3',
          '/sounds/firework_burst_2.mp3',
          '/sounds/firework_burst_3.mp3',
          '/sounds/firework_burst_1.mp3',
          '/sounds/firework_burst_2.mp3',
          '/sounds/firework_burst_3.mp3',
        ];
        this.burstAudios = soundFiles.map(src => {
          const a = new Audio(src);
          a.preload = 'auto';
          return a;
        });
      }
      const soundToPlay = this.burstAudios[this.burstIndex % this.burstAudios.length];
      this.burstIndex++;
      soundToPlay.currentTime = 0;
      soundToPlay.volume = Math.min(1.0, this.musicVolume);
      const playPromise = soundToPlay.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      this.vibrate([40, 25, 65]);
    } catch {}
  }

  /**
   * Sifflet désactivé conformément à la demande utilisateur (suppression des sifflements stridents et parasites)
   */
  public playWhistle(_delayOffset = 0, _duration = 0.55, _pitch = 2850) {
    // Sifflet strident neutralisé pour préserver la chaleur de l'ambiance humaine
  }

  /**
   * Rafale de sifflets neutralisée
   */
  public playWhistleBurst() {
    // Neutralisé
  }

  /**
   * Cris de joie et clameur enthousiaste du stade ("OUIIII ! BRAVO ! HOURRA !")
   */
  public playCrowdCheerRoar(duration = 3.6) {
    if (this.isMuted || !this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const cheerBuffer = this.ctx.createBuffer(
        1,
        Math.floor(this.ctx.sampleRate * duration),
        this.ctx.sampleRate
      );
      const cheerData = cheerBuffer.getChannelData(0);
      for (let j = 0; j < cheerData.length; j++) {
        cheerData[j] = Math.random() * 2 - 1;
      }

      const cheerSource = this.ctx.createBufferSource();
      cheerSource.buffer = cheerBuffer;

      const formant1 = this.ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.setValueAtTime(500, now);
      formant1.frequency.exponentialRampToValueAtTime(920, now + 1.2);
      formant1.Q.setValueAtTime(3.8, now);

      const formant2 = this.ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.setValueAtTime(1500, now);
      formant2.frequency.exponentialRampToValueAtTime(2350, now + 1.2);
      formant2.Q.setValueAtTime(3.2, now);

      const cheerGain = this.ctx.createGain();
      cheerGain.gain.setValueAtTime(0.02, now);
      cheerGain.gain.linearRampToValueAtTime(0.48, now + 0.35);
      cheerGain.gain.setValueAtTime(0.48, now + 2.0);
      cheerGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      cheerSource.connect(formant1);
      cheerSource.connect(formant2);
      formant1.connect(cheerGain);
      formant2.connect(cheerGain);
      cheerGain.connect(this.ctx.destination);

      cheerSource.start(now);
      cheerSource.stop(now + duration);
    } catch {}
  }

  /**
   * Fanfare triomphale royale
   */
  public playVictoryFanfare() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const brassChords = [
        { freqs: [261.63, 329.63, 392.0], start: 0, dur: 0.28 },
        { freqs: [392.0, 493.88, 587.33], start: 0.3, dur: 0.28 },
        { freqs: [440.0, 523.25, 659.25], start: 0.6, dur: 0.32 },
        { freqs: [349.23, 440.0, 523.25], start: 0.95, dur: 0.4 },
        { freqs: [523.25, 659.25, 783.99, 1046.5], start: 1.4, dur: 1.6 },
      ];

      brassChords.forEach(chord => {
        chord.freqs.forEach(freq => {
          if (!this.ctx) return;
          const t = now + chord.start;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.24, t);
          gain.gain.setValueAtTime(0.22, t + chord.dur * 0.6);
          gain.gain.exponentialRampToValueAtTime(0.001, t + chord.dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(t);
          osc.stop(t + chord.dur);

          this.activeFanfareOscs.push({ osc, gain });
        });
      });
    } catch {}
  }

  /**
   * 🎆 AMBIANCE CONTINUE DE CÉLÉBRATION DE VICTOIRE
   * Joue en continu l'ambiance humaine festive et la fanfare royale :
   * fanfare triomphale, applaudissements de foule et acclamations de stade.
   */
  public startVictoryCelebrationLoop() {
    if (this.isMuted || this.isAppBackgrounded) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.stopVictoryCelebrationLoop(true); // Arrêt immédiat et annulation de tout fade timer précédent
    this.isVictoryCelebrating = true;

    // Arrêter la musique de fond du jeu pendant la célébration triomphale
    this.stopMusic();
    this.initContext();

    // 1. Déclencher la fanfare triomphale complète (son triomphal garanti à chaque victoire)
    this.playVictoryFanfare();

    // 2. Jouer l'ambiance sonore réelle (foule humaine et applaudissements)
    try {
      this.victoryAudio = new Audio('/sounds/victory_human_cheer.mp3');
      this.victoryAudio.preload = 'auto';
      this.victoryAudio.loop = true;
      this.victoryAudio.currentTime = 0;
      this.victoryAudio.volume = Math.min(1.0, this.musicVolume);
      const playPromise = this.victoryAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Si la lecture est annulée (ex: clic Rejouer immédiat), rester stoppé sans créer d'instance zombie
        });
      }
    } catch (e) {
      console.warn('Victory cheer audio loop', e);
    }
  }

  /**
   * Arrête immédiatement et net l'ambiance de célébration de victoire et réinitialise toutes les instances audio
   */
  public stopVictoryCelebrationLoop(immediate: boolean = true) {
    this.isVictoryCelebrating = false;

    // 1. Annuler impérativement tout timer de fade-out résiduel pour éviter de couper le son suivant
    if (this.victoryFadeTimer !== null) {
      clearInterval(this.victoryFadeTimer);
      this.victoryFadeTimer = null;
    }

    // 2. Couper instantanément tout oscillateur Web Audio de fanfare en cours
    if (this.activeFanfareOscs && this.activeFanfareOscs.length > 0) {
      this.activeFanfareOscs.forEach(({ osc, gain }) => {
        try {
          if (this.ctx) {
            gain.gain.cancelScheduledValues(this.ctx.currentTime);
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
          }
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      this.activeFanfareOscs = [];
    }

    // 3. Couper net et détacher définitivement l'instance audio de victoire (anti-persistance mobile)
    if (this.victoryAudio) {
      try {
        this.victoryAudio.pause();
        this.victoryAudio.currentTime = 0;
        this.victoryAudio.src = '';
        this.victoryAudio.removeAttribute('src');
        this.victoryAudio.load();
      } catch {}
      this.victoryAudio = null;
    }

    // 4. Couper immédiatement et détacher tout son de détonation de feu d'artifice en vol
    if (this.burstAudios && this.burstAudios.length > 0) {
      this.burstAudios.forEach((audio) => {
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          audio.removeAttribute('src');
          audio.load();
        } catch {}
      });
      this.burstAudios = [];
    }

    if (this.victoryCelebrationInterval !== null) {
      clearInterval(this.victoryCelebrationInterval);
      this.victoryCelebrationInterval = null;
    }
    if (this.victoryFireworksInterval !== null) {
      clearInterval(this.victoryFireworksInterval);
      this.victoryFireworksInterval = null;
    }
    if (this.victoryWhistleInterval !== null) {
      clearInterval(this.victoryWhistleInterval);
      this.victoryWhistleInterval = null;
    }
    if (this.victoryFanfareInterval !== null) {
      clearInterval(this.victoryFanfareInterval);
      this.victoryFanfareInterval = null;
    }

    if (this.ctx && this.victoryMasterGain) {
      try {
        const now = this.ctx.currentTime;
        this.victoryMasterGain.gain.cancelScheduledValues(now);
        this.victoryMasterGain.gain.setValueAtTime(this.victoryMasterGain.gain.value, now);
        this.victoryMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      } catch {}
    }

    if (this.victoryCrowdSource) {
      try {
        this.victoryCrowdSource.stop();
        this.victoryCrowdSource.disconnect();
      } catch {}
      this.victoryCrowdSource = null;
    }

    if (this.victoryCrowdLfo) {
      try {
        this.victoryCrowdLfo.stop();
        this.victoryCrowdLfo.disconnect();
      } catch {}
      this.victoryCrowdLfo = null;
    }

    this.victoryMasterGain = null;
  }

  /**
   * 🧩 JINGLE DE SUCCÈS POUR DÉFIS TACTIQUES (Court, élégant, neutre & satisfaisant)
   * Remplace la fanfare lourde et le brouhaha de stade des victoires de match.
   * Durée ~0.8s, non répétitif, purement gratifiant.
   */
  public playPuzzleSuccess() {
    if (this.isMuted || !this.sfxEnabled || this.isAppBackgrounded) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.stopPuzzleAudio();
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Arpège ascendant cristallin et royal (Mi5 - Sol#5 - Si5 - Mi6)
      const notes = [
        { freq: 659.25, time: 0, dur: 0.18 },     // E5
        { freq: 830.61, time: 0.12, dur: 0.22 },   // G#5
        { freq: 987.77, time: 0.24, dur: 0.25 },   // B5
        { freq: 1318.51, time: 0.38, dur: 0.45 },  // E6
      ];

      notes.forEach(({ freq, time, dur }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.22, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
        this.puzzleOscs.push({ osc, gain });
      });

      this.vibrate([40, 30, 70]);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Arrêt immédiat et explicite de tout son lié aux puzzles
   */
  public stopPuzzleAudio() {
    if (this.puzzleOscs && this.puzzleOscs.length > 0) {
      this.puzzleOscs.forEach(({ osc, gain }) => {
        try {
          if (this.ctx) {
            gain.gain.cancelScheduledValues(this.ctx.currentTime);
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
          }
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      this.puzzleOscs = [];
    }
  }

  /**
   * Arrêt d'urgence absolu de toute célébration et de tous les sons de fin de match
   */
  public killAllCelebrationAudio() {
    this.stopVictoryCelebrationLoop(true);
    this.stopPuzzleAudio();
  }

  public isVictoryCelebrationActive(): boolean {
    return this.isVictoryCelebrating;
  }

  /**
   * 👏 STADIUM APPLAUSE & CHEERING
   * Synthesizes 45+ organic handclap bursts and crowd applause cheering
   */
  public playApplause() {
    if (this.isMuted || !this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const clapCount = 45;
      for (let i = 0; i < clapCount; i++) {
        const clapDelay = now + Math.random() * 2.8;
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.045);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let s = 0; s < bufferSize; s++) {
          data[s] = (Math.random() * 2 - 1) * Math.exp(-s / (bufferSize * 0.22));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000 + Math.random() * 800, clapDelay);
        filter.Q.setValueAtTime(2.2, clapDelay);
        const gain = this.ctx.createGain();
        const clapVol = 0.2 + Math.random() * 0.3;
        gain.gain.setValueAtTime(clapVol, clapDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, clapDelay + 0.045);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(clapDelay);
      }
    } catch {
      // Audio context restricted
    }
  }

  /**
   * Smoothly fades in background music volume from near silence to 100% over the specified duration
   */
  public fadeInMusic(durationMs: number = 1600) {
    this.fadeInMultiplier = 0.05;
    if (this.fadeInTimer !== null) {
      clearInterval(this.fadeInTimer);
    }
    const startTime = Date.now();
    this.fadeInTimer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      this.fadeInMultiplier = 0.05 + progress * 0.95;
      if (progress >= 1.0) {
        if (this.fadeInTimer !== null) clearInterval(this.fadeInTimer);
        this.fadeInTimer = null;
        this.fadeInMultiplier = 1.0;
      }
    }, 40);
  }

  /**
   * 🎵 DUAL-TRACK DYNAMIC SOUNDTRACK SYSTEM
   * Track 1 ('menu'): High-tempo (~135 BPM) Royal Sahelian Welcome Anthem
   * Track 2 ('game'): Match Soundtrack (~120 BPM) Focused Balafon & Heartbeat Groove
   * Volume: 100% full immersion
   */
  public startMusic(track: 'menu' | 'game' = 'menu', fadeIn: boolean = false) {
    if (this.isMuted || !this.musicEnabled) return;
    this.initContext();

    if (fadeIn) {
      this.fadeInMusic(1600);
    } else {
      this.fadeInMultiplier = 1.0;
    }

    // If already playing the requested track, continue smoothly
    if (this.musicInterval !== null && this.currentTrack === track) {
      return;
    }

    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    this.currentTrack = track;
    const baseVol = 1.00; // 100% full immersion

    const BALAFON_PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

    if (track === 'menu') {
      // ─── 1. UPTEMPO LUDO KING STYLE BRASSY & FESTIVE MENU ANTHEM (~138 BPM, Volume: 1.00) ───
      // Catchy fanfare chords: C maj -> F maj -> G maj -> C maj with trumpet stabs
      const brassChords = [
        [261.63, 329.63, 392.0],  // C maj
        [261.63, 329.63, 392.0],  // C maj stab
        [349.23, 440.0, 523.25],  // F maj
        [349.23, 440.0, 523.25],  // F maj stab
        [392.0, 493.88, 587.33],  // G maj
        [392.0, 493.88, 587.33],  // G maj stab
        [523.25, 659.25, 783.99], // High C maj fanfare
        [392.0, 523.25, 659.25],  // Inverted C
      ];

      const brassLeadMelody = [
        523.25, 587.33, 659.25, 783.99,
        659.25, 587.33, 523.25, 392.0,
        440.0, 523.25, 659.25, 587.33,
        523.25, 659.25, 783.99, 1046.5
      ];

      const walkingBass = [
        130.81, 164.81, 196.0, 220.0,
        174.61, 220.0, 261.63, 220.0,
        196.0, 246.94, 293.66, 246.94,
        130.81, 196.0, 261.63, 196.0
      ];

      this.musicInterval = window.setInterval(() => {
        if (this.isMuted || !this.musicEnabled || !this.ctx) return;
        const vol = this.musicVolume * baseVol * this.duckMultiplier * this.fadeInMultiplier;
        try {
          const step = this.beat % 16;
          const t = this.ctx.currentTime;

          // A. Punchy Festive Brass Horns / Trumpet Stabs (every 2 beats or syncopated)
          if (step % 2 === 0) {
            const chord = brassChords[(step / 2) % brassChords.length];
            chord.forEach(freq => {
              if (!this.ctx) return;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              const filter = this.ctx.createBiquadFilter();

              // Warm brass timbre: Sawtooth shaped through resonant lowpass filter
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(freq, t);

              // Brass horn filter swell (quick trumpet bite)
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(800, t);
              filter.frequency.exponentialRampToValueAtTime(3200, t + 0.03);
              filter.frequency.exponentialRampToValueAtTime(1200, t + 0.16);

              gain.gain.setValueAtTime(0, t);
              gain.gain.linearRampToValueAtTime(0.48 * vol, t + 0.015);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

              osc.connect(filter);
              filter.connect(gain);
              gain.connect(this.ctx.destination);

              osc.start(t);
              osc.stop(t + 0.17);
            });
          }

          // B. Cheerful Carnival Balafon / Marimba Melody
          const leadFreq = brassLeadMelody[step];
          const marimba = this.ctx.createOscillator();
          const marimbaGain = this.ctx.createGain();
          marimba.type = 'triangle';
          marimba.frequency.setValueAtTime(leadFreq, t);

          marimbaGain.gain.setValueAtTime(0, t);
          marimbaGain.gain.linearRampToValueAtTime(0.52 * vol, t + 0.008);
          marimbaGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

          marimba.connect(marimbaGain);
          marimbaGain.connect(this.ctx.destination);
          marimba.start(t);
          marimba.stop(t + 0.15);

          // C. Bouncy Walking Arcade Bassline
          const bFreq = walkingBass[step];
          const bass = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bass.type = 'sine';
          bass.frequency.setValueAtTime(bFreq, t);
          bass.frequency.exponentialRampToValueAtTime(bFreq * 0.7, t + 0.14);

          bassGain.gain.setValueAtTime(0.60 * vol, t);
          bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

          bass.connect(bassGain);
          bassGain.connect(this.ctx.destination);
          bass.start(t);
          bass.stop(t + 0.16);

          // D. Festive Percussion: Crisp Shaker & Carnival Woodblock Click
          const shakerBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.02), this.ctx.sampleRate);
          const sData = shakerBuffer.getChannelData(0);
          for (let k = 0; k < sData.length; k++) {
            sData[k] = (Math.random() * 2 - 1) * Math.exp(-k / (sData.length * 0.25));
          }
          const shaker = this.ctx.createBufferSource();
          shaker.buffer = shakerBuffer;
          const sGain = this.ctx.createGain();
          sGain.gain.setValueAtTime((step % 4 === 2 ? 0.22 : 0.14) * vol, t);
          shaker.connect(sGain);
          sGain.connect(this.ctx.destination);
          shaker.start(t);

          this.beat++;
        } catch {
          // Catch restricted audio
        }
      }, 190);
    } else {
      // ─── 2. MATCH SOUNDTRACK (225ms interval ~ 120 BPM) ───
      const matchMelody = [0, 3, 4, 2, 5, 4, 3, 1, 0, 2, 4, 7, 5, 3, 2, 0];
      const matchBass = [130.81, 0, 196.0, 0, 164.81, 0, 130.81, 196.0];

      this.musicInterval = window.setInterval(() => {
        if (this.isMuted || !this.musicEnabled || !this.ctx) return;
        const vol = this.musicVolume * baseVol * this.duckMultiplier * this.fadeInMultiplier;
        try {
          const step = this.beat % matchMelody.length;
          const noteIdx = matchMelody[step];
          const freq = BALAFON_PENTATONIC[noteIdx];
          const t = this.ctx.currentTime;

          // 1. Wooden Balafon Note
          const balafon = this.ctx.createOscillator();
          const balafonGain = this.ctx.createGain();
          balafon.type = 'triangle';
          balafon.frequency.setValueAtTime(freq, t);

          balafonGain.gain.setValueAtTime(0, t);
          balafonGain.gain.linearRampToValueAtTime(0.26 * vol, t + 0.012);
          balafonGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

          balafon.connect(balafonGain);
          balafonGain.connect(this.ctx.destination);
          balafon.start(t);
          balafon.stop(t + 0.32);

          // 2. Kora Plucked Harp Harmonic (every 2nd step)
          if (step % 2 === 0) {
            const kora = this.ctx.createOscillator();
            const koraGain = this.ctx.createGain();
            kora.type = 'sine';
            kora.frequency.setValueAtTime(freq * 2, t);

            koraGain.gain.setValueAtTime(0, t);
            koraGain.gain.linearRampToValueAtTime(0.18 * vol, t + 0.01);
            koraGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.22);

            kora.connect(koraGain);
            koraGain.connect(this.ctx.destination);
            kora.start(t);
            kora.stop(t + 0.22);
          }

          // 3. Heartbeat Djembe Bass Pulse
          const bassFreq = matchBass[step % matchBass.length];
          if (bassFreq > 0) {
            const djembe = this.ctx.createOscillator();
            const djembeGain = this.ctx.createGain();
            djembe.type = 'sine';
            djembe.frequency.setValueAtTime(bassFreq, t);
            djembe.frequency.exponentialRampToValueAtTime(bassFreq * 0.5, t + 0.18);

            djembeGain.gain.setValueAtTime(0.28 * vol, t);
            djembeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            djembe.connect(djembeGain);
            djembeGain.connect(this.ctx.destination);
            djembe.start(t);
            djembe.stop(t + 0.22);
          }

          this.beat++;
        } catch {
          // Silent catch
        }
      }, 225);
    }
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.ctx && this.ctx.state === 'running') {
      try {
        // Immediately silence any scheduled music nodes
        const t = this.ctx.currentTime;
        const silencer = this.ctx.createGain();
        silencer.gain.setValueAtTime(0, t);
      } catch {}
    }
  }

  public stopAllSfx() {
    this.sfxEnabled = false;
  }

  public toggleMusic(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic(this.currentTrack);
    } else {
      this.stopMusic();
    }
  }

  /**
   * Unlock WebAudio context on first interaction (silent unlock)
   */
  public armAudioOnInteraction() {
    this.initContext();
  }
}

export const sound = new SoundManager();

// Automatically attach immediate unlock listeners on initial user gesture
if (typeof window !== 'undefined') {
  const handleFirstGesture = () => {
    sound.armAudioOnInteraction();
  };

  ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, handleFirstGesture, { passive: true });
  });

  // ─── GESTION AUTOMATIQUE DE MISE EN ARRIÈRE-PLAN (BOUTON ACCUEIL / MULTITÂCHE) ───
  // Coupe immédiatement tout son dès que l'application passe en arrière-plan
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sound.pauseForBackground();
    } else if (document.visibilityState === 'visible') {
      sound.resumeFromBackground();
    }
  });

  window.addEventListener('pagehide', () => {
    sound.pauseForBackground();
  });

  window.addEventListener('pageshow', () => {
    if (document.visibilityState === 'visible') {
      sound.resumeFromBackground();
    }
  });

  // Sur smartphone, l'ouverture du tiroir d'applications ou appui bouton Home déclenche blur
  window.addEventListener('blur', () => {
    sound.pauseForBackground();
  });

  window.addEventListener('focus', () => {
    if (document.visibilityState === 'visible') {
      sound.resumeFromBackground();
    }
  });

  // Intégration native Capacitor pour appStateChange et pause (Android & iOS)
  try {
    CapApp.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        sound.pauseForBackground();
      } else if (document.visibilityState === 'visible') {
        sound.resumeFromBackground();
      }
    });
    CapApp.addListener('pause', () => {
      sound.pauseForBackground();
    });
  } catch {}
}
