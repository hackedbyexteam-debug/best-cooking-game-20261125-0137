// Dapur Senja — audio.js
// All sound is synthesized with the Web Audio API: no audio files, no
// network, just short oscillators and filtered noise. The game starts
// silent until the player's first click (browsers demand a gesture).

let audioContext = null;
let muted = false;

export function ensureAudio() {
  if (!audioContext) {
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      audioContext = new AC();
    } catch {
      audioContext = null;
    }
  }
  if (audioContext && audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type = 'sine', gainValue = 0.12, slideTo = null) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + seconds);
}

function noiseBurst(seconds, gainValue = 0.08, filterFreq = 1800) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
}

export const sfx = {
  pickup() { tone(520, 0.08, 'triangle', 0.1, 700); },
  place() { tone(340, 0.07, 'triangle', 0.1, 260); },
  chop() { noiseBurst(0.09, 0.12, 2400); tone(180, 0.06, 'square', 0.05); },
  sizzle() { noiseBurst(0.35, 0.05, 4200); },
  ding() { tone(880, 0.18, 'sine', 0.12); tone(1320, 0.25, 'sine', 0.08); },
  coin() { tone(990, 0.09, 'square', 0.07); setTimeout(() => tone(1480, 0.16, 'square', 0.07), 70); },
  bad() { tone(220, 0.25, 'sawtooth', 0.08, 140); },
  newOrder() { tone(660, 0.1, 'sine', 0.09); setTimeout(() => tone(880, 0.12, 'sine', 0.09), 90); },
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.1), i * 90)); },
  gameOver() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.1), i * 160)); },
};
