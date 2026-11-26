# 休闲王都

> 一个微信小游戏合集：在大厅里逛王都街区，随时进入不同的小游戏。
> 个人主体、公开正式发行、纯休闲 2D、竖屏、大厅 + 分包加载。

---

## 0. 先看这里

这个仓库不是「一个游戏」，而是「一个能持续装进很多小游戏的平台」。

- **公开名称**：休闲王都
- **产品形态**：大厅（王都街区）+ 多个场馆（小游戏）
- **首发四款**：王都三消、王都花园、甜品合成屋、王都水族馆
- **技术底座**：TypeScript + 自研轻量 Canvas 2D 运行时，单运行时、多玩法
- **商业目标**：先做成可玩的合集，后续再考虑激励视频广告；不做内购、不做抽卡
- **合规底线**：只做休闲类目，避开文化互动、角色类、牌类、UGC、聊天、恋爱叙事

**唯一事实来源**：本 README + `docs/` + `AGENTS.md`。聊天记录不是。

---

## 1. 为什么是合集，而不是单款

单款小游戏的风险是「做完即巅峰」：买量贵、内容消耗快、用户没有回来的理由。
合集的风险是「包体、加载、风格分裂、每款都不够深」。

本项目的解法：

1. **大厅做留存**：每日委托、收集册、王都繁荣度、赛季，让用户有理由每天回来。
2. **分包做容量**：主包只放大厅/核心/共享，每款游戏独立分包，按需加载。
3. **统一运行时做复用**：UI、存档、云、广告、分析、音频、输入、资源管理只写一次。
4. **统一视觉做品牌**：四款游戏并排看像同一个世界，而不是四个外包 Demo。
5. **程序化 + 素材混合做包体**：UI/背景/图案/关卡用算法生成并缓存，角色/关键图用位图。

---

## 2. 产品定位与非目标

### 2.1 目标用户

- 喜欢轻松、可爱、低压力玩法的泛休闲用户；
- 女性向、情侣/双人同乐、亲子轻玩法；
- 不想注册、不想加好友、不想看长广告，只想「点开就玩」的人。

### 2.2 体验目标

- **3 秒进大厅，10 秒进游戏**；
- 单手竖屏可玩；
- 一局 1–3 分钟，随时可停；
- 离线可玩，联网只增强（云存档、排行榜、每日内容）；
- 不强制登录、不强制分享、不强制看广告。

### 2.3 明确不做

- 不做重度 3D、开放世界、实时联机对战；
- 不做文化互动、角色类、牌类（个人主体类目限制）；
- 不做 UGC、聊天、陌生人社交、公会；
- 不做抽卡、内购、恋爱/乙女/虚拟恋人叙事；
- 不做「看广告才能继续」的强制广告；
- 不做第三方游戏聚合或外链。

---

## 3. 平台与合规约束（硬约束）

| 约束 | 结论 | 影响 |
|---|---|---|
| 个人主体类目 | 不能选文化互动、角色类、牌类 | 所有玩法必须收敛到「休闲」 |
| 主包大小 | ≤ 4MB | 本项目目标 ≤ 3MB，硬门禁 3.2MB |
| 主包 + 分包 | ≤ 30MB | 首发控制在 ~10MB，给后续留空间 |
| 普通单个分包 | 官方文档不限制大小 | 仍按 ≤ 2MB/款控制 |
| 独立分包 | ≤ 4MB | 本项目不用独立分包 |
| 屏幕方向 | 一个 `game.json` 只能一种 | 全竖屏 portrait |
| 分包生命周期 | 加载后常驻，不能卸载 | 内存预算必须按「玩过的游戏都常驻」算 |
| IAA | 小游戏备案 + 小程序备案 | 单机可先小游戏备案；联机必须完成小程序备案 |
| 广告 | 流量主当前口径 UV > 500 | 广告后置，不阻塞首发 |
| 防沉迷 | 无 IAP 由平台统一接入 | 仍需适龄提示（建议 8+） |
| 隐私 | 需隐私协议、数据删除入口 | 只拿 openid，不拿头像昵称 |

> 类目、备案、广告政策会变。每次提审前必须重新核对官方文档，不以本文为最终法律依据。

---

## 4. 产品结构

