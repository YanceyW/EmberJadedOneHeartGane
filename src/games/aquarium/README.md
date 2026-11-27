# 王都水族馆（规划）

状态：可玩原型。

实现时按 `docs/game-design/aquarium.md`：

- `systems/genetics.ts`：鱼体/鳍/颜色/花纹遗传；
- `systems/pattern.ts`：反应-扩散/细胞自动机鱼纹（缓存）；
- `systems/tank.ts`：鱼缸/水质/装饰；
- `systems/orders.ts`：访客订单；
- `game.ts`：GameDefinition + 表现。

共享：Grid/Board/Inventory/Economy/OrderBoard/Collection/Genetics/Decoration/DailyChallenge/DuoMode/SaveSchema。
