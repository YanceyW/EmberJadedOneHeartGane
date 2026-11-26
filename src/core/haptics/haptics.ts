import { platform } from '../../shared/platform/wx';

const MIN_INTERVAL = 80;

export class HapticsService {
  private enabled = true;
  private lastAt = 0;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  light(): void {
    this.fire('light');
  }

  medium(): void {
    this.fire('medium');
  }

  success(): void {
    this.fire('medium');
  }

  fail(): void {
    this.fire('light');
  }

  private fire(type: 'light' | 'medium'): void {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastAt < MIN_INTERVAL) return;
    this.lastAt = now;
    platform.vibrate(type);
  }
}
