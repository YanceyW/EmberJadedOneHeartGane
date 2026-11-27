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
  schemaVersion: 7;
  playerId: string;           // 本地稳定 ID，用于离线兜底名字
  displayName: string;        // 王都居民-桃酥；从固定词库分配
  nameClaimed: boolean;       // 是否已同步到云端 players
  createdAt: number;
  lastLoginAt: number;
  prosperity: number;         // 王都繁荣度
  coins: number;              // 王都币；旧 stardust 自动迁移
  pantry: Record<string, number>; // 王都仓库：全馆唯一的货物库存（作物/花卉/半成品/茶饮/成菜）
  daily: {
    date: string;             // dayKey（本地日期 YYYY-MM-DD）
    claimed: string[];        // 今天已交付的委托 id
    streak: number;           // 连续全清天数
    lastClear: string;        // 上次全清的 dayKey
  };
  unlockedGames: GameId[];
  cosmetics: {
    iconStyle: string;        // candy / swap / honey
    ownedIcons: string[];
    royalOutfit: string;      // classic / garden / winter / starlight
    ownedOutfits: string[];
    weather: string;          // clear / rain / snow / petals（免费）
    style: string;            // classic / spring / lantern / harvest / frost
    ownedStyles: string[];
    tileStyle: string;        // sweets / farm / town（三消方块皮肤）
    ownedTiles: string[];
    build: { fountain: number; lights: number; garden: number };      // 当前展示等级
    buildMax: { fountain: number; lights: number; garden: number };   // 已购买最高等级
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
- `v2 → v3`：补齐 `quality/performanceMode/ambientEffects/sceneMotion/textureDetail/screenShake`，旧存档默认全部开启、画质 `auto`；
- `v3 → v4`：新增 `weather/style/ownedStyles/buildMax`；旧存档 `buildMax = build`，天气 `clear`、风格 `classic`。
- `v4 → v5`：新增 `tileStyle/ownedTiles`；旧存档默认 `sweets`，已拥有的皮肤才会被装备。
- `v5 → v6`：新增 `pantry`（王都仓库）；只保留已知食材、0–999，未知键直接丢弃。
- `v6 → v7`：新增 `daily { date, claimed, streak, lastClear }`；旧存档 `date` 为空、`claimed` 空数组、`streak` 0，跨天由 `dailySync(now)` 自动重抽。

## 4. 王都三消

```ts
interface Match3Level {
  id: number;
  title: string;
  seconds: number;   // 闯关固定 180
  target: number;    // 目标分；无尽模式为 0
  colors: number;    // 5
}

interface Match3Save {
  schemaVersion: 5;
  bestScore: number;          // 闯关最高分
  endlessBest: number;        // 无时间限制最高分
  endlessBestSeconds: number; // 无时间限制单局最长用时（秒），只做展示
  wins: number;
  unlockedLevel: number;
  stars: Record<string, number>; // "1"–"10" -> 1–3
}
```

模式：

- `campaign`：180 秒；目标分 1x/1.25x/1.5x 对应 1/2/3 星；达标后继续，时间到或提前结算结束。
- `endless`：**不计时、不限步数**，想玩多久玩多久；HUD 用正计时显示「已用时间」，随时可从「模式」或返回键退出结算。
- 两个模式共用 `save:match3`，但最高分分开；排行榜 id 分别为 `match3-campaign` / `match3-endless`。
- 方块皮肤在 `shared/content/tile-skins.ts` 定义，当前装备在 `profile.cosmetics.tileStyle`。
- 长局分数可能很大：UI 统一用 `shared/format.ts` 的 `compactNumber` 显示成 `1.2万` / `3.6亿`，存档仍存原始整数。

节奏状态（不存档）：

```ts
interface Match3Tempo {
  streak: number;       // 1–6
  lastMatchAt: number;  // 单局时钟（秒）
  windowLeft: number;   // 2 秒窗口剩余
}
```

## 5. 王都农场

```ts
interface FarmSave {
  schemaVersion: 2;
  plots: Array<{ cropId: string; plantedAt: number } | null>;
  plotsUnlocked: number;      // 6–9（初始 6，可扩建 3 块）
  orderIndex: number;
  totalHarvests: number;
  totalCoins: number;
}
```

- key：`save:farm`；
- 生长按真实时间，不按帧；
- **作物不再存在农场存档里**：收获直接进 `profile.pantry`（王都仓库），订单/一键卖出也从仓库扣；
- v1 存档里的 `inventory` 由 `legacyInventory()` 读出，进场时一次性搬进仓库并改写存档；
- 种子/开地/订单消费王都币；
- **18 种作物**，成熟时间 20s–120s（小白菜最快、葡萄最慢），名字与售价取自 `shared/content/ingredients.ts`；
- 订单 8 个循环（面粉、胡萝卜、南瓜饼、时蔬沙拉、葡萄拼盘、酸菜、菌菇、根菜）；
- 旧档缺字段由 `migrateFarmSave` 安全补齐；旧 6 块存档会补 3 个空锁定槽。

## 6. 王都花园

```ts
interface GardenPlot {
  flowerId: string;
  plantedAt: number;
  bonusMs: number;   // 浇水一次，推进 35% 生长时间
}

interface GardenSave {
  schemaVersion: 2;
  plots: Array<GardenPlot | null>; // 6 块花圃
  plotsUnlocked: number;
  orderIndex: number;
  discovered: string[];
  totalHarvests: number;
  totalCoins: number;
}
```

- key：`save:garden`；
- **9 种花**：雏菊 45s / 8 币、郁金香 75s / 16、向日葵 95s / 22、玫瑰 120s / 26、茉莉 150s / 30、菊花 165s / 32、风信子 180s / 36、桂花 200s / 40、荷花 220s / 46（名字与售价取自 `shared/content/ingredients.ts`）；
- 种子、订单消耗/产出王都币；浇水免费，每株一次；
- **v2 起不再自带 `inventory`**：花进 `profile.pantry`（王都仓库·花卉），v1 的库存由 `legacyInventory()` 一次性搬进仓库；
- 花单 6 个循环，花从仓库扣；
- 排行榜 id `garden`，分数 = 收获朵数 ×10 + 累计收入。

## 7. 王都加工屋

```ts
interface MergeSave {
  schemaVersion: 2;
  cells: number[];   // 25 格；-1 空，0–3 物品等级
  orderIndex: number;
  totalMerges: number;
  totalOrders: number;
  totalCoins: number;
  totalCrafts: number; // 原料间里磨面粉/烤面包的次数
}
```

- key：`save:merge`；
- 5×5 加工台；点两个同等级物品合成上一级；
- 加工链：莓果 → 果酱 → 蛋糕 → 宴席；
- 「进货」花 6 王都币生成物品；订单/卖二级以上成品回收王都币；
- **原料间**（第二个页签）：12 条半成品配方（面粉 / 米粉 / 挂面 / 玉米面 / 蒜蓉 / 馒头 / 酸菜 / 豆沙 / 面包 / 豆腐 / 菌菇高汤 / 饲料），产物进王都仓库；缺料可按缺口付「卖价 × 3」补齐；
- 排行榜 id `merge`，分数 = 合成次数 ×20 + 订单 ×100 + 原料加工次数 ×30。

## 8. 王都水族馆

```ts
interface TankFish {
  typeId: string;
  feeds: number;         // 3 次成熟
  lastCollectedAt: number;
}

interface AquariumSave {
  schemaVersion: 1;
  fish: Array<TankFish | null>; // 6 个鱼位
  orderIndex: number;
  totalFeeds: number;
  totalCoins: number;
}
```

- key：`save:aquarium`；
- **8 种鱼**：小金鱼 60、孔雀鱼 92、小丑鱼 140、灯鱼 170、锦鲤 220、神仙鱼 260、河豚 320、龙鱼 460；喂食 4 币/次；
- 成熟鱼每 15 秒产 1 泡泡币，单条最多攒 20；离线按真实时间计算；
- 访客订单 6 个循环，要求成熟鱼数量，奖励王都币/繁荣度；
- 排行榜 id `aquarium`，分数 = 喂食 ×5 + 收币 + 成熟鱼 ×40。

## 9. 王都餐厅

```ts
interface RestaurantSave {
  schemaVersion: 5;
  tables: string[];         // 3 张桌当前的菜（菜单 id）
  served: number;           // 累计上菜
  totalCoins: number;       // 累计点菜营业额
  bestRevenue: number;      // 营业最好成绩
  bestCombo: number;
  shifts: number;           // 营业局数
  counter: (string|null)[]; // 15 格备料台，每格一件
  stoves: StoveState[];     // 2 个 3×3 灶台（含烹饪/出锅品质）
  discovered: string[];     // 已发现配方 slug
  dailyDate: string;        // 当日日期
  dailyServed: number;      // 当日点菜上菜数
  dailyClaimed: boolean;    // 当日目标奖励是否已领
}
```

- key：`save:restaurant`；
- v1 → v2：桌子按菜单 id 重新抽；v2 → v3：补组合台与已发现配方；v3 → v4：旧 `craft` 只保留物品 id 放进备料台，计时丢弃，旧 `combo-N` 映射到稳定 slug；v4 → v5：补点菜每日目标字段；
- 三条线：**备料台/灶台**（5×3 备料台 + 2 个 3×3 灶眼，成品进 `profile.pantry`）、**点菜**（成品 → 菜价 + 繁荣度）、**营业**（无限基础材料现做现卖，不读写仓库；1–5 道订单、品质计价、打烊/退出结算）；
- 原料与成品都在 `profile.pantry`；营业成品只在本局有效；
- 排行榜 id `restaurant`，分数 = 累计点菜营业额 `totalCoins` + 营业最好成绩 `bestRevenue`。

## 10. 王都牧场

```ts
interface RanchSave {
  schemaVersion: 2;
  pens: Array<{ species: string; count: number; readyAt: number }>;
  totalProducts: number;
  totalFeeds: number;
  totalCoins: number;
  starterFeedGiven: boolean;
}
```

- key：`save:ranch`；v1 → v2 补 `starterFeedGiven`，并给首次进入的玩家送 2 份饲料；
- 四个固定畜栏（鸡/牛/猪/羊），每栏最多 4 只；
- `readyAt: 0` = 待喂食；>0 = 该时间点产出；
- 饲料消耗 `profile.pantry.feed`；牧产写回 `profile.pantry`；
- 首次收获解锁三消 `ranch` 方块皮肤；
- 排行榜 id `ranch`，分数 = 产物 ×25 + 喂食 ×2。

## 11. 每日委托

```ts
interface ProfileDaily {
  date: string;       // dayKey（本地日期 YYYY-MM-DD）
  claimed: string[];  // 今天已交付的委托 id
  streak: number;     // 连续全清天数
  lastClear: string;  // 上次全清的 dayKey
}
```

- 存在 `profile.daily`（Profile v7）；
- 每天 3 单，按 `dayKey` 从固定池确定性抽取（FNV + 洗牌），同一天同一结果；
- **点「交付」才扣货结算**：`markDailyClaimed(id, now)`；
- 3 单全清：额外 `120 王都币 / 3 繁荣度`，`streak + 1`；断一天归零；
- 不做「自动领取」、不做刷新重抽。

## 11. 双人（规划）

```ts
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

## 12. 校验

- 所有 JSON 用 schema 校验；
- 缺字段/类型错 → 构建失败；
- 内容 ID 唯一；
- 引用完整（item.next、goal.tile 等）；
- 版本号递增；
- 校验脚本：`npm run validate:content`。
