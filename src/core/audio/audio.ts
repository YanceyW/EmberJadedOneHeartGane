export type SfxName =
  | 'tap'
  | 'select'
  | 'invalid'
  | 'match'
  | 'combo'
  | 'reward'
  | 'coin'
  | 'win'
  | 'fail'
  | 'whoosh'
  | 'pop'
  | 'drop'
  | 'tick';

export interface SfxOptions {
  /** 半音偏移，连击时按 0/2/4 递增即可升调 */
  pitch?: number;
  volume?: number;
}

const NOISE_SECONDS = 0.4;

/**
 * 合成音效 + 文件 BGM。
 *
 * SFX 全部用 WebAudio 实时合成：包体 0 字节、音色统一、可按连击变调。
 * BGM 走 InnerAudioContext 播放包内 mp3。
 * 任何一步能力缺失都静默降级，绝不抛错阻塞游戏。
 */
export class AudioService {
  music = true;
  sfx = true;

  private ctx: any = null;
  private master: any = null;
  private musicGain: any = null;
  private sfxGain: any = null;
  private noise: any = null;
  private unlocked = false;
  private synthTried = false;
  private voices: any[] = [];
  private bgm: any = null;
  private bgmSource = '';
  private bgmFallback = '';
  private readonly failedBgm = new Set<string>();
  private currentBgm = '';
  private maxVoices = 6;

  constructor(
    private readonly synthFactory: () => any | null,
    private readonly bgmFactory: () => any | null,
  ) {}

