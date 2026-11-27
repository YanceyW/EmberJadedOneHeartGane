# 动效 / 粒子 / 音效规范

> 这是所有小游戏共用的表现层规范。**新增游戏只需接 `Feedback`，不要再自造一套。**

## 1. 一句话原则

> **能用预烘焙 sprite 的，就不要每帧画路径；能用合成音效的，就不要打进音频文件。**

## 2. 分层

| 层 | 位置 | 职责 |
|---|---|---|
| 反馈入口 | `src/shared/game-kit/feedback.ts` | 视觉/听觉/触觉一次性对齐，游戏唯一入口 |
| 动效 token | `src/shared/design-system/motion.ts` | 时长、缓动、粒子预设 |
| 精灵图集 | `src/shared/design-system/sprite-atlas.ts` | 运行时烘焙方块/阴影/粒子形状 |
| 动画 | `src/core/anim/` | Tween / Spring / Shake / Easing |
| 粒子 | `src/core/particles/` | SoA 粒子池 + blend 分批 |
| 音频 | `src/core/audio/` | WebAudio 合成 SFX + BGM |
| 触感 | `src/core/haptics/` | 分级震动 + 80ms 节流 |
| 分级 | `src/core/quality/` | 设备档位、粒子预算、减少动效 |

依赖方向：`games → shared → core → platform`。

## 3. 时长 token

| token | 值 | 用途 |
|---|---|---|
| `instant` | 60ms | 极轻反馈 |
| `fast` | 120ms | 按下、交换、消除 |
| `base` | 180ms | 常规过渡、弹窗 |
| `slow` | 240ms | 面板、下落上限 |
| `reward` | 320ms | 奖励 |
| `ceremony` | 600ms | 结算演出 |

**硬规则**：一次交换到「玩家可再次操作」的总时长 **≤ 320ms**；连锁时用 `TweenManager.setTimeScale()` 加速到 0.7–1.0。

## 4. 缓动

| 名字 | 用途 |
|---|---|
| `outCubic` | 默认 |
| `outBack` | 奖励弹入（允许过冲） |
| `outElastic` | 落地挤压回弹 |
| `outBounce` | 掉落 |
| `inQuad` | 退出 |

不要把 `outBack` 用在位移落点上（会看起来「弹过头」），只用于缩放。

## 5. 粒子

### 5.1 形状（11 种）

`p-star` 星 · `p-petal` 花瓣 · `p-bubble` 气泡 · `p-dust` 尘 · `p-coin` 金币 · `p-sugar` 糖霜 · `p-ring` 光环 · `p-leaf` 落叶 · `p-firefly` 萤火虫 · `p-splash` 水花 · `p-smoke` 烟

全部在启动时烘焙进 **一张 896×256 离屏图集**（0 字节包体），之后每帧只 `drawImage`。

### 5.2 预设

| id | 用途 |
|---|---|
| `sparkle` | 消除、奖励星屑 |
| `petal` | 花园、飘落 |
| `bubble` | 水族馆、按钮 |
| `dust` | 落地、轻反馈 |
| `coin` | 货币、奖励飞入 |
| `sugar` | 合成、甜品 |
| `ring` | 选中光环、扩散圈 |
| `confetti` | 过关礼花 |

### 5.3 预算

| 档位 | 粒子预算 | DPR | 同时发声 |
|---|---|---|---|
| high | 400 | 3 | 6 |
| mid | 240 | 2 | 5 |
| low | 120 | 1.5 | 3 |
| 减少动效 | 0 | 按档 | 按档 |

- 超出预算丢弃**最旧**粒子（不排队）；
- 连续 90 帧 > 22ms 自动降一档（只降不升）。

### 5.3.1 大厅环境粒子

大厅有独立的 `LobbyAmbient` 池，避免环境粒子盖在弹窗/按钮上：

| 档位 | 大厅预算 |
|---|---|
| high | 160 |
| mid | 96 |
| low | 48 |
| 关闭环境效果 | 0 |

- 使用独立 `ParticleSystem`，绘制顺序固定在地面/建筑之后、UI 之前；
- 开关来自 `Profile.settings`：`ambientEffects`、`sceneMotion`、`textureDetail`、`screenShake`、`reducedMotion`；
- `performanceMode` 打开时等价于 low + 关闭环境/场景动效/纸纹；
- 设置变更立即生效，不需要重启。

### 5.3.2 天气覆盖

`src/lobby/weather.ts` 使用屏幕空间覆盖，不占粒子池：

| 天气 | 高 | 中 | 低 | 减少动效 |
|---|---|---|---|---|
| 雨 | 92 条 + 12 水花圈 | 64 条 + 8 水花圈 | 36 条 | 只留冷色渐变 |
| 雪 | 92 片 + 1 积雪带 | 64 片 + 1 积雪带 | 36 片 + 1 积雪带 | 只留冷色渐变 |
| 花瓣 | 92 片 | 64 片 | 36 片 | 只留暖色渐变 |

- 粒子总量按上表，再按 远/中/近 三层分配；
- 天气免费，不和节日风格互斥；
- 雨/雪/花瓣使用固定公式 + 时间，不随机分配对象；
- 氛围渐变按 (天气, 昼夜, 高度) 缓存，不逐帧重建；
- 天气不参与命中。

### 5.4 实现约束

- 结构化数组（SoA）+ 定长容量，运行期不分配对象；
- 按 `blend` 分两批绘制，不逐粒子切 `globalCompositeOperation`；
- 无旋转走 9 参数 `drawImage` 快路径；
- 禁止每帧 `shadowBlur`、重建渐变、全屏 shader；
- 粒子图集只注册一次，游戏/大厅不得各自再建一套形状。

