import { platform } from '../../shared/platform/wx';
import { CLOUD_ENV } from '../../config';

export type CloudStatus = 'offline' | 'connecting' | 'online';

export class CloudService {
  status: CloudStatus = 'offline';
  openid = '';

  async init(): Promise<void> {
    if (!CLOUD_ENV || !platform.cloud.available()) {
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
}
