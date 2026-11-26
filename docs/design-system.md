# 设计系统（Design System）

> 目标：四款游戏并排看像同一个世界。所有 UI/动效/音频必须从这里取。

## 1. 风格

**奶油纸雕 + 手账质感 + Q 版圆润**

- 奶油白底、薄荷/翡翠主色、蜜桃/暖金强调、浅紫辅助；
- 圆角厚描边、平涂三阶色、叠纸阴影、左上暖光；
- 不写实、不赛博、不暗黑、不恐怖；
- 角色 2 头身 Q 版，吉祥物 2 头身；
- 静态场景按昼夜阶段烘焙，动态只叠加轻量元素。

## 2. 颜色 token

| token | 值 | 用途 |
|---|---|---|
| `cream` | `#FFF6E9` | 页面底色 |
| `paper` | `#FFFDF8` | 卡片/面板 |
| `ink` | `#3A2E2A` | 主文字/描边 |
| `inkSoft` | `#6B5B54` | 次文字 |
| `jade` | `#2F8F7B` | 主按钮/成功 |
| `mint` | `#A8E6CF` | 浅色强调 |
| `teal` | `#1F5F55` | 深色对比 |
| `peach` | `#FFB7A5` | 暖色强调 |
| `coral` | `#F27D72` | 警示/失败 |
| `gold` | `#F2C14E` | 奖励/货币 |
| `lilac` | `#C9B6E4` | 辅助 |
| `sky` | `#BFE3F2` | 水/天空 |

方块/图标暗部（只用于侧边、内阴影、描边，不单独做主题色）：

| token | 值 |
|---|---|
| `mintDeep` | `#74BFA6` |
| `honeyDeep` | `#B9862F` |
| `waterDeep` | `#5FA3BC` |
| `lilacDeep` | `#9B87BE` |
| `petalDeep` | `#C9768F` |
| `dusk` | `#F7B98E` |
| `nightSky` | `#4C537D` |
| `nightDeep` | `#2F3557` |
| `starlight` | `#FFF3C4` |
| `grass` | `#B7E3B0` |
| `grassDeep` | `#8CCB8A` |
| `path` | `#F4E6CF` |
| `pathDeep` | `#DCC9AB` |
| `skin` | `#FFE0C2` |
| `skinShade` | `#F4C9A6` |
| `blush` | `#F08C7E` |

大厅专用色分三组，避免场景自造颜色：

- `TOWN_COLORS`：土壤/石头/玻璃/木头/远山/夜地面；
- `TOWN_PHASES`：`dawn / day / dusk / night` 四套天空、草地、道路、屋顶、窗光、灯光；
- `PAPER_UI`：缝线、纸边、颗粒、阴影、胶带。

每款游戏只加一个 accent：

| 游戏 | accent |
|---|---|
| 王都三消 | `mint` + `berry #D96C8A` |
| 王都花园 | `leaf #7FBF6A` + `petal #F7A8C4` |
| 甜品合成屋 | `honey #F6C667` + `cream` |
| 王都水族馆 | `sky` + `lilac` |

禁止：

- 纯黑 `#000` / 纯白 `#fff`；
- 未登记的颜色；
- 每款游戏自创一套主题色。

## 3. 形状/描边

- 描边：2–3px（750 设计宽度），圆头笔触；
- 描边色：`ink` 或同色系深色，不用纯黑；
- 圆角：8 / 12 / 16 / 24；
- 卡片：圆角 16 + 2px 描边 + 轻阴影；
- 按钮：圆角 12 或胶囊；
- 图标：24/32/40/48 网格，圆头端点，统一视觉重量；
- 纸雕三步：平涂底色 → 同色系暗部/亮部 → 暖色墨线与偏移阴影。

### 3.1 程序化笔刷

`shared/design-system/paint.ts` 是纸雕画法的唯一入口：

| API | 作用 |
|---|---|
| `tracePath` / `fillPoints` | 固定 seed 的轻微抖动路径 |
| `inkLine` / `inkRoundRect` / `inkEllipse` | 带暖色墨线的形状 |
| `strokeInk` | 单层或双层描边（默认单层） |
| `softShadow` | 暖棕偏移软阴影 |
| `roundRectPoints` | 顺时针圆角矩形路径（避免自交） |
| `applyGrainToOpaque` / `drawPaperGrain` | 纸纹叠加 |

规则：

- 抖动必须用固定 seed，同一形状每帧一致；
- 纸纹只烘焙，不每帧重绘；
- 不在 UI 层直接写 `ctx.strokeStyle = '#...'`，颜色从 token 取。

