# 王都水族馆

## 1. 核心

养鱼 → 繁育 → 鱼纹变化 → 造景 → 访客订单。

## 2. 循环

```
短：喂鱼/清理（30 秒）
中：繁育/图鉴/订单（1–7 天）
长：造景/赛季鱼/收集（7–30 天）
```

## 3. 基因

```ts
interface FishGenome {
  species: string;
  body: 'round' | 'long' | 'flat';
  pattern: 'solid' | 'stripe' | 'spot' | 'gradient';
  colorA: string;
  colorB: string;
  fin: 'short' | 'long' | 'fan';
  size: number;
  rarity: 1 | 3 | 5 | 7 | 9;
}
```

### 遗传

- 体型/鳍：显隐；
- 颜色：Lab 混合 + 变异；
- 花纹：反应-扩散/细胞自动机 + 对称；
- 稀有度：父母均值 + 变异；
- seeded。

## 4. 鱼纹

- 斑纹：细胞自动机 + 对称；
- 条纹：正弦扰动；
- 渐变：HSV 插值；
- 斑点：Poisson 采样；
- 生成一次缓存为纹理；
- 同 seed 一致。

## 5. 鱼缸

- 6×6 装饰网格；
- 水草/珊瑚/石头/小桥；
- 鱼群 Boids（上限 20）；
- 水质/饥饿/快乐；
- 离线衰减，不死亡。

## 6. 繁育

- 两条鱼 → 1 条幼鱼；
- 冷却 4h；
- 需要食物；
- 幼鱼继承父母基因 + 变异；
- 图鉴记录。

## 7. 订单

- 访客要某花纹/颜色/稀有度；
- 奖励王都币/装饰；
- 每日 3 个；
- 可刷新 1 次。

## 8. 图鉴

- 鱼种/花纹/颜色；
- 首次收集给繁荣度；
- 不显示未发现配方。

## 9. 造景

- 装饰来自订单/繁荣度；
- 保存布局；
- 双人共享。

## 10. 双人

- 一人喂鱼、一人清理；
- 同屏分区；
- 共享鱼缸；
- 不实时联机。

## 11. 经济

- 王都币：订单/每日；
- 鱼食：游戏币；
- 不卖稀有鱼；
- 广告后置：自愿加速。

## 12. UI

- 鱼缸主视图；
- 底部：喂食/繁育/订单/图鉴/造景；
- 气泡/水光/星光；
- 统一 design-system。

## 13. 存档

```ts
interface AquariumSave {
  schemaVersion: number;
  fish: Fish[];
  discovered: string[];
  food: number;
  tank: Tank;
  orders: MergeOrder[];
  stats: { bred: number; fed: number; visitors: number };
}
```

## 14. 事件

- `feed` / `clean` / `breed`；
- `order_complete`；
- `decorate`；
- `duo_start/complete`。

## 15. 边界

- 鱼缸满 → 提示；
- 离线衰减上限 24h；
- 时钟回拨 → 单调时间；
- 存档损坏 → 重建；
- 低端机鱼群上限降低。

## 16. 测试

- 遗传分布；
- 鱼纹可复现；
- Boids 不崩溃；
- 订单可完成；
- 双人输入；
- 存档 migration。

## 17. 风险

- 鱼纹生成慢 → 缓存 + 预生成；
- 鱼群 AI 耗性能 → 上限/降级；
- 美术量大 → 模板 + 染色；
- 类目 → 休闲养鱼，无问题。
