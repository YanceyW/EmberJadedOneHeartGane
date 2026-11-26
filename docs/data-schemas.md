# 数据 Schema

> 所有内容数据必须可校验、可版本化、可用种子复现。

## 1. 通用

```ts
interface ContentMeta {
  id: string;
  version: number;
  tags?: string[];
}
```

## 2. 存档信封

```ts
interface SaveEnvelope<T> {
  schemaVersion: number;
  revision: number;
  updatedAt: number;
  data: T;
}
```

## 3. 玩家 Profile（大厅）

```ts
interface Profile {
  schemaVersion: 3;
  playerId: string;           // 本地稳定 ID，用于离线兜底名字
  displayName: string;        // 王都居民-桃酥；从固定词库分配
  nameClaimed: boolean;       // 是否已同步到云端 players
  createdAt: number;
  lastLoginAt: number;
  prosperity: number;         // 王都繁荣度
  coins: number;              // 王都币；旧 stardust 自动迁移
  unlockedGames: GameId[];
  cosmetics: {
    iconStyle: string;        // candy / swap / honey
    ownedIcons: string[];
    royalOutfit: string;      // classic / garden / winter / starlight
    ownedOutfits: string[];
    build: { fountain: number; lights: number; garden: number };
  };
  residents: Array<{ id: string; palette: number; since: string }>;
  lastResidentDate: string;
  settings: {
    music: boolean;
    sfx: boolean;
    haptics: boolean;
    reducedMotion: boolean;
    quality: 'auto' | 'high' | 'mid' | 'low';
    performanceMode: boolean;
    ambientEffects: boolean;
    sceneMotion: boolean;
    textureDetail: boolean;
    screenShake: boolean;
  };
}
```

迁移：

- `v1 → v2`：`stardust` → `coins`；
- `v2 → v3`：补齐 `quality/performanceMode/ambientEffects/sceneMotion/textureDetail/screenShake`，旧存档默认全部开启、画质 `auto`。

## 4. 王都三消

```ts
interface Match3Level {
  id: string;
  version: number;
  rows: number;
  cols: number;
  seconds: number;          // 固定 180s；目标分数随关卡上涨
  goals: Match3Goal[];
  blocked: Cell[];
  seed: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface Match3Goal {
  type: 'collect' | 'clear' | 'score';
  tile?: string;
  count: number;
}

interface Cell {
  r: number;
  c: number;
  type: 'empty' | 'block' | 'ice' | 'crate';
  hp?: number;
}
```

生成规则：

- 反向生成：先放目标，再倒推棋盘；
- 约束传播：保证至少一个可解交换；
- 死局检测：无可解交换时重排；
- 难度用目标分数/障碍/颜色数控制，时间固定 180 秒。

节奏状态（不存档）：

```ts
interface Match3Tempo {
  streak: number;       // 1–6
  lastMatchAt: number;  // 单局时钟（秒）
  windowLeft: number;   // 2 秒窗口剩余
}
```

## 5. 王都花园

```ts
interface FlowerGenome {
  species: string;
  color: { h: number; s: number; l: number };
  shape: 'round' | 'star' | 'bell' | 'spade';
  petals: number;             // 5–12
  size: number;               // 0.8–1.2
  fragrance: number;          // 0–1
  rarity: 1 | 2 | 3 | 4 | 5;
}

interface FlowerPlant {
  id: string;
  genome: FlowerGenome;
  stage: 'seed' | 'sprout' | 'bud' | 'bloom';
  plantedAt: number;
  wateredAt: number;
  mutated?: string;
}
```

遗传：

- 颜色：Lab 空间混合 + 少量变异；
- 形状/花瓣：孟德尔式显隐 + 随机；
- 稀有度：父母稀有度 + 变异概率；
- 所有随机用 seeded RNG。

## 6. 甜品合成屋

```ts
interface MergeItem {
  id: string;
  name: string;
  tier: number;
  next?: string;
  sell: number;
  tags: string[];
}

interface MergeOrder {
  id: string;
  items: { id: string; count: number }[];
  reward: { coins: number; xp: number };
  expiresAt?: number;
}
```

规则：

- 物品链是有向无环图；
- 合成成本指数增长；
- 订单从已解锁物品生成；
- 能量/时间约束可配置。

## 7. 王都水族馆

```ts
interface FishGenome {
  species: string;
  body: 'round' | 'long' | 'flat';
  pattern: 'solid' | 'stripe' | 'spot' | 'gradient';
  colorA: string;
  colorB: string;
  fin: 'short' | 'long' | 'fan';
  size: number;
  rarity: 1 | 2 | 3 | 4 | 5;
}

interface Fish {
  id: string;
  genome: FishGenome;
  bornAt: number;
  hunger: number;
  happiness: number;
}

interface Tank {
  id: string;
  fish: Fish[];
  decorations: string[];
  waterQuality: number;
}
```

鱼纹：

- 反应-扩散/细胞自动机生成纹理；
- 对称/渐变/斑点参数化；
- 纹理缓存为 `proc:fish-pattern:<seed>`。

## 8. 每日/双人

```ts
interface DailyTask {
  id: string;
  gameId: GameId;
  type: string;
  target: number;
  progress: number;
  reward: { coins: number };
  claimed: boolean;
}

interface DuoSession {
  id: string;
  gameId: GameId;
  seed: number;
  players: 2;
  score: number;
  startedAt: number;
  endedAt?: number;
}
```

## 9. 校验

- 所有 JSON 用 schema 校验；
- 缺字段/类型错 → 构建失败；
- 内容 ID 唯一；
- 引用完整（item.next、goal.tile 等）；
- 版本号递增；
- 校验脚本：`npm run validate:content`。