## 6. 音效

### 6.1 合成 SFX（0 字节）

| name | 用途 | 要点 |
|---|---|---|
| `tap` | 点击 | sine 880→1320，40ms |
| `select` | 选中 | triangle 660→880 |
| `invalid` | 非法操作 | square 200→150 + lowpass |
| `match` | 消除 | sine+triangle 双振荡 |
| `combo` | 连锁 | 三音琶音 |
| `reward` | 奖励 | 钟声 + 泛音 |
| `coin` | 货币 | 两声上滑 |
| `win` | 过关 | 四音琶音 |
| `fail` | 失败 | 下行 + lowpass |
| `whoosh` | 切场景 | 带通扫频噪声 |
| `pop` | 气泡/合成 | 短促上滑 |
| `drop` | 落地 | 320→180 |
| `tick` | 倒计时最后 10 秒 | triangle 1500→1100，35ms |

- 首次触摸解锁（`AudioService.unlock()`），未解锁前静默；
- 同时发声上限按档位；白噪声只生成一次复用；
- 无 `wx.createWebAudioContext` 时**静默降级**，不报错不阻塞。

### 6.2 连击 / 节奏变调

```ts
feedback.match(comboIndex, x?, y?, tempoStep?)
```

- `comboIndex`：同一次交换内的连锁段（1、2、3…）。
- `tempoStep`：跨操作的节奏档位（1–6），见 `games/match3/systems/tempo.ts`。
- 音高：`((comboIndex - 1) + (tempoStep - 1)) × 2` 半音，封顶 **+12**。
- 粒子规模同步放大，封顶 2.2。

这是文件音效做不到的，也是「手感」的关键。其他游戏若没有节奏系统，`tempoStep` 保持默认 1 即可。

### 6.3 BGM

- 30–45s 可循环，96kbps 单声道（约 250–350KB/首）；
- 大厅放主包 `assets/shared/bgm/lobby.mp3`，游戏放各自分包 `games/<id>/assets/bgm.mp3`；
- `InnerAudioContext` + `loop` + `obeyMuteSwitch`；
- 切后台 `pause()`，回前台 `resume()`；
- 文件缺失时自动回退到上一首可用 BGM（例如游戏 BGM 缺失 → 继续大厅 BGM），并记住失败源，避免每次进出场景重复报错。

## 7. 触感

| 场景 | 强度 |
|---|---|
| 消除 | light |
| 成功/过关 | medium |
| 失败 | light |
| 非法 | light |

80ms 节流；设置可关；「减少动效」时一并关闭。

## 8. 2.5D 表现

玩法网格保持**正视矩形**（命中就是矩形格），体积感只靠：

1. 方块挤出侧边 + 顶面高光（预烘焙）；
2. 落地软阴影（随离地高度缩放/淡出）；
3. 下落时 0.94→1.0 近大远小 + 落地横向 1.06 / 纵向 0.92 挤压；
4. 面板/按钮厚边，按下整体下移 3–4px；
5. 大厅平铺世界：天空/地面/建筑按深度排序，前景 1.04 倍相机位移制造轻微视差；
6. 统一左上暖光与投影方向。

**禁止**：等距/透视玩法网格、每屏超过 2 个深度线索、视觉偏移 > 6% 导致点击错位。

### 8.0 大厅与三消舞台

- 大厅按本地时间切换清晨/白天/黄昏/夜晚；夜晚暖灯、星光、萤火虫。
- 云、喷泉、招牌、居民、花瓣为低频循环，不逐帧随机；大厅环境粒子用独立池，预算见 §5.3.1。
- 居民沿烘焙出来的路网走动（`town-residents.ts`），会随机停在门口、进店（淡出+停留）再出门；`sceneMotion` 关闭时居民不更新、不绘制。
- 三消下半屏「王都共鸣」：节奏仪表、王都币宝箱、国王/王后表情、喷泉高度跟随节奏。
- 短屏隐藏剪影与部分装饰；减少动效关闭居民/花瓣/萤火虫/招牌摆动。

### 8.1 手势反馈

- **按下**：棋盘格上浮 6% + 光环 + 阴影；`feedback.press()`。
- **滑动**：越过 22 设计像素阈值立即生效，不等手指抬起；短箭头提示存在 140ms。
- **无效**：12% 格宽回弹 + 6px 内摆动，只播 `invalid` 与 `dust`，不红屏。
- **得分飘字**：从消除中心上升约 34px，600ms 内淡出；节奏生效时用 `gold`。
- **音频解锁**：必须在 `touchstart`（而不是 `tap`）调用 `AudioService.unlock()`，否则纯滑动玩法会一直没声音。

## 9. 减少动效

设置里开启后：

- 粒子预算 0、震动关闭；
- 只保留 120ms 内的位移与透明度变化；
- 所有动画仍可 `skipAll()` 立即落终态；
- 玩法结果完全不变（有测试保证）。

## 10. 新游戏接入清单

- [ ] 只用 `ctx.feedback.*` 触发反馈（禁止 `ctx.audio.playSfx` 直调）
- [ ] 时长只用 `DURATION` 的 6 档
- [ ] 粒子只用 `BURSTS` 的 8 个预设
- [ ] 实现 tap / invalid / success / reward / fail 五类反馈
- [ ] 纯手势玩法在 `touchstart` 解锁音频，按下/滑动都有轻反馈
- [ ] 动画可被 `skipAll()` 结算
- [ ] 无音频能力 / 缺 BGM 资源时静默降级
- [ ] 真机 60fps（低端 30fps）
