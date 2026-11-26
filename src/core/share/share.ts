import { platform } from '../../shared/platform/wx';

export class ShareService {
  share(title: string, imageUrl?: string): void {
    platform.share(title, imageUrl);
  }
}
