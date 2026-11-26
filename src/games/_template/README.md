# 游戏模板

`npm run new:game -- --id=xxx --title=名字 --subtitle=一句话 --accent=mint`

会复制本目录到 `src/games/xxx`，替换占位符，并在 `tools/games.manifest.json` 增加一条记录。

新游戏只放：

- `game.ts`：`GameDefinition` + 注册；
- `systems/`：纯逻辑（可单测，不依赖 canvas/wx）；
- `data/`：关卡/物品/内容 JSON；
- `assets/`：本游戏独有素材（共享素材不要复制）。

不要在这里放共享 UI/音效/图标；它们属于 `assets/shared` 和 `src/shared`。
