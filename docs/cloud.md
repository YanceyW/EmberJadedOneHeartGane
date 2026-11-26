# 云开发设计

## 1. 目标

- 免服务器、个人主体可用；
- openid 天然可用；
- 本地优先，云只做增强；
- 成本可控，失败可降级。

## 2. 云函数

| 函数 | 职责 | 输入 | 输出 |
|---|---|---|---|
| `login` | 获取 openid / 初始化玩家 | `{}` | `{ openid, isNew }` |
| `sync` | 拉取/上传存档 | `{ gameId, baseRevision, data }` | `{ revision, data, conflict? }` |
| `leaderboard` | 排行榜 | `{ gameId, type, limit }` | `{ entries }` |
| `submitScore` | 提交分数 | `{ gameId, score, seed, proof? }` | `{ rank, best }` |
| `config` | 远程配置 | `{ version }` | `{ config, version }` |
| `deleteAccount` | 删除数据 | `{}` | `{ ok }` |

## 3. 数据库

### `players`

```json
{
  "_id": "openid",
  "createdAt": 0,
  "lastLoginAt": 0,
  "prosperity": 0,
  "flags": {}
}
```

### `saves`

```json
{
  "_id": "openid_gameId",
  "openid": "...",
  "gameId": "match3",
  "revision": 12,
  "updatedAt": 0,
  "data": {}
}
```

### `scores`

```json
{
  "_id": "auto",
  "openid": "...",
  "gameId": "match3",
  "type": "weekly",
  "score": 1234,
  "seed": 42,
  "createdAt": 0
}
```

### `config`

```json
{
  "_id": "global",
  "version": 3,
  "values": {}
}
```

## 4. 同步协议

```
客户端                          云函数
  |-- sync(gameId, baseRevision, data) -->|
  |                                       |-- 读 saves
  |                                       |-- baseRevision == revision ?
  |                                       |     是：写入 revision+1
  |                                       |     否：调用 merge
  |<-- { revision, data, conflict? } -----|
```

- 客户端先写本地，再入同步队列；
- 队列失败重试（指数退避，上限 5 次）；
- 冲突按游戏 `merge`：
  - 三消：最高分/最高关卡；
  - 花园：最新 revision + 合并图鉴；
  - 合成：较大库存 + 已完成订单；
  - 水族馆：最新鱼缸 + 合并图鉴。
- 服务端时间为准。

## 5. 安全

- 客户端无 Secret；
- openid 只从 `cloud.getWXContext()` 取；
- 所有输入校验类型/长度/范围；
- 写操作限流（每 openid 每分钟 N 次）；
- 分数服务端校验（范围/种子/时间）；
- 数据库权限最小化；
- 日志脱敏，不记录 openid 明文到外部；
- 删除账号：删 `players` + `saves` + `scores`。

## 6. 离线降级

- 未配置 env / `wx.cloud` 不可用 → `offline`；
- 大厅/游戏照常，存档只写本地；
- 排行榜显示「离线不可用」；
- 网络恢复后自动重试；
- 不弹错误弹窗。

## 7. 成本

- 免费额度内开发；
- 读多写少：排行榜缓存、config 缓存；
- 存档合并减少写次数；
- 日志采样；
- 预算告警；
- 上线前压测。

## 8. 环境

| 环境 | 用途 | env |
|---|---|---|
| dev | 开发/测试 | `dev-xxx` |
| prod | 线上 | `prod-xxx` |

- 通过构建变量注入 env；
- 不把 prod env 写进仓库明文（可写 project.private.config.json 并 gitignore）。

## 9. 部署步骤

详细版见 [cloudfunctions/README.md](../cloudfunctions/README.md)，精简版：

1. 开发者工具点「云开发」→ 开通 → 创建环境，记下环境 ID；
2. 把环境 ID 填入 `src/config.ts` 的 `CLOUD_ENV`，`npm run build`；
3. 数据库建集合 `players` / `saves` / `scores` / `config`，权限选「仅创建者可读写」；
4. `scores` → 索引管理 → 添加索引 `gameId_type_score`（非唯一，`gameId` 升序 + `type` 升序 + `score` 降序）；
5. 右键每个云函数 → 上传并部署：云端安装依赖；
6. 重新编译，大厅 → 设置 → 底部「云服务」状态：
   - `已连接`：登录云函数返回了 openid；
   - `连接中`：正在调用；
   - `未连接（检查云函数）`：环境已配置但 `login` 调用失败（没部署 / 没建集合 / 权限不对）；
   - `未配置环境`：`CLOUD_ENV` 为空。

`CLOUD_ENV` 留空时客户端直接进离线模式，不影响本地游玩。

> 环境 ID 会随客户端打包，属于公开标识，不是密钥；泄漏它不能直接读写你的数据库，
> 真正的数据访问由云函数里的 `cloud.getWXContext().OPENID` 与数据库权限控制。

## 10. 客户端接入状态

| 能力 | 状态 | 说明 |
|---|---|---|
| `login` | ✅ | 启动静默登录，失败自动离线 |
| `sync` 云存档 | ✅ | 王都三消进入/胜利/退出时同步；冲突按 `mergeSaves` 合并 |
| `submitScore` | ✅ | 每次过关提交，服务端返回名次 |
| `leaderboard` | ✅ | 大厅底部「排行榜」显示三消周榜 |
| `config` | ⬜ | 云函数已就绪，客户端未接 |
| `deleteAccount` | ⬜ | 云函数已就绪，客户端目前只删本地数据 |

实现要点：

- `CloudSaveService` 用本地 `cloud:revision:<gameId>` 记录服务端版本；
- 同步时带 `baseRevision`，服务端发现不一致返回 `conflict` + 远端数据；
- 客户端 `mergeSaves` 合并后再推一次，保证两边都收敛到最大进度；
- 云失败不阻塞游戏：返回 `null`，本地照常写入，下次再试；
- 排行榜 `type` 用 ISO 周（`TimeService.weekKey()`），天然按周重置。