## 4. 间距/布局

- 间距：4 / 8 / 12 / 16 / 24 / 32；
- 页面左右安全边距：24（750 宽）；
- 顶部安全区 + 底部横条适配；
- 最小点击区 88×88（设计像素）；
- 弹窗宽度：屏幕宽 - 96；
- 列表项高度：88 / 112。

## 5. 字体

- 系统字体：`-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`；
- 字号：20 / 24 / 28 / 32 / 40；
- 行高：1.35–1.5；
- 标题 32/40，正文 24/28，辅助 20；
- 不引入字体包（包体）；
- 数字用等宽或 `font-variant-numeric: tabular-nums`。

## 6. 组件

- Button：primary / secondary / ghost / icon；
- Panel / Card / 9-slice；
- Tabs / Segmented；
- Modal / BottomSheet / Toast / Tooltip；
- ProgressBar / Badge / Tag / Currency；
- ScrollView / Grid / Carousel；
- Toggle / Slider / Stepper；
- EmptyState / Loading / ErrorState。

### 6.1 纸雕组件

`shared/design-system/paper-ui.ts` 提供大厅与后续页面共用的纸雕组件：

- `drawPaperPanel`：纸面板、卡片、可选缝线；
- `drawStickerButton`：primary / secondary / ghost / icon，胶囊或圆角；
- `drawWoodRibbon`：木牌标签、状态条；
- `drawPillToggle`：纸雕开关；
- `drawSegmented` / `segmentRects`：分段标签（声音/画面/数据）；
- `drawSettingRow`：设置行（标题 + 说明 + 右侧控件）；
- `drawTapeNote` / `drawDivider`：胶带便签、虚线分隔。

所有组件：

- 只从 `shared/design-system` 导出；
- 支持禁用/按下/加载态；
- 支持安全区；
- 不直接读全局 theme，用 `useTheme()`。

## 7. 动效

| token | 时长 | 用途 |
|---|---|---|
| `fast` | 120ms | 按下/切换 |
| `base` | 180ms | 常规过渡 |
| `slow` | 240ms | 弹窗/面板 |
| `reward` | 320ms | 奖励/升级 |

- 缓动：`easeOutCubic` 默认；`easeOutBack` 只用于奖励；
- 按钮按下 0.95 + 回弹；
- 奖励：压缩 → 弹跳 + 金色粒子 + 上扬音效；
- 失败：轻摇头/降调，不红屏；
- 场景切换统一淡入/滑动；
- 粒子形状统一：花瓣/气泡/星光/金币。

## 8. 音频

- UI：点击/返回/弹窗/错误；
- 奖励：金币/升级/完成；
- 每款游戏只换 BGM 和主题 SFX；
- 单声道、低码率、短音效；
- 首次交互解锁；
- 设置里可关音乐/音效。

## 9. 图标

- 统一线性+面性混合；
- 圆头端点；
- 24/32/40/48 四档；
- 同一视觉重量；
- **纯 2D 平面**：不做挤出侧边、不做透视、不加 2.5D 厚度；
- 2.5D 只用于玩法表现层（侧边/阴影/挤压）与大厅的深度排序/视差，图标本身保持扁平；
- 大厅建筑用世界坐标包围盒命中，玩法棋盘仍是正视矩形网格；
- 四款场馆图标统一在 `src/lobby/game-icons.ts` 绘制，只用 token 颜色与 2–3px 描边；三消有笑脸糖/交换糖/蜂蜜罐三套可选；
- 王都币图标是金币 + 城堡垛口，和普通星星/金币区分；
- 不使用 emoji 作为正式图标（可用作占位）。

## 9.1 动效与音频

动效时长、缓动、粒子预设、合成音效、触感规则统一写在
[motion.md](./motion.md)，本文不再重复。

要点：

- 游戏只能通过 `Feedback` 触发反馈；
- 时长只用 `DURATION` 的 6 档；
- 粒子只用 11 种预烘焙形状；
- 2.5D 表现只做「侧边/阴影/视差/厚边/按压下沉」，不改玩法坐标系；
- 大厅是平铺可平移世界，小游戏图标是 2D 平面；两者不要混用；
- 局内方块必须颜色 + 轮廓 + 纹理三重区分，禁止只靠色相。

## 10. 验收

- 四款截图并排：颜色/描边/圆角/字体/按钮/动效一致；
- `style-lint` 通过；
- 无未登记颜色/字号/圆角；
- 无纯黑/纯白；
- AI 图无文字；
- 真机安全区无遮挡。
