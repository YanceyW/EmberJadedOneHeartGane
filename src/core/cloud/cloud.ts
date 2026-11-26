import { platform } from '../../shared/platform/wx';
import { CLOUD_ENV } from '../../config';
import { logger } from '../utils/logger';

export type CloudStatus = 'offline' | 'connecting' | 'online';

export interface LeaderboardEntry {
  rank: number;
  score: number;
  at?: number;
}

export class CloudService {
  status: CloudStatus = 'offline';
  openid = '';
  readonly hasEnv: boolean;

  constructor(hasEnv: boolean = Boolean(CLOUD_ENV)) {
    this.hasEnv = hasEnv;
  }

  get online(): boolean {
    return this.status === 'online';
  }

  async init(): Promise<void> {
    if (!this.hasEnv || !platform.cloud.available()) {
      this.status = 'offline';
      return;
    }

    this.status = 'connecting';
    try {
      platform.cloud.init(CLOUD_ENV);
      const result = await platform.cloud.callFunction<{ openid?: string }>('login');
      this.openid = result?.openid ?? '';
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

  async submitScore(
    gameId: string,
    type: string,
    score: number,
    seed: number,
  ): Promise<{ rank: number; best: number } | null> {
    return this.call('submitScore', { gameId, type, score, seed });
  }

  async fetchLeaderboard(
    gameId: string,
    type: string,
    limit = 20,
  ): Promise<LeaderboardEntry[] | null> {
    const result = await this.call<{ entries?: LeaderboardEntry[]; error?: string }>(
      'leaderboard',
      { gameId, type, limit },
    );
    if (!result || result.error) return null;
    return result.entries ?? [];
  }}
