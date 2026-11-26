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
  schemaVersion: number;
  playerId?: string;          // openid，云端返回
  nickname?: string;          // 可选，默认「小国王」
  createdAt: number;
  lastLoginAt: number;
  prosperity: number;         // 王都繁荣度
  stardust: number;           // 通用货币
  unlockedGames: GameId[];
  collectibles: Record<string, number>;
  daily: {
    date: string;
    tasks: DailyTask[];
    claimed: string[];
  };
  settings: {
    music: boolean;
    sfx: boolean;
    haptics: boolean;
  };
}
```

## 4. 王都三消

```ts
interface Match3Level {
  id: string;
  version: number;
  rows: number;
  cols: number;
  moves: number;
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
- 难度用目标数/障碍/颜色数控制。

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
  reward: { stardust: number; xp: number };
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
  reward: { stardust: number };
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