```
休闲王都
├── 大厅（王都街区）
│   ├── 场馆入口：三消 / 花园 / 合成 / 水族馆
│   ├── 每日委托
│   ├── 收集册
│   ├── 王都繁荣度
│   ├── 排行榜 / 周榜
│   ├── 双人广场
│   └── 设置 / 隐私 / 版本 / 删除数据
├── 小游戏（各自分包）
│   ├── 王都三消
│   ├── 王都花园
│   ├── 甜品合成屋
│   └── 王都水族馆
└── 共享层
    ├── 核心运行时
    ├── 设计系统
    ├── 资产库
    ├── 游戏工具箱
    ├── 内容 schema
    ├── 平台适配
    └── 测试工具
```

### 4.1 大厅是什么

不是「游戏选择列表」，而是「王都街区」：

- 每个场馆是一栋小建筑，带招牌、灯光、排队小人；
- 有进度时显示气泡（“今日新订单”“鱼缸有新鱼”）；
- 点击场馆 → 加载分包 → 进入游戏；
- 首次进入显示 3 秒加载动画 + 一句玩法提示；
- 大厅本身不消耗体力、不设强制日常。

### 4.2 首发四款

#### 王都三消

- 核心：6×8 棋盘，交换相邻，3 连消除，步数/目标双约束；
- 深度：反向生成保证可解、连锁、道具组合、每日挑战、周赛；
- 长线：关卡包、三星、收集册、装饰大厅；
- 双人：同屏接力，一人一步，共享目标；
- 包体目标：≤ 2MB。

#### 王都花园

- 核心：种花 → 浇水/施肥 → 开花 → 订单/图鉴；
- 深度：孟德尔遗传（花色/花形/花期）、Lab/HSV 颜色混合、L-system 花瓣；
- 长线：品种收集、花园布置、季节花、访客订单；
- 双人：一人浇水一人修剪，共享花园；
- 包体目标：≤ 2MB。

#### 甜品合成屋

- 核心：合并相同甜品 → 解锁新甜品 → 完成订单；
- 深度：物品链图、指数成本、订单生成、能量/时间约束；
- 长线：图鉴、店铺装饰、每日订单、限定甜品；
- 双人：同屏合并，共享订单；
- 包体目标：≤ 2MB。

#### 王都水族馆

- 核心：养鱼 → 繁育 → 鱼纹变化 → 造景 → 访客订单；
- 深度：反应-扩散/细胞自动机鱼纹、对称、Boids 鱼群；
- 长线：鱼种图鉴、造景、访客评分、赛季鱼；
- 双人：一人喂鱼一人清理，共享鱼缸；
- 包体目标：≤ 2MB。

### 4.3 后续扩充池（按风险从低到高）

低风险优先：

- 猫咪咖啡馆（经营/放置）
- 手作工坊（拼图/制作）
- 星光观星台（连线/收集）
- 双人广场（同屏小游戏合集）
- 小屋收纳（整理/收纳）
- 每日拼图（拼图）
- 便当摆盘（摆放/订单）
- 服装店经营（换装/经营，注意不做角色类）
- 旅行手账（收集/拼图）
- 音乐盒（节奏/点击）

中风险（需类目确认）：

- 香水调香（调配/收集）
- 首饰设计（搭配/制作）
- 香薰蜡烛（制作/订单）
- 花园造景（装饰）
- 水族造景（装饰）

高风险/不做：

- 你画我猜（UGC + 文化互动）
- 狼人杀/剧本杀（文化互动）
- 扑克/麻将/卡牌对战（牌类）
- 恋爱/乙女/虚拟恋人（角色类 + 内容风险）
- 开放聊天/公会/陌生人社交

> 扩充原则：先做「无 UGC、无聊天、无抽卡、无角色扮演」的轻玩法；每加一款都要重新确认类目。

---

## 5. 视觉系统（统一风格）

### 5.1 一句话风格

**奶油童话 + 手账质感 + Q 版圆润**：奶油白底、薄荷/翡翠主色、蜜桃/暖金强调、浅紫辅助；圆角厚描边、左上暖光、3 阶明暗；不写实、不赛博、不暗黑。

### 5.2 设计 token

| 类别 | 规则 |
|---|---|
| 形状 | 圆角 + 厚描边；角色 2.5 头身，吉祥物 2 头身 |
| 描边 | 2–3px（750 设计宽度）；圆头笔触；深棕/深墨绿，不用纯黑 |
| 色彩 | 奶油白 + 薄荷/翡翠 + 蜜桃/暖金 + 浅紫 |
| 光照 | 左上暖光；柔和环境光；3 阶明暗 |
| 材质 | 纸张颗粒、水彩边缘、柔和渐变；不用照片纹理 |
| 圆角 | 8/12/16/24 |
| 间距 | 4/8/12/16/24/32 |
| 字号 | 20/24/28/32/40；系统字体；行高 1.35–1.5 |
| 动效 | 120/180/240/320ms；ease-out-back 只用于奖励 |
| 阴影 | 0 4 12 rgba(58,46,42,0.18) |
| 图标 | 同一套线性+面性混合；圆头端点；统一视觉重量 |
| 音频 | 同一套 UI/奖励 SFX；每款只换 BGM/主题音效 |

