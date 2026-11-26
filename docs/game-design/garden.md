# 王都花园

## 1. 核心

种花 → 浇水/施肥 → 开花 → 订单/图鉴 → 繁育新品种 → 布置花园。

## 2. 循环

```
短：浇水/收获（30 秒）
中：订单/图鉴/繁育（1–7 天）
长：花园布置/季节花/收集（7–30 天）
```

## 3. 基因

```ts
interface FlowerGenome {
  species: string;
  color: { h: number; s: number; l: number };
  shape: 'round' | 'star' | 'bell' | 'spade';
  petals: number;   // 5–12
  size: number;     // 0.8–1.2
  fragrance: number;// 0–1
  rarity: 1 | 2 | 3 | 4 | 5;
}
```

### 遗传

- 颜色：Lab 混合 + 变异（±5%）；
- 形状/花瓣：显隐基因 + 随机；
- 稀有度：父母均值 + 变异概率；
-  fragrance：均值 + 噪声；
- 所有随机 seeded。

### 表现

- 花色 → HSV 染色花瓣贴图；
- 花瓣数 → 程序化排布；
- 形状 → 预置轮廓；
- L-system 只用于装饰藤蔓，不每帧重算。

## 4. 生长

| 阶段 | 时间 | 操作 |
|---|---|---|
| seed | 0 | 播种 |
| sprout | 30s | 浇水 |
| bud | 2h | 施肥 |
| bloom | 4h | 收获 |

- 离线也生长（按时间戳）；
- 缺水会暂停，不死亡；
- 不惩罚玩家。

## 5. 订单

- 访客要 1–3 种花；
- 奖励王都币/种子；
- 每日 3 个；
- 可刷新 1 次（免费）。

## 6. 图鉴

- 每个品种/颜色/形状组合；
- 首次收集给繁荣度；
- 稀有度展示；
- 不显示未发现的具体配方（只给提示）。

## 7. 花园布置

- 网格 6×6；
- 放置花盆/装饰/小径；
- 装饰来自订单/繁荣度；
- 保存布局；
- 双人共享。

## 8. 双人

- 一人浇水、一人修剪；
- 同屏分区；
- 共享花园；
- 不实时联机。

## 9. 经济

- 王都币：订单/每日；
- 种子：订单/商店（游戏币，非内购）；
- 不卖稀有花；
- 广告后置：自愿加速生长。

## 10. UI

- 花园主视图（可缩放/拖动）；
- 底部：种子/工具/订单/图鉴；
- 开花特效：花瓣/星光；
- 统一 design-system。

## 11. 存档

```ts
interface GardenSave {
  schemaVersion: number;
  plants: FlowerPlant[];
  discovered: string[];
  seeds: Record<string, number>;
  orders: MergeOrder[];
  layout: { itemId: string; x: number; y: number }[];
  stats: { planted: number; bloomed: number; bred: number };
}
```

## 12. 事件

- `plant` / `water` / `bloom` / `harvest`；
- `breed`；
- `order_complete`；
- `duo_start/complete`。

## 13. 边界

- 离线时间过长 → 最多累计 24h；
- 时钟回拨 → 用服务器时间/本地单调时间；
- 花园满 → 提示收获/扩建；
- 存档损坏 → 备份 + 重建。

## 14. 测试

- 遗传分布 1000 次；
- 颜色混合边界；
- 离线生长；
- 订单可完成；
- 布局保存；
- 双人输入。

## 15. 风险

- 遗传太复杂 → 只做 4 个可见维度；
- 美术量大 → 花瓣模板 + 染色；
- 离线作弊 → 服务端时间校验（排行榜）；
- 类目 → 休闲种植，无问题。
