# 架构设计

> 本文是技术实现的详细说明。产品定位/阵容/预算见 `README.md`。

## 1. 目标

- 一个主包 + 多个游戏分包；
- 游戏只写独有逻辑，其余复用；
- 离线可玩，联网增强；
- 包体、内存、FPS 可度量、可降级；
- 新游戏接入成本低，且不会破坏其他游戏。

## 2. 分层

```
┌─────────────────────────────────────────────┐
│ app          组合根 App（可 import 所有下层） │
├─────────────────────────────────────────────┤
│ games/<id>   （分包，只依赖 core/shared）     │
├─────────────────────────────────────────────┤
│ lobby        （主包，依赖 core/shared）       │
├─────────────────────────────────────────────┤
│ shared       design-system / asset-library  │
│              game-kit / content / test-kit  │
├─────────────────────────────────────────────┤
│ core         scene/render/input/audio/      │
│              assets/storage/cloud/ui/...    │
├─────────────────────────────────────────────┤
│ platform     wx API 适配（唯一 wx.* 入口）    │
└─────────────────────────────────────────────┘
```

依赖只能向下。反向依赖用事件/接口/registry，不允许直接 import。

## 3. 启动流程

```
game.js
  └─ new App()
      ├─ Platform.init()            画布/DPR/安全区/音频/存储/系统信息
      ├─ AssetService.loadGroup('shared')
      ├─ CloudService.init()        失败则离线模式
      ├─ Profile.load()             本地优先
      └─ SceneManager.replace(LobbyScene)

LobbyScene
  └─ 点击场馆
      ├─ showLoading()
      ├─ wx.loadSubpackage({ name })
      ├─ 分包入口注册 GameDefinition
      ├─ GameContext 创建
      └─ SceneManager.replace(GameScene)
```

## 4. 场景生命周期

```ts
interface Scene {
  readonly key: string;
  enter(params?: unknown): void | Promise<void>;
  exit(): void;
  update(dt: number): void;
  render(ctx: RenderContext): void;
  resize(width: number, height: number): void;
  pause?(): void;
  resume?(): void;
}
```

- 同一时间只有一个活动场景；
- `enter` 可异步加载资源；
- `exit` 必须释放该场景独占资源/定时器/事件；
- `pause/resume` 处理切后台；
- 场景切换有统一过渡（淡入/滑动）。

## 5. 渲染

- 逻辑坐标：750 宽设计稿，按屏幕宽度缩放；高度自适应；
- DPR 上限 3，低端机 2；
- 每帧：`clear → 场景 render → UI overlay → flush`；
- 静态层缓存到 offscreen canvas；
- 文本用系统字体，避免字体包；
- 粒子/对象池上限；
- 低端机降级：30fps、减少粒子、关闭阴影/模糊。

## 6. 输入

- 统一 `PointerEvent`：down/move/up/cancel；
- 坐标转换到设计坐标；
- 支持多点触控（双人同屏最多 2 点）；
- UI 命中测试优先于游戏；
- 防误触：按钮最小 44×44 逻辑像素；
- 输入事件在场景切换时清空。

## 7. 音频

- `AudioService` 统一管理 BGM/SFX；
- 首次用户交互后解锁；
- SFX 池化，限制同时播放数；
- BGM 单声道/低码率循环；
- 切后台暂停，回来恢复；
- 设置里有音乐/音效开关，持久化。

## 8. 资源

- `AssetService` 管理 manifest/加载组/引用计数/图集/程序化缓存；
- 加载组：`shared` / `game:<id>` / `scene:<id>`；
- 游戏退出释放 `game:<id>` 独占资源（分包代码常驻，但纹理可释放）；
- 程序化 key：`proc:<algorithm>:<seed>:<params>`；
- 缺资源构建失败；运行时加载失败显示统一错误页。

## 9. 存档

