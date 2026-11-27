# AGENTS.md — 休闲王都开发规则

> 给未来的 AI 助手/开发者。**先读这份，再读 README，再读 docs。**
> 如果聊天记录、注释、口头约定与仓库文档冲突，**以仓库文档为准**。

---

## 1. 阅读顺序

1. `README.md` — 产品定位、阵容、硬约束、路线图
2. `docs/visual-style.md` — 统一画风、图标、棋盘、天气/节日的画法
3. `docs/architecture.md` — 分层、模块、启动流程、依赖方向
4. `docs/game-contract.md` — 游戏必须实现的契约
5. `docs/design-system.md` — 视觉/动效/音频 token
6. `docs/game-design/economy-loop.md` — 王都币、农场、花园、餐厅、水族馆的循环
7. 与当前任务相关的文档（资产/数据/云/合规/测试/性能）
8. `docs/decisions/` — 已做出的架构决策，不要重复讨论

---

## 2. 非协商规则

### 产品

- 只做**休闲**类目；不做文化互动、角色类、牌类。
- 不做 UGC、聊天、陌生人社交、公会、抽卡、内购、恋爱/乙女/虚拟恋人叙事。
- 全竖屏（portrait）；左手/右手单手可玩。
- 不强制登录、不强制分享、不强制看广告。
- 对外文案避免「恋爱 / 情侣空间 / 交友」；用「双人同乐 / 搭档」。

### 技术

- **单运行时**：TypeScript + Canvas 2D；不引入 Unity/Cocos/Phaser/PixiJS。
- 不引入 bundler；`tsc` 输出 CommonJS 到 `dist/`；`miniprogramRoot` 指向 `dist/`。
- 主包只放大厅/核心/共享；每款游戏独立分包；主包不得 require 分包。
- 只有 `src/app` 组合根可以同时 import core/lobby/games；其他层不得 import `src/app`。
- 游戏之间不得互相 import；只能通过 `GameContext` / profile 交互。
- 游戏内不得直接调用 `wx.*`；统一走 `src/shared/platform`。
- 所有颜色/圆角/字号/动效必须来自 design tokens。
- 所有资产必须走 `asset-library`；禁止重复拷贝图标/音效。
- 所有随机必须用 seeded RNG；禁止裸 `Math.random()` 影响玩法结果。
- 所有存档必须有 `schemaVersion` + migration。

### 包体

| 项目 | 目标 | 硬门禁 |
|---|---|---|
| 主包 | ≤ 3.0MB | 3.2MB |
| 单款游戏 | ≤ 2.0MB | 2.5MB |
| 总包 | ≤ 30MB | 平台限制 |

- 构建必须跑 `npm run size`；超预算直接失败，不得绕过。
- 不把 AI 原图、PSD、未压缩音频打进包。

### 合规

- 个人主体；提审前确认类目仍属休闲。
- 隐私协议、数据删除入口、适龄提示必须存在。
- 不收集头像/昵称/手机号；只使用 openid。
- 广告只做自愿激励视频；失败不影响游戏。

---

## 3. 仓库地图

```
src/app/             App 组合根（唯一可以同时 import core/lobby/games）
src/core/            运行时（scene/render/input/audio/assets/storage/cloud/ui/...）
src/shared/          design-system / asset-library / game-kit / content / platform / test-kit
src/lobby/           大厅与 Meta（含 themes/weather）
src/games/<id>/      每款游戏（只放独有逻辑/数据/素材）
src/games/farm/      农场：食材生产，供给加工屋
src/games/_template/ 新游戏模板
cloudfunctions/      云函数
tools/               构建/生成/校验脚本
docs/                详细文档（唯一事实来源）
tests/               跨模块测试
```

---

## 4. 新游戏接入

1. `npm run new:game -- --id=xxx --title=...`
2. 在 `src/games/xxx/game.ts` 导出 `GameDefinition`。
3. 实现 `create(ctx)`，只使用 `GameContext`。
4. 定义 `saveSchema` + migration。
5. 加 `docs/game-design/xxx.md`，并对照 `docs/visual-style.md` 与 `docs/game-design/economy-loop.md`。
6. 加 headless 测试 + 固定 seed 模拟。
7. 注册到 `tools/games.manifest.json`，playable 才会进 `game.json` 分包。
8. 通过 `typecheck/lint/test/build/size/smoke`。

禁止：

- 复制其他游戏的系统代码；
- 在游戏内新建一套 UI/颜色/音效；
- 直接读写 `wx.setStorageSync`；
- 直接 `require('../other-game')`。

---

## 5. 代码风格

- TypeScript strict；禁止 `any`（确需时写 `unknown` + 收窄）。
- 纯逻辑与渲染分离：`systems/` 不依赖 canvas/wx。
- 小模块优先；单文件 > 400 行考虑拆分。
- 命名：`PascalCase` 类型/组件，`camelCase` 函数/变量，`SCREAMING_SNAKE_CASE` 常量。
- 注释只解释「为什么」，不解释「是什么」。
- 不提交 `console.log`（用 `logger`，生产关闭 debug）。

---

## 6. 提交前检查

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run size
npm run smoke
```

或一次跑完 `npm run verify`。全部通过才可提交。提交信息用：

```
feat(match3): add daily challenge
fix(core): release procedural cache on exit
docs(architecture): clarify subpackage lifecycle
```

---

## 7. 重大决策

以下变更必须先写 ADR（`docs/decisions/ADR-xxxx.md`）：

- 换引擎/渲染方案；
- 改分包策略/包体预算；
- 改云服务/数据模型；
- 改类目/商业化；
- 改视觉系统核心 token；
- 引入第三方运行时/大依赖。

ADR 模板：背景 → 选项 → 决策 → 后果 → 状态。
