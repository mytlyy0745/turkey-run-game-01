// All sound is synthesized with WebAudio — no audio files, no network.
// A tiny helper builds short tones and filtered noise bursts, and each
// game moment gets its own little voice: gobbles, whooshes, chimes,
// a sizzle over the oven, and a fanfare when the turkey gets away.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let wind = null;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, type) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = type || 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (muted && wind) { try { wind.stop(); } catch { /* already stopped */ } wind = null; }
      return muted;
    },
    startWind() {
      const c = ensure();
      if (!c || muted || wind) return;
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 320;
      const gain = c.createGain();
      gain.gain.value = 0.035;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
      wind = src;
    },
    gobble() { tone(420, 0.09, 'square', 0.10, 260); setTimeout(() => tone(380, 0.08, 'square', 0.09, 240), 90); },
    jump() { noise(0.16, 0.12, 900, 'bandpass'); tone(300, 0.14, 'sine', 0.06, 520); },
    land() { noise(0.08, 0.10, 300, 'lowpass'); },
    pickup(combo) {
      const base = 620 + Math.min(combo, 5) * 70;
      tone(base, 0.1, 'triangle', 0.12);
      setTimeout(() => tone(base * 1.25, 0.12, 'triangle', 0.12), 70);
    },
    pumpkin() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.13), i * 80)); },
    hit() { tone(140, 0.25, 'sawtooth', 0.16, 60); noise(0.22, 0.16, 500, 'lowpass'); },
    knife() { noise(0.28, 0.10, 2400, 'highpass'); },
    sizzle() { noise(0.4, 0.05, 5200, 'highpass'); },
    stage() { [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.12), i * 100)); },
    hide() { tone(500, 0.12, 'sine', 0.08, 700); },
    caught() { [330, 262, 196, 131].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.12), i * 160)); },
    escaped() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'triangle', 0.14), i * 120));
      setTimeout(() => noise(0.5, 0.08, 3000, 'highpass'), 500);
    },
  };
}
