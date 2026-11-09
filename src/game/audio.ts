import type { Theme } from './themes';
import { THEMES } from './themes';

export type SfxKind = 'pick' | 'place' | 'clear' | 'combo' | 'invalid' | 'over' | 'click' | 'theme';

class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private timer: number | null = null;
  private step = 0;
  sound = true;
  music = true;
  theme: Theme = THEMES[0];

  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.6; this.musicGain.connect(this.master);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.syncMusic();
  }

  setTheme(t: Theme) { this.theme = t; }
  setSound(b: boolean) { this.sound = b; }
  setMusic(b: boolean) { this.music = b; this.syncMusic(); }

  private syncMusic() {
    if (this.music && this.ctx && this.timer === null) this.timer = window.setInterval(() => this.tick(), 260);
    else if (!this.music && this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  private note(semi: number, oct = 0) { return this.theme.sound.base * Math.pow(2, (semi + oct * 12) / 12); }

  private tone(freq: number, dur: number, vol: number, type?: OscillatorType, delay = 0, slide?: number, dest?: AudioNode) {
    const c = this.ctx!; const t0 = c.currentTime + delay;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type ?? this.theme.sound.wave;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest ?? this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq: number, delay = 0, q = 1) {
    const c = this.ctx!; const t0 = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  play(kind: SfxKind, n = 1) {
    if (!this.sound || !this.ctx) return;
    const s = this.theme.sound; const sc = s.scale; const L = sc.length;
    switch (kind) {
      case 'pick': this.tone(this.note(sc[2], 1), 0.09, 0.1); break;
      case 'place': this.tone(this.note(sc[0]), 0.16, 0.16); this.noise(0.07, 0.18, s.noise); break;
      case 'clear':
        for (let i = 0; i < n + 3; i++) this.tone(this.note(sc[i % L], Math.floor(i / L) + 1), 0.28, 0.12, undefined, i * 0.055);
        this.noise(0.45, 0.22, s.noise * 0.7, 0, 0.7);
        break;
      case 'combo':
        for (let i = 0; i < 6; i++) this.tone(this.note(sc[(i * 2) % L], 2), 0.18, 0.07, 'sine', 0.1 + i * 0.04);
        this.tone(this.note(sc[0], -1), 0.6, 0.18, 'sine', 0, this.note(sc[0], 1));
        break;
      case 'invalid': this.tone(200, 0.18, 0.1, 'square', 0, 100); break;
      case 'over': for (let i = 0; i < 4; i++) this.tone(this.note(sc[(L - 1 - i + L) % L]), 0.4, 0.12, undefined, i * 0.18); break;
      case 'click': this.tone(this.note(sc[L - 1], 1), 0.05, 0.06, 'sine'); break;
      case 'theme': for (let i = 0; i < 3; i++) this.tone(this.note(sc[i * 2 % L], 1), 0.3, 0.09, undefined, i * 0.08); break;
    }
  }

  private tick() {
    if (!this.ctx || !this.music || this.ctx.state !== 'running') return;
    const st = this.step++ % 32; const sc = this.theme.sound.scale;
    if (st % 8 === 0) this.tone(this.note(sc[st % 16 === 0 ? 0 : 2], -2), 1.8, 0.06, 'sine', 0, undefined, this.musicGain);
    const h = Math.sin(st * 12.9898 + this.theme.sound.base) * 43758.5453; const r = h - Math.floor(h);
    if (r < 0.5) this.tone(this.note(sc[Math.floor(r * 97) % sc.length], st < 16 ? 0 : 1), 0.55, 0.03, this.theme.sound.music, 0, undefined, this.musicGain);
  }
}

export const sfx = new Sfx();