### 5.3 颜色 token（初版）

- `cream #FFF6E9`、`paper #FFFDF8`、`ink #3A2E2A`
- `jade #2F8F7B`、`mint #A8E6CF`、`teal #1F5F55`
- `peach #FFB7A5`、`coral #F27D72`、`gold #F2C14E`
- `lilac #C9B6E4`、`sky #BFE3F2`
- 每款 accent：三消=薄荷/莓果；花园=叶绿/花瓣；合成=蜂蜜/奶油；水族馆=水蓝/浅紫

### 5.4 视觉验收

- 四款游戏截图并排：颜色、描边、圆角、按钮、字体、动效节奏必须像同一产品；
- 新资产必须通过 `style-lint`：只用 token 颜色/描边/圆角；图标对齐网格；无纯黑/纯白；无未授权字体；AI 图无文字；
- 每款游戏只允许一个 accent 色 + 一套 BGM，不允许自创 UI 风格。

---

## 6. 技术架构

### 6.1 技术选型

| 选项 | 结论 | 原因 |
|---|---|---|
| Unity / Cocos | 不用于合集 | 引擎运行时太大，主包放不下，多游戏共享困难 |
| Phaser / PixiJS | 不引入 | 自带渲染/资源体系，和自研运行时重复，增加包体 |
| TypeScript + Canvas 2D | ✅ | 可控包体、可控渲染、共享核心、适合 2D 休闲 |
| 无 bundler（tsc → dist） | ✅ | 避免跨分包重复打包，分包边界清晰 |
| 微信云开发 | ✅ | 免服务器、openid 天然可用、适合个人主体 |

### 6.2 分层

```
platform  →  wx API 适配（canvas/input/audio/storage/cloud/ads/share/system）
app       →  组合根 App（唯一允许同时 import core/lobby/games）
core      →  scene/render/input/audio/assets/storage/cloud/analytics/share/time/rng/ui
shared    →  design-system / asset-library / game-kit / content / test-kit
lobby     →  大厅/场馆/Meta/设置/排行/收集/双人广场
games/*   →  只放独有逻辑/数据/素材/存档迁移
tools     →  new-game/gen-game-json/check-size/gen-art/validate-content/pack-atlas
```

### 6.3 依赖方向

- `app` 是组合根，可以 import 所有层；其他层不得 import `app`；
- `core` 不得 import `lobby` 或 `games`；
- `lobby` 只能 import `core` / `shared`；
- `games/*` 只能 import `core` / `shared`，不得 import 其他游戏；
- 游戏之间通过 `GameContext` 和全局 profile 交互；
- 主包不得 require 分包；分包可以 require 主包；
- 用 ESLint `no-restricted-imports` / 脚本检查依赖方向。

### 6.4 启动流程

```
game.js
  → new App()
  → 初始化 platform（canvas/DPR/安全区/音频/存储）
  → 加载 shared 资源
  → 进入 LobbyScene
  → 点击场馆
  → wx.loadSubpackage('games/match3')
  → 分包 game.js 向 GameRegistry 注册 GameDefinition
  → App 创建 GameContext + GameScene
  → 游戏结束 → 写存档/云同步 → 返回 LobbyScene
```

### 6.5 游戏契约（摘要）

每款游戏必须导出 `GameDefinition`：

```ts
export interface GameDefinition {
  id: string;
  title: string;
  version: string;
  packageName: string;
  orientation: 'portrait';
  create(ctx: GameContext): GameInstance;
  saveSchema: SaveSchema;
  daily?: DailyChallengeDefinition;
  duo?: DuoModeDefinition;
}
```

`GameContext` 提供：`renderer / input / audio / assets / storage / cloud / analytics / share / time / rng / ui / economy`。

完整契约见 `docs/game-contract.md`。

### 6.6 目录结构

