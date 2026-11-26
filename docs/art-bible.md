# 美术圣经（Art Bible）

> 统一视觉的最终依据。新资产先对照本文，再进资产库。

## 1. 世界观

「休闲王都」是一座漂浮在云海上的小城：

- 房子是奶油色/薄荷色，屋顶圆润，窗户暖黄；
- 街道有花瓣、纸灯、喷泉、小猫；
- 没有战争、恐怖、阴暗、写实脏污；
- 每个场馆是一栋小建筑，门口有招牌和排队小人；
- 白天偏暖、傍晚偏金、夜晚偏蓝紫 + 暖灯。

## 2. 视觉支柱

1. **圆润**：没有尖角，所有转角都有半径；
2. **奶油**：低饱和暖底，不用纯白；
3. **手账**：纸张颗粒、水彩边缘、贴纸感；
4. **统一光照**：左上暖光，3 阶明暗；
5. **有限颜色**：每屏主色 ≤ 5 个 + accent。

## 3. 角色

- 2.5 头身；吉祥物 2 头身；
- 大眼睛、小嘴巴、圆手圆脚；
- 表情夸张但友善；
- 服装用大色块 + 少量纹样；
- 不做写实人体、不做性感化、不做恐怖；
- 角色资产用位图/切件，不用每帧矢量重绘。

## 4. 场景

### 大厅（王都街区）

- 中央喷泉/广场，四周 4 个场馆；
- 前景花草/小猫，中景建筑，远景云海/山丘；
- 建筑招牌用代码渲染文字，图片不带文字；
- 夜晚版本：暖灯 + 蓝紫天空 + 星光。

### 王都三消

- 甜品/宝石主题：马卡龙、莓果、星星、蜂蜜罐；
- 棋盘背景是奶油纸 + 淡格纹；
- 消除特效：花瓣/星光/糖霜，不用爆炸/火焰。

### 王都花园

- 花圃、温室、木栅栏、蝴蝶；
- 花色来自遗传系统，素材用可染色花瓣；
- 背景是柔和草地 + 远山 + 云。

### 甜品合成屋

- 厨房/店铺：木架、糖罐、烤箱、格子桌布；
- 甜品链从原料到蛋糕，颜色暖；
- 合并特效：糖霜/闪光/小星星。

### 王都水族馆

- 水蓝/浅紫，玻璃缸、水草、珊瑚、气泡；
- 鱼纹由算法生成，鱼身用可染色模板；
- 光照从水面下投，柔和焦散。

## 5. 材质/光照

- 纸张颗粒：低透明度噪声，叠加在背景；
- 水彩边缘：轻微不规则描边；
- 高光：柔和、低对比，不用镜面白点；
- 阴影：暖灰/深棕，透明度 0.15–0.25；
- 不用照片纹理、金属反射、HDR。

## 6. 构图

- 竖屏 9:16；主体在中上部，底部留操作区；
- 视觉重心偏上 1/3；
- 前景/中景/远景三层；
- 重要按钮不被手指遮挡；
- 文字用代码渲染，图片不嵌文字。

## 7. AI 生成规范

### 7.1 通用正向提示词

```
cute cozy mobile game art, cream and mint palette, soft watercolor texture,
rounded shapes, thick warm outline, top-left warm light, 3-tone shading,
storybook illustration, clean composition, no text, no logo, no watermark,
high quality, centered subject
```

### 7.2 通用负向提示词

```
realistic, photorealistic, dark, horror, gore, neon cyberpunk, sharp spikes,
pure black, pure white, text, letters, watermark, logo, extra limbs,
deformed hands, cluttered background, high contrast, metallic
```

### 7.3 每款追加

- 三消：`macaron, berry, star, honey jar, candy, soft grid background`
- 花园：`flower garden, greenhouse, butterfly, wooden fence, pastel petals`
- 合成：`cozy bakery, sugar jar, oven, checkered tablecloth, dessert`
- 水族馆：`aquarium, water plant, coral, bubble, soft caustics, koi fish`

### 7.4 生成参数

- SDXL Lightning 4-step，1024×1024 或 832×1216；
- CFG 1.5–2.5；固定 seed 便于复现；
- 一次 4–8 张候选；
- 生成记录：prompt/negative/seed/model/date；
- 只选 1 张进入修图。

## 8. 资产规格

| 类型 | 规格 |
|---|---|
| 图标 | 96×96 / 144×144，透明 PNG/WebP |
| 角色 | 512–1024，切件 |
| 场景 | 750×1334 或分层 |
| UI 九宫格 | 可拉伸，边缘 24–48 |
| 图集 | ≤ 2048×2048 |
| 音频 SFX | 单声道 44.1k/22.05k，短 |
| BGM | 单声道/低码率，循环 |

## 9. 禁止

- 纯黑/纯白大面积；
- 写实人脸/明星/品牌；
- 恐怖/血腥/性感化；
- 图片内文字（用代码渲染）；
- 未授权字体/素材；
- 每款游戏自创 UI 风格。
