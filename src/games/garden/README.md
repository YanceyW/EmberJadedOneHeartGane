# 王都花园（规划）

状态：可玩原型。

实现时按 `docs/game-design/garden.md`：

- `systems/genetics.ts`：花色 Lab 混合、形状/花瓣遗传、稀有度；
- `systems/growth.ts`：离线生长/浇水/收获；
- `systems/orders.ts`：访客订单；
- `systems/layout.ts`：6×6 花园布置；
- `game.ts`：GameDefinition + 表现。

共享：Inventory/Economy/OrderBoard/Collection/DailyChallenge/DuoMode/SaveSchema。
