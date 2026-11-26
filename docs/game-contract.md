# 游戏契约（Game Contract）

> 每款游戏都必须实现这份契约。契约之外的依赖一律不允许。

## 1. GameDefinition

```ts
export interface GameDefinition {
  id: GameId;
  title: string;
  subtitle?: string;
  version: string;
  packageName: string;
  orientation: 'portrait';
  accent: AccentToken;
  create(ctx: GameContext): GameInstance;
  saveSchema: SaveSchema;
  daily?: DailyChallengeDefinition;
  duo?: DuoModeDefinition;
  achievements?: AchievementDefinition[];
}
```

- `id`：小写短横线，全局唯一；
- `packageName`：分包名，必须与 `game.json` 一致；
- `accent`：只允许 design-system 里的 accent token；
- `create`：同步创建，重活放 `instance.enter()`。

## 2. GameInstance

```ts
export interface GameInstance {
  enter(params?: GameEnterParams): void | Promise<void>;
  exit(): void;
  update(dt: number): void;
  render(r: RenderContext): void;
  resize(w: number, h: number): void;
  pause?(): void;
  resume?(): void;
  getSnapshot?(): GameSnapshot;
  restoreSnapshot?(s: GameSnapshot): void;
}
```

- `enter`：加载本局资源、初始化状态；
- `exit`：释放资源、取消定时器、解绑事件；
- `update`：纯逻辑 + 表现更新，不阻塞；
- `render`：只画，不改变游戏状态；
- `snapshot`：用于切后台/双人切换/崩溃恢复。

## 3. GameContext

```ts
export interface GameContext {
  readonly gameId: GameId;
  readonly renderer: Renderer;
  readonly input: InputService;
  readonly audio: AudioService;
  readonly assets: AssetService;
  readonly storage: StorageService;
  readonly cloud: CloudService;
  readonly analytics: AnalyticsService;
  readonly share: ShareService;
  readonly time: TimeService;
  readonly rng: Rng;
  readonly ui: UiFactory;
  readonly economy: EconomyService;
  readonly profile: ProfileReader;
  readonly logger: Logger;
  readonly env: GameEnv;
}
```

规则：

- 游戏不得直接 `wx.*`；
- 游戏不得直接 `localStorage`/`wx.setStorageSync`；
- 游戏不得创建全局 canvas；
- 游戏不得修改全局 theme；
- 游戏不得访问其他游戏的 storage key。

## 4. 生命周期

```
create(ctx)
  → enter()
      → load assets
      → restore save / snapshot
      → start loop
  → update/render ...
  → pause() / resume()
  → exit()
      → save
      → release assets
      → unbind
```

`exit` 必须幂等；重复调用不报错。

## 5. 存档

```ts
export interface SaveSchema<T> {
  version: number;
  default(): T;
  migrate(old: unknown, fromVersion: number): T;
  validate(data: unknown): data is T;
  merge?(local: T, remote: T): T;
}
```

- `version` 从 1 开始；
- 每次结构变更 +1，并提供 migration；
- `migrate` 必须能处理缺失字段/旧类型；
- `merge` 用于云同步冲突；
- 存档必须可 JSON 序列化；
- 不存函数/DOM/Canvas/循环引用；
- 大数组（>1000）考虑压缩/分片。

## 6. 每日挑战

```ts
export interface DailyChallengeDefinition {
  seed(date: string): number;
  create(ctx: GameContext, seed: number): DailyChallenge;
}
```

- 日期用服务器时间（离线用本地，标注）；
- 同一日期/游戏/版本结果可复现；
- 每日只结算一次；
- 失败可重试，不消耗次数。

## 7. 双人同屏

```ts
export interface DuoModeDefinition {
  minPlayers: 2;
  maxPlayers: 2;
  input: 'same-screen';
  create(ctx: GameContext, seed: number): DuoSession;
}
```

- 一台设备、两个触点；
- 轮流或同时，按游戏定义；
- 不实时联机、不匹配陌生人；
- 对外文案「双人同乐/搭档」。

## 8. 错误处理

- `enter` 失败：显示统一错误页 + 返回大厅；
- 运行中异常：捕获 → 保存快照 → 返回大厅；
- 资源缺失：占位图 + 记录；
- 云失败：不阻塞，进离线队列；
- 不允许 `alert`/`confirm`。

## 9. 分析事件

每款游戏至少上报：

- `game_enter` / `game_exit`（时长）；
- `level_start` / `level_complete` / `level_fail`；
- `daily_start` / `daily_complete`；
- `duo_start` / `duo_complete`；
- `reward_claim`；
- `error`（类型/位置，不含个人信息）。

## 10. 反馈契约（必须实现）

表现层是共享底座，游戏**不得**自造一套。详见 [motion.md](./motion.md)。

`GameContext` 已提供：

```ts
feedback.tap()                       // 点击
feedback.select()                    // 选中
feedback.invalid(x?, y?)             // 非法操作（低音 + 轻震，不做红屏）
feedback.match(comboIndex, x?, y?)   // 消除，音高随连击递增
feedback.pop(x, y)                   // 气泡/合成
feedback.drop(x, y)                  // 落地
feedback.reward(x?, y?) / coin(x, y) // 奖励
feedback.win(x?, y?) / fail()        // 结算
feedback.transition()                // 场景切换
feedback.burst(kind, x, y, scale?)   // 指定位置的粒子
```

规则：

- 游戏内**禁止**直接调用 `ctx.audio.playSfx`，必须走 `feedback`；
- 时长只用 `DURATION` 的 6 档；
- 粒子只用 `BURSTS` 的 8 个预设；
- 任何动画都必须能被 `tweens.skipAll()` 立刻结算；
- 「减少动效」开启时不得有粒子与震动；
- 无音频能力时静默降级。

**验收**：新游戏如果没实现 tap / invalid / success / reward / fail 五类反馈，不算完成。

## 11. 测试要求

- `systems/` 纯逻辑单测；
- 固定 seed 跑 1000 局 headless；
- 存档 migration 测试；
- 动画不改变玩法结果（同 seed 对照）；
- 双人输入模拟；
- 关键 UI 快照（可选）；
- 包体检查。

## 12. 模板

`src/games/_template` 提供最小实现：

```
game.ts
systems/
view/
data/
assets/
tests/
```

`npm run new:game -- --id=xxx --title=...` 复制并替换占位符。