```ts
interface SaveEnvelope<T> {
  schemaVersion: number;
  revision: number;
  updatedAt: number;
  data: T;
}
```

- 每款游戏独立 key：`save:<gameId>`；
- 大厅 profile：`profile`；
- 写入节流（≥500ms）+ 切后台强制写；
- migration 链：`v1→v2→v3`，每步纯函数 + 测试；
- 损坏存档：备份到 `save:<id>:corrupt`，重建默认存档。

## 10. 云

- `CloudService` 封装 `wx.cloud`；
- 未配置 env / 调用失败 → `offline` 状态，不抛错；
- 同步：本地先写，后台队列推送；
- 冲突：按游戏定义的 merge 函数；
- 排行榜：只提交分数/时间/必要字段，服务端校验；
- 配置：远程 config 带缓存 + 默认值。

详见 `docs/cloud.md`。

## 11. RNG

- `createRng(seed)`：xorshift128/PCG；
- 所有玩法随机必须显式传 rng；
- 每日种子：`hash(date + gameId + salt)`；
- 测试用固定 seed；
- 禁止 `Math.random()` 影响可复现结果。

## 12. UI

- 所有 UI 来自 `shared/design-system`；
- 9-slice 面板、按钮、弹窗、Toast；
- UI 层独立于场景，支持 overlay；
- 安全区适配（刘海/底部横条）；
- 动效 token 统一。

## 13. 错误处理

- 全局 `window.onerror` / promise rejection → 记录 + 友好提示；
- 游戏崩溃：返回大厅，保留存档；
- 云失败：静默降级 + 重试队列；
- 资源失败：占位图 + 重试；
- 不向用户显示堆栈。

## 14. 构建

```
gen:manifest → 生成 games-manifest / game-loaders
clean → 删除整个 dist（避免旧产物指向已移动的模块）
tsc → dist/
copy shared assets → dist/assets/
copy game assets → dist/games/<id>/assets/（随分包）
generate game.json → dist/game.json
check-size → 主包/分包预算
```

- `project.config.json` 的 `miniprogramRoot` = `dist/`；
- `cloudfunctionRoot` = `cloudfunctions/`；
- 构建产物不提交；`npm install` 的 postinstall 会在缺少 `dist/game.js` 时自动构建一次；
- `src/games/_template` 不参与编译（`tsconfig.exclude`），避免占位代码进包。

## 15. 目录与模块边界

见 README §6.6。ESLint `no-restricted-imports` 检查：

- `src/app/**` 是组合根，可以 import 所有层；其他层不得 import `src/app/**`；
- `src/core/**` 不得 import `src/lobby/**` / `src/games/**`；
- `src/games/a/**` 不得 import `src/games/b/**`；
- `src/**` 不得直接 import `wx` 全局（除 `shared/platform`）。

## 16. 分包细节

- 分包入口文件必须自行注册：

  ```ts
  GameRegistry.register(require('./game').default);
  ```

- 主包在 `wx.loadSubpackage` 成功后再执行分包入口；
- 入口通过 `src/shared/content/game-loaders.generated.ts` 里的**字面量 require** 调用。
  微信的模块系统不接受动态拼接路径（`require('../games/' + id + '/game')` 会报
  `module ... is not defined`），所以由 `tools/gen-manifest.mjs` 生成静态映射；
  新增游戏后重新 `npm run gen:manifest`（`build` 已包含）即可；
- 分包代码加载后常驻，不能卸载；
- 分包资源路径相对于分包根；
- 不使用独立分包；
- 预下载失败静默，不阻塞。

## 17. 性能

- 目标：中端安卓 60fps，低端 30fps；
- 每帧预算：逻辑 ≤ 4ms，渲染 ≤ 8ms；
- 内存：主包 + 已加载游戏 ≤ 180MB（低端机）；
- 启动：冷启动 ≤ 3s 到大厅；
- 真机 profiling 为准，不以模拟器为准。

详见 `docs/performance.md`。