```
.
├── game.js / game.json              # 构建产物（dist 根）
├── project.config.json              # miniprogramRoot = dist/
├── cloudfunctions/
│   ├── login/ sync/ leaderboard/ submitScore/ config/ deleteAccount/
├── src/
│   ├── app/                         # 组合根 App（可 import lobby/games）
│   ├── core/
│   │   ├── scene/ render/ input/ audio/ assets/ storage/
│   │   ├── cloud/ ads/ analytics/ share/ time/ rng/ ui/ utils/
│   ├── shared/
│   │   ├── design-system/           # tokens/theme/UI/9-slice/icons/motion
│   │   ├── asset-library/           # manifest/loader/refcount/atlas/proc-cache
│   │   ├── game-kit/                # grid/board/match/merge/inventory/economy/...
│   │   ├── content/                 # schema/validate/registry/defaults
│   │   ├── platform/                # wx adapters
│   │   └── test-kit/                # mock wx/headless/deterministic rng
│   ├── lobby/
│   ├── games/
│   │   ├── _template/
│   │   ├── match3/ garden/ merge/ aquarium/
│   └── types/
├── assets/
│   ├── shared/                      # ui/icons/sfx/fonts
│   ├── raw/                         # AI 原图，不进包
│   └── games/<id>/
├── tools/
├── docs/
│   ├── architecture.md game-contract.md design-system.md art-bible.md
│   ├── asset-library.md data-schemas.md cloud.md compliance.md roadmap.md
│   ├── content-pipeline.md testing.md performance.md release-checklist.md
│   ├── glossary.md
│   ├── decisions/ADR-*.md
│   └── game-design/<id>.md
├── tests/
├── AGENTS.md
└── README.md
```

---

## 7. 分包与包体预算

### 7.1 分包策略

- 主包：大厅、核心、共享 UI/图标/音效、启动资源；
- 每款游戏一个普通分包：`games/<id>`；
- 分包入口：`games/<id>/game.js`，加载后向 `GameRegistry` 注册；
- 不使用独立分包（避免 4MB 限制和重复运行时）；
- 分包加载后常驻：内存预算按「用户玩过的游戏都常驻」计算；
- 预下载：大厅空闲时 `wx.preDownloadSubpackage` 预下载下一款（3.4.9+，失败静默）。

### 7.2 包体预算

| 项目 | 目标 | 硬门禁 |
|---|---|---|
| 主包 | ≤ 3.0MB | 3.2MB |
| 单款游戏分包 | ≤ 2.0MB | 2.5MB |
| 首发四款合计 | ≤ 7MB | – |
| 含主包首发总计 | ≤ 10MB | – |
| 全部主包+分包 | ≤ 30MB | 平台硬限制 |
| 10 款规模预估 | 21–22MB | 留 8MB 余量 |

### 7.3 省包体手段（按优先级）

1. UI/图标/背景/图案用矢量/程序化，生成一次缓存；
2. 图集复用，禁止重复拷贝；
3. 音频用单声道、低码率、短 SFX；BGM 用流式/短循环；
4. 图片 WebP/压缩；大图切九宫格；
5. 关卡/订单/鱼类/花卉数据用 JSON + 种子，不存大图；
6. 字体只保留必要字形/用系统字体；
7. 构建时 `check-size`，超预算直接失败。

---

## 8. 算力换空间（程序化政策）

### 8.1 原则

**能稳定生成、且能缓存的，就不打进大图；不能稳定生成/每帧重算的，就用位图或预烘焙。**

算力换空间成立，但必须有缓存和预算，否则会变成「卡顿换包体」。

### 8.2 允许

- UI/面板/按钮/进度条/图标：代码绘制 + 缓存；
- 背景：渐变/噪声/山丘/水面/星空，生成一次缓存；
- 简单方块/宝石/花/鱼纹：参数化生成 + 缓存；
- 关卡/订单/地图/每日种子：种子化生成 + 可解性/合法性校验；
- 花艺遗传/鱼纹/星座/图案：算法生成；
- 静态层：进入场景生成一次，之后只 `drawImage`。

### 8.3 不允许

- 每帧重画复杂路径/阴影/模糊/裁剪；
- 每帧 raymarching/SDF/全屏 shader；
- 动态矢量角色（除非极简）；
- 用运行时生成替代所有美术（会变成几何 Demo）；
- 生成结果不可复现（必须 seeded RNG）。

### 8.4 ProceduralCache

- key = algorithm + seed + params + size；
- 存 offscreen canvas / texture；
- LRU 淘汰 + 引用计数；
- 游戏退出时释放该游戏 cache；
- 单屏生成 < 50ms；超过则改为预烘焙图集；
- 同一 seed/params 跨设备结果一致。

