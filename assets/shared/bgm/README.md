# BGM 目录

## 期望文件

| 文件 | 用途 | 位置 |
|---|---|---|
| `assets/shared/bgm/lobby.mp3` | 大厅循环 BGM | 主包 |
| `assets/games/match3/bgm.mp3` | 王都三消 | 分包 |
| `assets/games/garden/bgm.mp3` | 王都花园 | 分包 |
| `assets/games/merge/bgm.mp3` | 甜品合成屋 | 分包 |
| `assets/games/aquarium/bgm.mp3` | 王都水族馆 | 分包 |

规格：**30–45 秒可循环、96kbps、单声道 mp3**（约 250–350KB/首）。

代码里 `AudioService.playBgm(id)` 默认按 `assets/shared/bgm/<id>.mp3` 播放；
游戏分包用 `playBgm(id, 'games/<id>/assets/bgm.mp3')`。文件不存在时**自动回退到上一首可用 BGM**，
不会阻塞游戏，所以可以先不加文件。

## 用本地模型生成（ACE-Step）

```bash
# 1. 进入 ACE-Step 目录（约 9.5GB checkpoint，8GB 显存需 CPU offload）
cd D:\AI\apps\ACE-Step

# 2. 生成（示例 prompt，按需修改）
#    "cozy music box waltz, soft glockenspiel, gentle strings,
#     warm and cute, 90 bpm, loopable, no vocals"
```

生成后：

1. 选一段**首尾能量接近**的 30–45s 片段，避免循环时突然断掉；
2. 导出 96kbps 单声道 mp3；
3. 放到上表对应位置；
4. 在本文件记录 prompt / seed / 模型版本 / 日期（便于追溯授权）。

## 记录表

| 文件 | prompt | 模型 | 日期 | 备注 |
|---|---|---|---|---|
| _待生成_ | | | | |
