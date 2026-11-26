import { StorageService } from '../storage/storage';

export interface SyncPayload<T> {
  revision?: number;
  data?: T;
  conflict?: boolean;
  error?: string;
}

export interface CloudCaller {
  readonly online: boolean;
  call<T>(name: string, data?: Record<string, unknown>): Promise<T | null>;
}

export type MergeFn<T> = (local: T, remote: T) => T;

export interface SyncOutcome<T> {
  data: T;
  synced: boolean;
}

export class CloudSaveService {
  constructor(
    private readonly cloud: CloudCaller,
    private readonly storage: StorageService,
  ) {}

  async syncGame<T>(gameId: string, local: T, merge: MergeFn<T>): Promise<SyncOutcome<T>> {
    if (!this.cloud.online) return { data: local, synced: false };

    const key = `cloud:revision:${gameId}`;
    const baseRevision = this.storage.get<number>(key, 0);

    const first = await this.cloud.call<SyncPayload<T>>('sync', {
      gameId,
      baseRevision,
      data: local,
    });
    if (!first || first.error) return { data: local, synced: false };

    if (!first.conflict) {
      if (typeof first.revision === 'number') this.storage.set(key, first.revision);
      return { data: local, synced: true };
    }

    const merged = first.data ? merge(local, first.data) : local;
    const revision = typeof first.revision === 'number' ? first.revision : baseRevision;
    this.storage.set(key, revision);

    const second = await this.cloud.call<SyncPayload<T>>('sync', {
      gameId,
      baseRevision: revision,
      data: merged,
    });
    if (second && !second.error && !second.conflict && typeof second.revision === 'number') {
      this.storage.set(key, second.revision);
    }

    return { data: merged, synced: true };
  }

  resetRevision(gameId: string): void {
    this.storage.remove(`cloud:revision:${gameId}`);
  }
}