### 8.5 性能预算

| 项目 | 目标 | 降级 |
|---|---|---|
| 中端安卓 | 60fps | 低端 30fps |
| 每帧简单路径 | ≤ 200 | 预烘焙/减少装饰 |
| 每帧复杂路径 | ≤ 20 | 改精灵 |
| 粒子 | 200–400 | 150/100 |
| 程序化缓存内存 | ≤ 32MB/游戏 | LRU 淘汰/降分辨率 |
| 单屏生成 | < 50ms | 预生成/加载动画 |

> 所有预算以真机 profiling 为准；超预算先降级，不要硬扛。

---

## 9. 复用架构

### 9.1 分层

| 层 | 职责 |
|---|---|
| `shared/platform` | wx API 适配 |
| `core` | 运行时/场景/渲染/输入/音频/资源/存档/云/分析/分享/时间/RNG/UI |
| `shared/design-system` | tokens/theme/UI 组件/9-slice/图标/动效 |
| `shared/asset-library` | 资产清单/加载/引用计数/图集/程序化缓存 |
| `shared/game-kit` | Grid/Board/Match/Merge/Inventory/Economy/OrderBoard/Collection/Genetics/Decoration/DailyChallenge/Leaderboard/DuoMode/SaveSchema |
| `shared/content` | schema/校验/内容注册表/默认数据 |
| `shared/test-kit` | mock wx/headless runner/deterministic RNG/snapshot |
| `lobby` | 大厅/场馆/Meta/设置/排行/收集/双人广场 |
| `games/<id>` | 只放独有逻辑/数据/素材/存档迁移 |
| `games/_template` | 新游戏脚手架 |
| `tools` | 生成/校验/打包/体积检查 |

### 9.2 资产库规则

- 每个资产有 `id/type/path/tags/refCount`；
- 共享 UI/图标/音效放 `assets/shared`；游戏独有放 `assets/games/<id>`（构建后进入 `dist/games/<id>/assets`，不占主包）；
- 不允许重复拷贝同一图标/音效；重复资产构建时报警；
- 图集：`shared-ui`、`shared-icons`、`game-<id>`；单张 ≤ 2048；
- 加载组：`shared`、`game:<id>`、`scene:<id>`；退出释放；
- 程序化资产也走 `AssetService`（`proc:<algorithm>:<seed>`），统一缓存/释放；
- 资产清单可生成/校验，缺资源构建失败；
- AI 生成的候选图放 `raw/`，入库只放最终压缩版；raw 不进包。

### 9.3 新游戏脚手架

`npm run new:game -- --id=xxx --title=...` 生成：

- `game.ts`（注册入口）
- `systems/`（纯逻辑）
- `data/`（配置）
- `assets/`（占位）
- `tests/`（headless）
- `docs/game-design/xxx.md`
- `games.manifest.ts` 注册

模板自带：save schema、analytics 事件、daily challenge stub、duo stub、headless test。
新游戏必须通过 `validate-content` + `check-size` + `test` 才能合并。

### 9.4 复用矩阵

| 模块 | 三消 | 花园 | 合成 | 水族馆 |
|---|---|---|---|---|
| Core / UI / Assets / Storage / Cloud / Ads / Analytics / Share | ✅ | ✅ | ✅ | ✅ |
| Grid / Board | ✅ | ✅ | ✅ | ✅ |
| Match3 | ✅ | – | – | – |
| Merge | – | – | ✅ | – |
| Inventory / Economy | – | ✅ | ✅ | ✅ |
| OrderBoard | – | ✅ | ✅ | ✅ |
| Collection / Album | ✅ | ✅ | ✅ | ✅ |
| Genetics / Breeding | – | ✅ | – | ✅ |
| Decoration | – | ✅ | ✅ | ✅ |
| DailyChallenge / Leaderboard | ✅ | ✅ | ✅ | ✅ |
| DuoMode | ✅ | ✅ | ✅ | ✅ |
| SaveSchema / Migration | ✅ | ✅ | ✅ | ✅ |

> 复用不是「所有游戏共用一个巨型模块」，而是「共用接口 + 可组合的小系统」。

---

## 10. 数据与云

### 10.1 本地优先

- 所有操作先写本地 `storage`，保证离线可玩；
- 联网时异步同步到云端；
- 云不可用 → 继续本地，不阻塞；
- 冲突按游戏定义：三消取最高分、花园取最新 revision、合成取较大库存、水族馆取最新鱼缸；
- 服务端记录 `revision`，客户端带 `baseRevision`，冲突返回合并结果；
- 关键时间用服务端时间，防止改时钟。

