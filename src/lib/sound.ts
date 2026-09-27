"use client";

// Web Audio API procedural sound synthesizer
// Completely self-contained, zero external audio assets, works instantly in all modern browsers.

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
}

export function toggleAudioMuted(): boolean {
  isMuted = !isMuted;
  return isMuted;
}

// Gentle cosmic grab hum
export function playGrabSound(): void {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.18);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}

// Crystalline tap chime
export function playTapSound(): void {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.26);
}

// Grand celestial alchemy transformation sound
export function playTransformSound(): void {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Celestial ascending arpeggio chords
  const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5]; // C major celestial chord
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.045;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.07, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.65);
  });

  // 2. Warm golden resonant bloom (bass swell)
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bassOsc.type = "triangle";
  bassOsc.frequency.setValueAtTime(85, now + 0.25);
  bassOsc.frequency.exponentialRampToValueAtTime(55, now + 0.9);

  bassGain.gain.setValueAtTime(0.001, now + 0.25);
  bassGain.gain.linearRampToValueAtTime(0.18, now + 0.35);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

  bassOsc.connect(bassGain);
  bassGain.connect(ctx.destination);
  bassOsc.start(now + 0.25);
  bassOsc.stop(now + 1.15);

  // 3. Stardust chime shimmer
  for (let i = 0; i < 6; i++) {
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    const st = now + 0.4 + i * 0.07;
    const f = 1200 + Math.random() * 800;

    shimmerOsc.type = "sine";
    shimmerOsc.frequency.setValueAtTime(f, st);

    shimmerGain.gain.setValueAtTime(0.04, st);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, st + 0.28);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);

    shimmerOsc.start(st);
    shimmerOsc.stop(st + 0.3);
  }
}

// Satisfying pastry squish / bounce sound
export function playSquishSound(): void {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.22);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}
