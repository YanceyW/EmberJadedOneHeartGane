# 资产目录

```
assets/
├── shared/          主包共享：UI/图标/SFX/BGM
│   ├── ui/
│   ├── icons/
│   └── sfx/
├── games/           各游戏独有资产
│   ├── match3/
│   ├── garden/
│   ├── merge/
│   ├── aquarium/
│   ├── farm/
│   ├── restaurant/
│   └── ranch/
└── raw/             AI 原图/参考图/未压缩素材（不进包）
```

规则：

- 共享资产只放 `shared/`，不要复制到游戏目录；
- `raw/` 被 `.gitignore` 和构建排除；
- 构建后：`shared/` → `dist/assets/shared`（主包）；`games/<id>/` → `dist/games/<id>/assets`（随分包）；
- 新资产先查 `assets/manifest.json`（后续生成），能复用就复用；
- 生成/压缩/命名规范见 `docs/asset-library.md`；
- 当前阶段没有位图资源，全部 UI/图形由代码绘制。