### 10.2 云开发

- 环境：一个 `env`，开发/生产用配置区分；
- 云函数：`login` / `sync` / `leaderboard` / `submitScore` / `config` / `deleteAccount`；
- 数据库：`players` / `saves` / `scores` / `config`；
- 客户端不存 Secret；openid 只从云函数上下文取；
- 写操作校验 + 限流 + 长度限制；
- 删除账号：删 `players` + `saves` + `scores`，返回确认。

### 10.3 登录

- 启动静默 `wx.cloud.callFunction('login')` 拿 openid；
- 不弹授权、不要头像昵称；
- 失败 → 游客模式，本地存档，后续可升级；
- 不做手机号/实名表单（平台统一防沉迷）。

---

## 11. 留存与深度

### 11.1 三层循环

- **短局（30 秒–3 分钟）**：一关三消 / 一次收获 / 一次合成 / 一次喂鱼；
- **中线（1–7 天）**：每日委托、订单、图鉴、花园/鱼缸成长；
- **长线（7–30 天+）**：赛季、收集册、王都繁荣度、排行榜、限定内容。

### 11.2 每日/每周/赛季

- 每日：3 个委托 + 1 个每日挑战 + 1 次免费补给；
- 每周：周榜、周订单、周末双倍；
- 赛季：4 周一季，主题装饰/鱼类/花卉，赛季结束保留收集。

### 11.3 双人同屏

- 一台手机、两个人、轮流动；
- 三消接力、花园浇水/修剪、合成共享订单、水族馆喂鱼/清理；
- 不做实时联机、不做陌生人匹配；
- 对外文案用「双人同乐 / 搭档」，不用「情侣空间 / 交友」。

### 11.4 反枯燥

- 每款游戏至少 2 种目标（步数/时间、订单/收集、生长/布置）；
- 随机但不惩罚：坏运气给补偿，不搞「一步错全盘输」；
- 失败可立即重试，不消耗体力；
- 广告只在「自愿加速/额外奖励」出现。

---

## 12. 美术与内容管线

### 12.1 本地 AI 资产

| 工具 | 用途 | 备注 |
|---|---|---|
| ComfyUI + SDXL Lightning 4-step | 概念图/角色/场景/图标候选 | 6.6GB checkpoint；8GB VRAM 可用 |
| Stable Audio Open 1.0 | SFX | gated，需 HF Token；输出 WAV |
| ACE-Step | BGM | Apache-2.0；8GB 需 CPU offload |
| Ollama qwen3.5:4b | 文本/命名/策划辅助 | 不能生成图片 |

> 一次只跑一个重模型；生成图只作参考/候选，最终资产要统一风格、压缩、入库。

### 12.2 资产生成流程

```
需求 → prompt/seed → 生成 4–8 张候选 → 选 1 张
→ 去背景/修边/统一色调 → 压缩 → 入 asset-library
→ 记录 prompt/seed/license → 进图集 → 真机检查
```

### 12.3 版权与合规

- 只用可商用模型/授权素材；
- 保留生成记录（prompt/seed/模型/日期）；
- 不用他人 IP、明星肖像、品牌 logo；
- AI 图不直接带文字（文字用代码渲染）；
- 模板自带素材全部删除，不商用。

---

## 13. 路线图

### 阶段 0：清理与骨架（已完成：构建/无头冒烟）

- 删除模板；
- 初始化工程/构建/测试；
- 大厅可启动，四款场馆「即将开放」；
- 云开发离线降级；
- README + docs + AGENTS。

**退出标准**：主包 ≤ 3MB；`npm run build/test/smoke` 通过；开发者工具真机确认由你在本机完成。

### 阶段 1：核心运行时 + 三消垂直切片（进行中）

- 场景/渲染/输入/音频/资源/存档/云/UI（基础版已完成）；
- 王都三消 10 关 + 每日挑战（已完成）；双人接力原型（待做）；
- 云登录/存档/排行榜（云函数已建，客户端待接）；
- 程序化 vs 位图对比（包体/FPS/内存）；
- 本地 AI 小批量资产验证；
- 技术 Spike 决策门（60fps、包体、视觉、双人输入）。

**退出标准**：真机可玩；主包 ≤ 3MB；三消 ≤ 2MB；云存档/排行榜可用；视觉验收通过。

### 阶段 2：花园 + 合成

