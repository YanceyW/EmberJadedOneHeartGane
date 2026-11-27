# 王都加工屋

状态：可玩原型（分包 `merge`），两个页签：合成台 / 原料间。

- `data/items.ts`：5×5、4 级莓果链（莓果 → 果酱 → 蛋糕 → 宴席）、3 张加工单、进货价；
- `data/recipes.ts`：原料间配方（小麦 → 面粉、面粉 → 面包），产物进王都仓库；
- `systems/merge.ts`：进货/合并/交付/卖出/存档迁移；分数 = 合成 ×20 + 订单 ×100 + 原料加工 ×30；
- `view/merge-view.ts`：两个页签 + 仓库计数 + 链条示意；
- `view/item-art.ts`：四档物品画法；
- `game.ts`：GameDefinition、点击路由、写 `save:merge`。

跨馆食材统一走 `profile.pantry`（见 `docs/game-design/economy-loop.md`）。
