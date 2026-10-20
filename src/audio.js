/**
 * Audio del juego: SFX sintetizados + música desde archivos.
 *
 * SFX: Web Audio sintetizado (sin archivos). Música: archivos MP3/OGG/WAV
 * en public/assets/music/ (ver LEEME.md ahí para la convención de nombres).
 *
 *   audio.unlock()                    con el primer gesto del jugador
 *   audio.play('hit', { strength })   efecto de sonido
 *   audio.playMusic('menu')           música de fondo ('menu'|'battle'|'results')
 *   audio.stopMusic()                 para la música con fade
 *   audio.toggleMute()                mute general (M)
 */
let ctx = null;
let master = null;
let muted = false;

// ------------------------------------------------------------------ música
const MUSIC_BASE = '/assets/music/';
const musicCache = new Map();     // nombre → AudioBuffer (ya decodificado)
const musicPending = new Map();   // nombre → Promise<AudioBuffer|null> (fetch en curso)
let musicSource = null;           // AudioBufferSourceNode actual
let musicGain = null;             // GainNode de la música (para fade)
let musicName = null;             // nombre de la pista actual
let musicWant = null;             // pista que el juego pidió (si el load termina después, la arranca)
const MUSIC_VOL = 0.45;           // volumen base de la música (los SFX van arriba)
const MUSIC_TRACKS = ['menu', 'battle']; // pistas que existen (se precargan todas)

/** Descarga + decodifica una pista. Se cachea y no reintenta si no existe. */
async function loadMusic(name) {
  if (musicCache.has(name)) return musicCache.get(name);
  if (musicPending.has(name)) return musicPending.get(name);
  const p = (async () => {
    for (const ext of ['mp3', 'ogg', 'wav']) {
      try {
        const res = await fetch(`${MUSIC_BASE}${name}.${ext}`);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        musicCache.set(name, decoded);
        return decoded;
      } catch { /* probar siguiente ext */ }
    }
    musicCache.set(name, null);
    return null;
  })();
  musicPending.set(name, p);
  return p;
}

/** Arranca una pista ya cacheada (sin fade largo: arranca casi de una). */
function startMusicNow(buffer) {
  stopMusicNow(0.15);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = MUSIC_VOL; // sin fade-in: arranca al toque
  src.connect(g).connect(master);
  src.start();
  musicSource = src;
  musicGain = g;
  musicName = musicWant;
}

/** Detiene la música actual con fade corto. */
function stopMusicNow(fade = 0.2) {
  if (!musicSource || !musicGain) return;
  const src = musicSource;
  const g = musicGain;
  musicSource = null;
  musicGain = null;
  musicName = null;
  try {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
    src.stop(ctx.currentTime + fade + 0.05);
  } catch { /* ya parado */ }
}

function noise(c, dur) {
  const safeDur = Math.max(0.01, Number.isFinite(dur) ? dur : 0.1);
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * safeDur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function san(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

function tone(c, t, { type = 'sine', from, to, dur, gain = 0.2 }) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(c, t, { dur, gain = 0.2, freq = 1200, q = 0.7 }) {
  const n = noise(c, dur);
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g).connect(master);
  n.start(t);
}

const SFX = {
  hit: (c, t, s = 0.5) => {
    s = san(s);
    hiss(c, t, { dur: 0.12 + s * 0.12, gain: 0.25 + s * 0.3, freq: 900 });
    tone(c, t, { type: 'triangle', from: 180 - s * 60, to: 50, dur: 0.18 + s * 0.12, gain: 0.3 + s * 0.3 });
  },
  attack: (c, t) => hiss(c, t, { dur: 0.09, gain: 0.1, freq: 2200, q: 0.9 }),
  jump: (c, t) => tone(c, t, { type: 'square', from: 260, to: 520, dur: 0.1, gain: 0.07 }),
  doubleJump: (c, t) => tone(c, t, { type: 'square', from: 360, to: 760, dur: 0.12, gain: 0.07 }),
  land: (c, t) => hiss(c, t, { dur: 0.07, gain: 0.12, freq: 400 }),
  shot: (c, t) => tone(c, t, { type: 'sawtooth', from: 900, to: 300, dur: 0.16, gain: 0.08 }),
  ko: (c, t) => {
    tone(c, t, { type: 'sawtooth', from: 520, to: 40, dur: 0.9, gain: 0.25 });
    hiss(c, t, { dur: 0.5, gain: 0.3, freq: 600, q: 0.3 });
  },
  respawn: (c, t) => tone(c, t, { type: 'sine', from: 400, to: 1200, dur: 0.3, gain: 0.12 }),
  beep: (c, t) => tone(c, t, { type: 'square', from: 440, dur: 0.18, gain: 0.12 }),
  go: (c, t) => tone(c, t, { type: 'square', from: 880, dur: 0.4, gain: 0.14 }),
  win: (c, t) => [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.13, { type: 'triangle', from: f, dur: 0.3, gain: 0.16 })),
  ui: (c, t) => tone(c, t, { type: 'sine', from: 660, dur: 0.07, gain: 0.08 }),
};