- 花园遗传/离线成长/订单/布置/双人浇水；
- 合成物品链/订单/能量/经济/双人订单；
- 大厅四款入口 + 进度展示；
- 每日委托/收集册/星尘/繁荣度。

**退出标准**：三款可玩；离线/弱网/切后台稳定；存档迁移测试通过。

### 阶段 3：水族馆 + Meta 完整化

- 水族馆繁育/鱼纹/造景/访客订单/双人喂鱼；
- 双人广场完整化；
- 排行榜/周榜/分享卡片；
- 新手引导/设置/隐私/删除数据；
- 全量无头模拟 + 真机矩阵。

**退出标准**：四款可玩；无阻塞 bug；包体 ≤ 28MB；类目确认（休闲）。

### 阶段 4：合规与发布

- 名称/类目/备案/隐私/适龄；
- 版本审核；
- 生产云环境/监控/备份；
- 发布。

**退出标准**：审核通过、备案完成、线上监控正常。

---

## 14. 测试与质量门禁

### 14.1 测试金字塔

- **纯逻辑单测**（Vitest）：棋盘/匹配/合成/遗传/经济/存档迁移；
- **无头模拟**：固定 seed 跑 1000 局，检查不崩溃/不死锁/资源不变量；
- **场景快照**：关键 UI/布局在 750×1334 / 1080×2400 的截图对比；
- **真机矩阵**：低端安卓 / 中端安卓 / iPhone SE / iPhone 15；
- **弱网/离线**：飞行模式、断网重连、切后台 10 分钟；
- **性能**：FPS、内存、包体、启动时间。

### 14.2 提交门禁

```
npm run typecheck
npm run lint
npm run test
npm run build
npm run size
npm run smoke
```

任一失败不得合并；或直接 `npm run verify`。

### 14.3 包体门禁

- 主包 > 3.2MB → 失败；
- 单款 > 2.5MB → 失败；
- 重复资产 > 阈值 → 失败；
- 缺资产/缺 schema → 失败。

---

## 15. 发布与合规清单

### 15.1 发布前

- [ ] 类目：休闲（个人主体可选范围内）
- [ ] 名称：休闲王都（查重/商标初查）
- [ ] 小游戏备案
- [ ] 小程序备案（联机/云能力前完成）
- [ ] 隐私协议 + 数据删除入口
- [ ] 适龄提示 8+
- [ ] 无 UGC/聊天/抽卡/内购/恋爱叙事
- [ ] 广告位合规（若开广告）
- [ ] 真机矩阵通过
- [ ] 包体/性能达标
- [ ] 云环境/监控/备份
- [ ] 回滚方案

### 15.2 广告（后置）

- 只在自愿场景：额外奖励、加速、复活；
- 不强制、不插播、不误触；
- 流量主资格以官方后台为准；
- 广告失败不影响游戏。

---

## 16. 主要风险

| 风险 | 影响 | 应对 |
|---|---|---|
| 个人主体类目受限 | 玩法被拒 | 只做休闲；每款提审前确认；避开 UGC/牌类/角色类 |
| 包体超限 | 无法发布 | 主包 ≤3MB、单款 ≤2MB、构建门禁、程序化+图集 |
| 分包常驻内存 | 低端机 OOM | 内存预算、LRU、退出释放、低端降级 |
| 程序化卡顿 | 体验差 | 缓存、预算、预烘焙、真机 profiling |
| 风格分裂 | 品牌弱 | design tokens、共享 UI、style-lint |
| 内容消耗快 | 留存低 | 每日/周/赛季、收集、双人、UGC 以外的高复用内容 |
| 云成本/故障 | 不可用 | 本地优先、离线降级、预算告警 |
| 审核/备案 | 延期 | 提前准备材料、先单机后联机 |
| AI 版权/质量 | 风险 | 可商用模型、记录来源、人工修图、统一风格 |

---

## 17. 文档索引