  get hasSynth(): boolean {
    return this.ctx !== null;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  /** 首次触摸后调用：iOS/安卓都要求用户手势后才能出声。 */
  unlock(): void {
    const firstUnlock = !this.unlocked;
    if (!this.ctx && !this.synthTried) {
      this.synthTried = true;
      const ctx = this.safeCreate(this.synthFactory);
      if (ctx) {
        this.ctx = ctx;
        try {
          this.master = ctx.createGain();
          this.master.gain.value = 0.8;
          this.master.connect(ctx.destination);

          this.musicGain = ctx.createGain();
          this.musicGain.gain.value = 0.5;
          this.musicGain.connect(this.master);

          this.sfxGain = ctx.createGain();
          this.sfxGain.gain.value = 0.7;
          this.sfxGain.connect(this.master);
        } catch {
          this.ctx = null;
          this.master = null;
          this.musicGain = null;
          this.sfxGain = null;
        }
      }
    }

    this.unlocked = true;
    try {
      void this.ctx?.resume?.();
    } catch {
      // ignore
    }

    // 没有 WebAudio 时 BGM 仍可走 InnerAudioContext，所以这里不能提前 return。
    // 只在首次解锁时补启动，避免每次 touchstart 都重播 BGM。
    // 同时清掉之前的失败记录：首次手势后音频能力才真正可用，值得重试一次。
    if (firstUnlock && this.currentBgm && this.music) {
      this.failedBgm.clear();
      this.playBgm(this.currentBgm);
    }
  }

  private safeCreate(factory: () => any | null): any | null {
    try {
      return factory();
    } catch {
      return null;
    }
  }

  setMusic(enabled: boolean): void {
    this.music = enabled;
    if (!enabled) {
      this.stopBgm();
      return;
    }
    // 用户主动重新开启音乐时允许重试之前失败的资源。
    this.failedBgm.clear();
    this.bgmFallback = '';
    if (this.currentBgm) this.playBgm(this.currentBgm);
  }

  setSfx(enabled: boolean): void {
    this.sfx = enabled;
  }

  setMaxVoices(count: number): void {
    this.maxVoices = Math.max(1, count);
  }

  playSfx(name: SfxName, options: SfxOptions = {}): void {
    if (!this.sfx) return;
    if (!this.unlocked) return;
    if (!this.ctx) return;

    const pitch = 2 ** ((options.pitch ?? 0) / 12);
    const volume = options.volume ?? 1;

    try {
      switch (name) {
        case 'tap':
          this.tone('sine', 880 * pitch, 1320 * pitch, 0.04, 0.16 * volume);
          break;
        case 'select':
          this.tone('triangle', 660 * pitch, 880 * pitch, 0.07, 0.18 * volume);
          break;
        case 'invalid':
          this.tone('square', 200 * pitch, 150 * pitch, 0.13, 0.14 * volume, 900);
          break;
        case 'match':
          this.tone('sine', 660 * pitch, 990 * pitch, 0.1, 0.2 * volume);
          this.tone('triangle', 990 * pitch, 1320 * pitch, 0.08, 0.1 * volume, 0, 0.03);
          break;
        case 'combo':
          this.arp([784 * pitch, 988 * pitch, 1319 * pitch], 0.07, 0.16 * volume);
          break;
        case 'reward':
          this.tone('sine', 1046 * pitch, 1568 * pitch, 0.26, 0.2 * volume);
          this.tone('sine', 1568 * pitch, 2093 * pitch, 0.2, 0.09 * volume, 0, 0.06);
          break;
        case 'coin':
          this.tone('square', 1200 * pitch, 1800 * pitch, 0.05, 0.1 * volume, 4000);
          this.tone('square', 1800 * pitch, 2400 * pitch, 0.06, 0.09 * volume, 4000, 0.05);
          break;
        case 'win':
          this.arp([523 * pitch, 659 * pitch, 784 * pitch, 1046 * pitch], 0.09, 0.18 * volume);
          this.tone('sine', 1568 * pitch, 2093 * pitch, 0.4, 0.08 * volume, 0, 0.3);
          break;
        case 'fail':
          this.tone('sine', 400 * pitch, 240 * pitch, 0.28, 0.16 * volume, 1200);
          break;
        case 'whoosh':
          this.noiseBurst(0.18, 0.1 * volume, 900, 2400);
          break;
        case 'pop':
          this.tone('sine', 520 * pitch, 900 * pitch, 0.06, 0.14 * volume);
          this.noiseBurst(0.05, 0.05 * volume, 2000, 4000);
          break;
        case 'drop':
          this.tone('sine', 320 * pitch, 180 * pitch, 0.09, 0.12 * volume, 1400);
          break;
        case 'tick':
          this.tone('triangle', 1500 * pitch, 1100 * pitch, 0.035, 0.1 * volume, 3200);
          break;
        default:
          break;
      }
    } catch {
      // 合成失败不能影响游戏
    }
  }

  playBgm(id: string, path?: string): void {
    this.currentBgm = id;
    if (!this.music) return;
    const source = path ?? `assets/shared/bgm/${id}.mp3`;
    if (this.failedBgm.has(source)) return;

    try {
      if (!this.bgm) {
        const bgm = this.safeCreate(this.bgmFactory);
        if (!bgm) return;
        this.bgm = bgm;
        this.bgm.loop = true;
        this.bgm.obeyMuteSwitch = true;
        this.bgm.volume = 0.5;
        this.bgm.onError = (error: any) => this.handleBgmError(error);
      }
      if (this.bgmSource === source) {
        this.playBgmSafely();
        return;
      }
      // 记住上一首可用的 BGM，游戏 BGM 缺失时自动回退，而不是直接静音。
      if (this.bgmSource && !this.failedBgm.has(this.bgmSource)) {
        this.bgmFallback = this.bgmSource;
      }
      this.bgmSource = source;
      this.bgm.src = source;
      this.playBgmSafely();
    } catch {
      this.bgm = null;
      this.bgmSource = '';
    }
  }

  private handleBgmError(error?: any): void {
    const failed = this.bgmSource;
    if (!failed) return;

    // 只有「文件缺失/格式错误」才永久记住；手势未解锁等临时错误留给下一次 unlock/resume 重试。
    const code = Number(error?.errCode ?? error?.errno ?? 0);
    const message = String(error?.errMsg ?? '');
    if (code === 10003 || code === 10004 || /not found|no such file|404/i.test(message)) {
      this.failedBgm.add(failed);
    }

    const fallback = this.bgmFallback;
    if (!fallback || this.failedBgm.has(fallback)) return;

    this.bgmFallback = '';
    this.bgmSource = fallback;
    try {
      if (this.bgm) this.bgm.src = fallback;
      this.playBgmSafely();
    } catch {
      // ignore
    }
  }

  private playBgmSafely(): void {
    try {
      const result = this.bgm?.play?.();
      if (result && typeof result.catch === 'function') result.catch(() => undefined);
    } catch {
      // ignore
    }
  }

  stopBgm(): void {
    try {
      this.bgm?.stop?.();
    } catch {
      // ignore
    }
  }

  pause(): void {
    try {
      this.bgm?.pause?.();
      void this.ctx?.suspend?.();
    } catch {
      // ignore
    }
  }

  resume(): void {
    try {
      if (this.currentBgm && this.music) this.playBgm(this.currentBgm);
      void this.ctx?.resume?.();
    } catch {
      // ignore
    }
  }

  // ---- 合成基元 ----

  private track(source: any): void {
    this.voices.push(source);
    if (this.voices.length > this.maxVoices) {
      const oldest = this.voices.shift();
      try {
        oldest?.stop?.();
      } catch {
        // ignore
      }
    }
    source.onended = () => {
      const index = this.voices.indexOf(source);
      if (index >= 0) this.voices.splice(index, 1);
    };
  }

  private tone(
    type: 'sine' | 'triangle' | 'square' | 'sawtooth',
    from: number,
    to: number,
    duration: number,
    gain: number,
    filterHz = 0,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), start);
    if (to !== from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    }

    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    let last: any = env;
    if (filterHz > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterHz, start);
      env.connect(filter);
      last = filter;
    }
    last.connect(this.sfxGain);

    osc.connect(env);
    this.track(osc);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private arp(freqs: number[], step: number, gain: number): void {
    freqs.forEach((freq, index) => {
      this.tone('triangle', freq, freq, step * 2.2, gain, 0, index * step);
    });
  }

  private noiseBurst(duration: number, gain: number, lowHz: number, highHz: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;

    if (!this.noise) this.noise = this.createNoise(ctx);

    const start = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(lowHz, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(lowHz + 1, highHz), start + duration);
    filter.Q.value = 1.2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    this.track(src);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  private createNoise(ctx: any): any {
    const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x2545f491;
    for (let i = 0; i < length; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 2147483648 - 1) * 0.7;
    }
    return buffer;
  }
}
