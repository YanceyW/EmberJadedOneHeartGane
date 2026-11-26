import { AssetService } from '../assets/assets';
import { AnalyticsService } from '../analytics/analytics';
import { AudioService } from '../audio/audio';
import { CloudService } from '../cloud/cloud';
import { CloudSaveService } from '../cloud/cloud-save';
import { HapticsService } from '../haptics/haptics';
import { InputService } from '../input/input';
import { ParticleSystem } from '../particles/particles';
import { ProfileService } from '../profile';
import { QualityService } from '../quality/quality';
import { Renderer } from '../render/renderer';
import { Rng } from '../rng';
import { ShareService } from '../share/share';
import { StorageService } from '../storage/storage';
import { TimeService } from '../time/time';
import { logger } from '../utils/logger';
import { Feedback } from '../../shared/game-kit/feedback';
import { SpriteAtlas } from '../../shared/design-system/sprite-atlas';

export interface AppServices {
  renderer: Renderer;
  input: InputService;
  audio: AudioService;
  assets: AssetService;
  storage: StorageService;
  cloud: CloudService;
  cloudSave: CloudSaveService;
  analytics: AnalyticsService;
  share: ShareService;
  time: TimeService;
  rng: Rng;
  profile: ProfileService;
  logger: typeof logger;
  // ---- 表现层（B1 底座）----
  feedback: Feedback;
  particles: ParticleSystem;
  haptics: HapticsService;
  quality: QualityService;
  atlas: SpriteAtlas;
  debugStats?(): { fps: number; frameMs: number; particles: number; tier: string };
  openGame(gameId: string): void;
}