| 文档 | 内容 |
|---|---|
| `docs/architecture.md` | 分层/模块/数据流/生命周期/包结构/构建/依赖方向 |
| `docs/game-contract.md` | GameDefinition/GameContext/生命周期/Save/Input/Audio/Assets/错误处理 |
| `docs/design-system.md` | tokens/颜色/描边/圆角/字号/动效/UI 组件/验收 |
| `docs/art-bible.md` | 世界观/角色/场景/材质/光照/参考图/AI 提示词 |
| `docs/asset-library.md` | 资产 ID/复用/图集/缓存/释放/命名/压缩 |
| `docs/data-schemas.md` | 关卡/花卉/鱼类/物品/订单/装饰/存档 schema |
| `docs/cloud.md` | 云函数/DB/同步/冲突/安全/成本 |
| `docs/compliance.md` | 休闲类目/隐私/适龄/备案/审核/内容安全 |
| `docs/roadmap.md` | 阶段/里程碑/决策门/风险 |
| `docs/content-pipeline.md` | 内容生产/赛季/数据配置/校验/发布 |
| `docs/testing.md` | 单测/无头模拟/真机矩阵/性能测试 |
| `docs/performance.md` | 包体/内存/FPS/程序化缓存预算 |
| `docs/release-checklist.md` | 提审/备案/广告/回滚/监控 |
| `docs/glossary.md` | 术语/缩写/ID 规则 |
| `docs/decisions/ADR-*.md` | 关键技术/产品决策及原因 |
| `docs/game-design/<id>.md` | 每款游戏详细设计 |
| `AGENTS.md` | 给未来 AI/开发者的非协商规则、阅读顺序、提交前检查 |

---

## 18. 首次运行与常用命令

```bash
npm install          # postinstall 会检查 dist/，缺失时自动构建一次
npm run build        # 必须先生成 dist/，微信开发者工具读取 dist/
```

用微信开发者工具打开项目根目录（`project.config.json` 已把 `miniprogramRoot` 指向 `dist/`）。

```bash
npm run dev          # 监听编译（不启动微信开发者工具）
npm run build        # 清理 + 编译 + 生成 game.json + 复制资源 + 体积检查
npm run typecheck
npm run lint
npm run test
npm run smoke        # 无头模拟启动 + 进入三消，检查运行时错误
npm run verify       # typecheck + lint + test + build + smoke
npm run size
npm run validate:content
npm run new:game -- --id=xxx --title=你的游戏
```

### 18.1 常见问题

**报错 `module 'core/app/app.js' is not defined`（或类似路径不存在）**

这是 `dist/` 里留着旧编译产物导致的：微信开发者工具会锁住 `dist` 内文件，
旧的 `dist/game.js` 仍指向已被移动的模块。处理步骤：

1. 关闭微信开发者工具（或至少关闭该项目的窗口）；
2. `npm run build`（构建前会删除整个 `dist`）；
3. 打开开发者工具 → 工具 → 清除缓存 → **全部清除**；
4. 重新编译。

如果 `npm run build` 报 `[clean] cannot remove dist`，说明文件仍被占用，
关掉开发者工具后重试。

**「分包加载失败」/ 点击场馆没反应**

先确认 `npm run build` 成功，并检查 `dist/game.json` 的 `subpackages` 是否包含该游戏根目录；
新增游戏后 `tools/games.manifest.json` 的 `status` 必须是 `playable` 才会生成分包。

**HarmonyOS 提示「基础库从 3.7.0 起正式支持」**

这是基础库的公告提示，不是错误，可忽略；需要判断平台时用 `wx.getDeviceInfo().platform`。

---

## 19. 当前状态

- [x] 项目定位/品牌/阵容确定
- [x] 技术路线/分包/云/视觉/复用架构确定
- [x] 主计划写入 README + docs + AGENTS
- [x] 清理模板
- [x] 工程初始化（TypeScript/ESLint/Prettier/Vitest/构建/体积门禁）
- [x] 大厅骨架（王都街区 + 四场馆 + 设置/隐私/版本）
- [x] 云开发离线降级骨架（云函数已建，未配置 env 时离线）
- [x] 王都三消可玩原型（6×8、10 关、星级、每日挑战、连锁、存档迁移、重开）
- [ ] 三消双人接力 / 云排行榜
- [ ] 花园 / 合成 / 水族馆
- [ ] 合规与发布

> 当前可运行内容：大厅 + 王都三消 10 关 + 每日挑战；花园/合成/水族馆显示「即将开放」。

---

## 20. 术语

| 术语 | 含义 |
|---|---|
| 主包 | 启动即加载的包，含大厅/核心/共享 |
| 分包 | 按需加载的游戏包 |
| GameDefinition | 游戏对外的统一契约 |
| GameContext | 运行时注入给游戏的能力集合 |
| Design Token | 颜色/圆角/字号/动效等统一变量 |
| ProceduralCache | 程序化生成结果的缓存 |
| Asset Library | 资产清单/加载/复用/释放 |
| Meta | 大厅层的长期进度/收集/经济 |
| Duo Mode | 同屏双人 |
| ADR | 架构决策记录 |
