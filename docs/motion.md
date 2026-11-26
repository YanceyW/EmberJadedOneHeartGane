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

### 5.1 形状（固定 6 种 + 光环）

`p-star` 星 · `p-petal` 花瓣 · `p-bubble` 气泡 · `p-dust` 尘 · `p-coin` 金币 · `p-sugar` 糖霜 · `p-ring` 光环

全部在启动时烘焙进 **一张 768×256 离屏图集**（0 字节包体），之后每帧只 `drawImage`。

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

### 5.4 实现约束

- 结构化数组（SoA）+ 定长容量，运行期不分配对象；
- 按 `blend` 分两批绘制，不逐粒子切 `globalCompositeOperation`；
- 无旋转走 9 参数 `drawImage` 快路径；
- 禁止每帧 `shadowBlur`、重建渐变、全屏 shader。

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

- 首次触摸解锁（`AudioService.unlock()`），未解锁前静默；
- 同时发声上限按档位；白噪声只生成一次复用；
- 无 `wx.createWebAudioContext` 时**静默降级**，不报错不阻塞。

### 6.2 连击变调

`feedback.match(comboIndex)` → `pitch = (comboIndex-1)*2` 半音，最高 6 档（+12 半音）。这是文件音效做不到的，也是「手感」的关键。

### 6.3 BGM

- 30–45s 可循环，96kbps 单声道（约 250–350KB/首）；
- 大厅放主包 `assets/shared/bgm/lobby.mp3`，游戏放各自分包；
- `InnerAudioContext` + `loop` + `obeyMuteSwitch`；
- 切后台 `pause()`，回前台 `resume()`。

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
3. 下落时 0.94→1.0 近大远小；
4. 面板/按钮厚边，按下整体下移 3px；
5. 大厅三层视差（0.2 / 0.5 / 1.0 幅度）；
6. 统一左上暖光与投影方向。

**禁止**：等距/透视玩法网格、每屏超过 2 个深度线索、视觉偏移 > 6% 导致点击错位。

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
- [ ] 动画可被 `skipAll()` 结算
- [ ] 无音频能力时静默降级
- [ ] 真机 60fps（低端 30fps）