export const audio = {
  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);
      // precargar todas las pistas en background: cuando playMusic las pida,
      // ya están decodificadas y arrancan al toque (sin el delay de fetch+decode)
      for (const t of MUSIC_TRACKS) loadMusic(t);
    }
    if (ctx.state === 'suspended') ctx.resume();
  },
  play(name, strength) {
    if (!ctx || ctx.state !== 'running') return;
    SFX[name]?.(ctx, ctx.currentTime + 0.005, strength);
  },
  /**
   * Reproduce música de fondo. name: 'menu' | 'battle'
   * Si ya está cacheada, arranca instantáneamente. Si no, la carga y la
   * arranca apenas termine (sin bloquear el juego).
   */
  playMusic(name) {
    if (!ctx || ctx.state !== 'running') return;
    if (musicName === name && musicSource) return; // ya suena
    musicWant = name;
    const cached = musicCache.get(name);
    if (cached) {
      // ya decodificada: arranca de una
      startMusicNow(cached);
    } else {
      // todavía cargando: arrancar apenas esté lista (si el usuario no pidió otra)
      loadMusic(name).then((buf) => {
        if (buf && musicWant === name && ctx?.state === 'running') startMusicNow(buf);
      });
    }
  },
  /** Para la música con fade. */
  stopMusic(fade = 0.3) {
    musicWant = null;
    stopMusicNow(fade);
  },
  toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.7;
    return muted;
  },
  /** Traduce un evento de la simulación a sonido. */
  onEvents(events) {
    for (const e of events) {
      if (e.type === 'hit') this.play('hit', san(Math.min(1, san(e.kb) / 22)));
      else if (e.type === 'attack') this.play('attack');
      else if (e.type === 'jump') this.play(e.double ? 'doubleJump' : 'jump');
      else if (e.type === 'land' && san(e.speed) > 6) this.play('land');
      else if (e.type === 'shot') this.play('shot');
      else if (e.type === 'ko') this.play('ko');
      else if (e.type === 'respawn') this.play('respawn');
      else if (e.type === 'countdown') this.play('beep');
      else if (e.type === 'go') this.play('go');
      else if (e.type === 'win') this.play('win');
      // Nuevos eventos de PabloQuemandoRuedas
      else if (e.type === 'swordSlashStart') this.play('attack');
      else if (e.type === 'swordSlashLand') this.play('hit', 0.8);
      else if (e.type === 'blockFormStart') this.play('attack');
      else if (e.type === 'blockFormLand') this.play('hit', 1.0);
      else if (e.type === 'blockFormEnd') this.play('land');
      else if (e.type === 'stanceSwitch') this.play('ui');
      else if (e.type === 'boost') this.play('jump');
      else if (e.type === 'armor') this.play('beep');
      // Eventos de los 5º personaje (Chubitcoin) y especiales del barrio
      else if (e.type === 'burst') this.play('go');
      else if (e.type === 'counter') this.play('armor');
      else if (e.type === 'magnet') this.play('shot');
      else if (e.type === 'inhale') this.play('land');
    }
  },
};
