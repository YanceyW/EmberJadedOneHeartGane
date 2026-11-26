export class AudioService {
  music = true;
  sfx = true;

  setMusic(enabled: boolean): void {
    this.music = enabled;
  }

  setSfx(enabled: boolean): void {
    this.sfx = enabled;
  }

  playSfx(_name: string): void {
    if (!this.sfx) return;
    // 音频资产接入后在这里播放；当前阶段保持静音，避免包体为空时出错。
  }

  playBgm(_name: string): void {
    if (!this.music) return;
  }

  pause(): void {
    // 切后台时由后续 BGM 实现暂停。
  }

  resume(): void {
    // 返回前台时由后续 BGM 实现恢复。
  }
}
