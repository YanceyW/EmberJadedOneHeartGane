# 资产库（Asset Library）

> 目标：不重复、可追踪、可释放、可程序化。

## 1. 资产 ID

```
<scope>/<type>/<name>
```

示例：

```
shared/ui/panel-cream
shared/icon/coin
shared/sfx/click
game/match3/tile/berry
game/garden/flower/petal-base
proc/flower-petal/<seed>
```

规则：

- 小写短横线；
- 全局唯一；
- 不含版本号（版本在 manifest）；
- 程序化资产用 `proc:` 前缀。

## 2. Manifest

```ts
interface AssetEntry {
  id: string;
  type: 'image' | 'atlas' | 'audio' | 'json' | 'proc';
  path?: string;
  group: 'shared' | `game:${string}` | `scene:${string}`;
  tags?: string[];
  width?: number;
  height?: number;
  bytes?: number;
}
```

- `assets/manifest.json` 由脚本生成/校验；
- 缺资源构建失败；
- 重复 path/重复 id 构建报警；
- `bytes` 用于包体报告。

## 3. 加载组

| 组 | 何时加载 | 何时释放 |
|---|---|---|
| `shared` | 启动 | 不释放 |
| `game:<id>` | 进入游戏 | 退出游戏 |
| `scene:<id>` | 进入场景 | 退出场景 |

- 分包代码常驻，但纹理/音频可释放；
- 引用计数为 0 才释放；
- 释放后再次进入重新加载。

## 4. 图集

- `shared-ui`、`shared-icons`、`game-<id>`；
- 单张 ≤ 2048×2048；
- 小图优先入图集，大图独立；
- 图集边缘留 2px，避免出血；
- 九宫格单独文件，不打图集；
- 构建后共享图集在 `assets/`（主包），游戏图集在 `games/<id>/assets/`（分包）。

## 5. 程序化缓存

```ts
interface ProcAsset {
  key: string;        // proc:<algorithm>:<seed>:<params>
  width: number;
  height: number;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  lastUsed: number;
  refCount: number;
}
```

- 生成一次，之后 `drawImage`；
- LRU + 引用计数；
- 单游戏缓存上限 32MB；
- 退出游戏释放；
- 同 seed/params 跨设备一致；
- 生成失败回退占位图。

## 6. 压缩

- 图片：WebP 优先，PNG 仅透明边缘；
- 音频：单声道、22.05k/44.1k、短 SFX；
- JSON：去掉空格/注释，必要时压缩；
- 不进包：`assets/raw/`、PSD、AI 原图、未压缩 WAV。

## 7. 命名

- 图片：`<type>-<name>@<scale>.png`；
- 音频：`sfx-<name>.mp3` / `bgm-<name>.mp3`；
- 九宫格：`panel-<name>.9.png`；
- 图集：`atlas-<group>.png` + `.json`。

## 8. 复用规则

- 共享 UI/图标/音效只放 `assets/shared`；
- 游戏独有放 `assets/games/<id>`；
- 不允许把共享资产复制到游戏目录；
- 重复资产构建报警；
- 新资产先查 manifest，能复用就复用。

## 9. 生成流程

```
需求 → 查 manifest → 生成/绘制 → 修图 → 压缩
→ 入 assets/<scope> → 更新 manifest → 图集 → 真机检查
```

## 10. 发布前检查

- [ ] 无缺失资产
- [ ] 无重复资产
- [ ] 无 raw 进包
- [ ] 图集 ≤ 2048
- [ ] 音频单声道/低码率
- [ ] 程序化缓存可释放
- [ ] 包体达标
