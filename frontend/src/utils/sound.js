// Web Audio API Synthesizer for Kuizila
// 100% offline, zero external audio asset dependencies, crisp low-latency sound effects

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("kuizila_sound_muted") === "true";
    this.musicAudio = null;
    this.currentTrack = null; // 'lobby' | 'gameplay' | null
    this.desiredTrack = null; // remembers what should be playing if blocked by browser autoplay
    this.isAutoplayBlocked = false;
    this.musicVolume = 0.45;
    this.listeners = new Set();
    this.setupInteractionListeners();
  }

  setupInteractionListeners() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.init();
      // If we had a requested track that was suspended/blocked by browser autoplay, start it now!
      if (!this.muted && this.desiredTrack) {
        if (this.musicAudio && this.musicAudio.paused) {
          this.musicAudio.play().then(() => {
            this.isAutoplayBlocked = false;
            this.notify();
          }).catch(() => {});
        } else if (this.desiredTrack === 'lobby') {
          this.playLobbyMusic();
        } else if (this.desiredTrack === 'gameplay') {
          this.playGameplayMusic();
        }
      }
    };

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => {
      try { fn(this.muted, this.isAutoplayBlocked); } catch (e) {}
    });
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    // If audio was blocked by browser autoplay policy, clicking unmute immediately plays it!
    if (this.isAutoplayBlocked) {
      this.muted = false;
      this.isAutoplayBlocked = false;
      localStorage.setItem("kuizila_sound_muted", "false");
      if (this.desiredTrack === 'lobby') {
        this.playLobbyMusic();
      } else if (this.desiredTrack === 'gameplay') {
        this.playGameplayMusic();
      } else if (this.musicAudio) {
        this.musicAudio.play().then(() => {
          this.isAutoplayBlocked = false;
          this.notify();
        }).catch(() => {});
      }
      this.notify();
      return this.muted;
    }

    this.muted = !this.muted;
    localStorage.setItem("kuizila_sound_muted", this.muted ? "true" : "false");
    if (this.muted) {
      if (this.musicAudio) {
        this.musicAudio.pause();
      }
    } else {
      if (this.desiredTrack === 'lobby') {
        this.playLobbyMusic();
      } else if (this.desiredTrack === 'gameplay') {
        this.playGameplayMusic();
      } else if (this.musicAudio && this.musicAudio.paused) {
        this.musicAudio.play().then(() => {
          this.isAutoplayBlocked = false;
          this.notify();
        }).catch(() => {});
      }
    }
    this.notify();
    return this.muted;
  }

  // ---------------- SOUNDTRACKS (Kahoot Lobby & Continuous Gameplay Loop) ----------------
  playLobbyMusic() {
    this.desiredTrack = 'lobby';
    if (this.muted) return;

    // If lobby music is ALREADY actively playing, do not restart or interrupt it!
    if (this.currentTrack === 'lobby' && this.musicAudio && !this.musicAudio.paused) {
      this.isAutoplayBlocked = false;
      return;
    }

    this.stopMusic(false);
    try {
      this.musicAudio = new Audio('/audio/lobby.mp3');
      this.musicAudio.loop = true; // Loops seamlessly without ending
      this.musicAudio.volume = this.musicVolume;
      this.currentTrack = 'lobby';

      const playPromise = this.musicAudio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            this.isAutoplayBlocked = false;
            this.notify();
          })
          .catch((err) => {
            this.isAutoplayBlocked = true;
            this.notify();
            console.warn('[Kuizila Sound] Lobby autoplay blocked. Music will start on user click/touch:', err.message);
          });
      }
    } catch (e) {
      console.warn('[Kuizila Sound] Could not play lobby soundtrack:', e);
    }
  }

  // Continuous gameplay loop across ALL questions (won't restart or cut out on each question)
  playGameplayMusic() {
    this.desiredTrack = 'gameplay';
    if (this.muted) return;

    // CRITICAL: If gameplay music is already actively playing, KEEP IT GOING!
    // Do not restart on every question. It runs as one continuous energetic loop.
    if (this.currentTrack === 'gameplay' && this.musicAudio && !this.musicAudio.paused) {
      this.isAutoplayBlocked = false;
      return;
    }

    this.stopMusic(false);
    try {
      this.musicAudio = new Audio('/audio/countdown_60s.mp3');
      this.musicAudio.loop = true; // Seamless continuous loop that never ends during quiz!
      this.musicAudio.volume = this.musicVolume;
      this.currentTrack = 'gameplay';

      const playPromise = this.musicAudio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            this.isAutoplayBlocked = false;
            this.notify();
          })
          .catch((err) => {
            this.isAutoplayBlocked = true;
            this.notify();
            console.warn('[Kuizila Sound] Gameplay autoplay blocked. Music will start on user click/touch:', err.message);
          });
      }
    } catch (e) {
      console.warn('[Kuizila Sound] Could not play gameplay soundtrack:', e);
    }
  }

  // Alias for backward compatibility
  playCountdownMusic(timeLimit = 30) {
    this.playGameplayMusic();
  }

  stopMusic(clearDesired = true) {
    if (clearDesired) {
      this.desiredTrack = null;
    }
    this.isAutoplayBlocked = false;
    if (this.musicAudio) {
      try {
        this.musicAudio.pause();
        this.musicAudio.currentTime = 0;
      } catch (e) {}
      this.musicAudio = null;
      this.currentTrack = null;
    }
    this.notify();
  }

  // Chime when participant joins
  playJoin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Timer tick (normal or urgent)
  playTimerTick(isUrgent = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = isUrgent ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(isUrgent ? 880 : 440, now);

    gain.gain.setValueAtTime(isUrgent ? 0.08 : 0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Correct answer bell/chord
  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (Major)

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.12, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });
  }

  // Incorrect answer soft buzz
  playIncorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.25);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Fanfare on quiz completion
  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.15 },
      { f: 659.25, t: 0.15, d: 0.15 },
      { f: 783.99, t: 0.3, d: 0.2 },
      { f: 1046.50, t: 0.5, d: 0.6 }
    ];

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.15, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);
    });
  }

  // Battle Start horn / energetic brass fanfare
  playBattleStart() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const battleChords = [
      { f: 440, t: 0.0, d: 0.12 },
      { f: 554.37, t: 0.12, d: 0.12 },
      { f: 659.25, t: 0.24, d: 0.14 },
      { f: 880, t: 0.38, d: 0.45 }
    ];

    battleChords.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.12, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);
    });
  }

  // Power-up activated magic shimmer
  playPowerup() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  // Level-Up celebration arpeggio
  playLevelUp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [440, 554, 659, 880, 1108]; // A Major scale
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + idx * 0.08);

      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  // Eliminated tone (Battle Royale defeat)
  playEliminated() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.5);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  // Achievement Badge Unlock chime
  playBadgeUnlock() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [784, 988, 1175, 1568]; // G major crystalline arpeggio
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + idx * 0.07);

      gain.gain.setValueAtTime(0.14, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.4);
    });
  }
}

export const sound = new SoundEngine();

