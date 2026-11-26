import { platform } from '../../shared/platform/wx';

export class StorageService {
  get<T>(key: string, fallback: T): T {
    const raw = platform.storage.get(key);
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    }
    return raw as T;
  }

  set<T>(key: string, value: T): void {
    platform.storage.set(key, JSON.stringify(value));
  }

  remove(key: string): void {
    platform.storage.remove(key);
  }

  clear(): void {
    platform.storage.clear();
  }
}
