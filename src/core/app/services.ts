import { AssetService } from '../assets/assets';
import { AnalyticsService } from '../analytics/analytics';
import { AudioService } from '../audio/audio';
import { CloudService } from '../cloud/cloud';
import { InputService } from '../input/input';
import { ProfileService } from '../profile';
import { Renderer } from '../render/renderer';
import { Rng } from '../rng';
import { ShareService } from '../share/share';
import { StorageService } from '../storage/storage';
import { TimeService } from '../time/time';
import { logger } from '../utils/logger';

export interface AppServices {
  renderer: Renderer;
  input: InputService;
  audio: AudioService;
  assets: AssetService;
  storage: StorageService;
  cloud: CloudService;
  analytics: AnalyticsService;
  share: ShareService;
  time: TimeService;
  rng: Rng;
  profile: ProfileService;
  logger: typeof logger;
  openGame(gameId: string): void;
}
