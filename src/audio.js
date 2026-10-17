// Proceduralne SFX w duchu chipów z Amigi — bez żadnych plików audio.

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.rainNode = null;
    this.rainGain = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1.0;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // delikatny szum tła (wiatr)
    this.startWind();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startWind() {
    if (!this.ctx || this.windNode) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.025;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this.windNode = src;
    this.windGain = gain;
  }

  setRain(on) {
    if (!this.ctx) return;
    if (on && !this.rainNode) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 900;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      gain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.6);
      this.rainNode = src;
      this.rainGain = gain;
    } else if (!on && this.rainNode) {
      this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      const node = this.rainNode;
      const gain = this.rainGain;
      setTimeout(() => {
        try {
          node.stop();
          node.disconnect();
          gain.disconnect();
        } catch (e) {
          /* ignore */
        }
      }, 900);
      this.rainNode = null;
      this.rainGain = null;
    }
  }

  noise(dur = 0.08, gain = 0.2, freq = 1200, type = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  tone(freq, dur = 0.12, gain = 0.15, type = 'square', slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'step':
        this.noise(0.05, 0.09, 500 + Math.random() * 300);
        break;
      case 'sneak':
        this.noise(0.03, 0.03, 350);
        break;
      case 'swing':
        this.noise(0.09, 0.14, 1800, 'bandpass');
        break;
      case 'hit':
        this.noise(0.1, 0.25, 400);
        this.tone(90, 0.12, 0.25, 'sine', -40);
        break;
      case 'hurt':
        this.tone(180, 0.16, 0.2, 'sawtooth', -80);
        this.noise(0.12, 0.18, 900);
        break;
      case 'gun':
        this.noise(0.18, 0.5, 2200, 'highpass');
        this.noise(0.25, 0.4, 300);
        this.tone(70, 0.25, 0.3, 'sine', -40);
        break;
      case 'groan':
        this.tone(70 + Math.random() * 25, 0.5, Math.min(0.18, opts.vol || 0.12), 'sawtooth', -20);
        this.tone(105 + Math.random() * 30, 0.35, Math.min(0.09, (opts.vol || 0.12) * 0.5), 'triangle', -10, 0.05);
        break;
      case 'pickup':
        this.tone(660, 0.06, 0.1, 'square');
        this.tone(990, 0.08, 0.08, 'square', 0, 0.05);
        break;
      case 'eat':
        this.noise(0.08, 0.12, 700);
        this.noise(0.08, 0.1, 600);
        break;
      case 'drink':
        this.tone(300, 0.1, 0.08, 'sine', 80);
        break;
      case 'door':
        this.tone(160, 0.2, 0.12, 'sawtooth', -60);
        this.noise(0.15, 0.08, 500);
        break;
      case 'barricade':
        this.tone(220, 0.08, 0.18, 'square', -80);
        this.noise(0.08, 0.2, 800);
        break;
      case 'bump':
        this.tone(110, 0.12, 0.16, 'square', -30);
        break;
      case 'death':
        this.tone(220, 0.9, 0.22, 'sawtooth', -180);
        this.tone(110, 1.2, 0.18, 'triangle', -60, 0.2);
        break;
      case 'click':
        this.tone(520, 0.04, 0.08, 'square');
        break;
      case 'error':
        this.tone(150, 0.12, 0.12, 'square', -30);
        break;
      case 'sleep':
        this.tone(330, 0.3, 0.08, 'sine', -120);
        this.tone(220, 0.5, 0.06, 'sine', -80, 0.15);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 0.12, 'square', 0, i * 0.13));
        break;
      case 'hurtplayer':
        this.noise(0.15, 0.25, 600);
        break;
      default:
        this.tone(440, 0.06, 0.08);
    }
  }
}
