import { platform } from '../../shared/platform/wx';
import { CLOUD_ENV } from '../../config';
import { logger } from '../utils/logger';

export type CloudStatus = 'offline' | 'connecting' | 'online';

export interface LeaderboardEntry {
  rank: number;
  score: number;
  name?: string;
  at?: number;
}

export class CloudService {
  status: CloudStatus = 'offline';
  openid = '';
  displayName = '';
  readonly hasEnv: boolean;

  constructor(hasEnv: boolean = Boolean(CLOUD_ENV)) {
    this.hasEnv = hasEnv;
  }

  get online(): boolean {
    return this.status === 'online';
  }

  async init(preferredName?: string): Promise<void> {
    if (!this.hasEnv || !platform.cloud.available()) {
      this.status = 'offline';
      return;
    }

    this.status = 'connecting';
    try {
      platform.cloud.init(CLOUD_ENV);
      const result = await platform.cloud.callFunction<{
        openid?: string;
        displayName?: string;
      }>('login', preferredName ? { preferredName } : undefined);
      this.openid = result?.openid ?? '';
      this.displayName = result?.displayName ?? '';
      this.status = this.openid ? 'online' : 'offline';
    } catch {
      this.status = 'offline';
    }
  }

  // 云调用统一返回 null 表示「不可用/失败」，调用方不需要 try/catch。
  async call<T>(name: string, data?: Record<string, unknown>): Promise<T | null> {
    if (!this.online) return null;
    try {
      return await platform.cloud.callFunction<T>(name, data);
    } catch (error) {
      logger.warn(`cloud call ${name} failed`, error);
      return null;
    }
  }

  async rename(preferredName: string): Promise<string | null> {
    const result = await this.call<{ displayName?: string; error?: string }>('login', {
      preferredName,
      forceName: true,
    });
    const name = result?.displayName ?? '';
    if (name) this.displayName = name;
    return name || null;
  }

  async submitScore(
    gameId: string,
    score: number,
    seed: number,
    displayName?: string,
  ): Promise<{ rank: number; best: number } | null> {
    return this.call('submitScore', { gameId, score, seed, displayName });
  }

  async fetchLeaderboard(gameId: string, limit = 20): Promise<LeaderboardEntry[] | null> {
    const result = await this.call<{ entries?: LeaderboardEntry[]; error?: string }>(
      'leaderboard',
      { gameId, limit },
    );
    if (!result || result.error) return null;
    return result.entries ?? [];
  }
}
