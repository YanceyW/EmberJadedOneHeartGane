# 甜品合成屋（规划）

状态：即将开放。

实现时按 `docs/game-design/merge.md`：

- `systems/chain.ts`：物品链 DAG；
- `systems/board.ts`：5×6 棋盘/生成器/合并；
- `systems/orders.ts`：订单生成；
- `systems/energy.ts`：能量恢复；
- `game.ts`：GameDefinition + 表现。

共享：Grid/Board/Merge/Inventory/Economy/OrderBoard/Collection/DailyChallenge/DuoMode/SaveSchema。
