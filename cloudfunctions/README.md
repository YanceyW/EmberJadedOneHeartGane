# 云函数部署

## 1. 一次性准备

### 1.1 开通云开发

1. 用微信开发者工具打开本项目（根目录，不是 `dist`）；
2. 顶部工具栏点「云开发」；
3. 首次会提示开通，按引导创建环境，记下**环境 ID**（形如 `cloud1-2gabcdefg1234567`）。

> 环境 ID 不是密钥，客户端本来就要用它初始化，可以直接写在代码里。

### 1.2 环境 ID（已配置）

当前环境 ID 已写入 [src/config.ts](../src/config.ts)：

```ts
export const CLOUD_ENV = 'cloud1-d0gjkempz0f6d4ef2';
```

换环境时改这里并 `npm run build`；留空则整包以离线模式运行（大厅/游戏照常，只是不登录、不云同步）。

> 环境 ID 会随客户端打包，属于公开标识，不是密钥。

### 1.3 建数据库集合

云开发控制台 → 数据库 → 新建集合：

| 集合 | 用途 |
|---|---|
| `players` | 玩家（`_id` = openid） |
| `saves` | 存档（`_id` = `openid_gameId`） |
| `scores` | 分数 |
| `config` | 远程配置（手动建 `_id = global` 的文档） |

权限建议：四个集合都选「仅创建者可读写」，读写全部经云函数，客户端不直连。

### 1.4 建索引（排行榜需要）

`scores` 集合新建组合索引：

```
gameId(升序) + type(升序) + score(降序)
```

不建索引时 `leaderboard` 的 `where + orderBy` 会报错或很慢。

## 2. 部署云函数

### 2.1 图形界面（推荐）

1. 开发者工具左侧资源管理器展开 `cloudfunctions/`；
2. 右键 `login` → **上传并部署：云端安装依赖（不上传 node_modules）**；
3. 对 `sync`、`leaderboard`、`submitScore`、`config`、`deleteAccount` 重复。

第一次部署会安装 `wx-server-sdk`，需要等 1–2 分钟。

### 2.2 命令行（可选，一次部署全部）

本机 CLI 路径：

```
D:\Program Files (x86)\WeChatDevelopTool\微信web开发者工具\cli.bat
```

前提：开发者工具已登录，且「设置 → 安全设置 → 服务端口」已开启。

在 `cmd.exe` 里一次部署全部 6 个函数：

```bat
"D:\Program Files (x86)\WeChatDevelopTool\微信web开发者工具\cli.bat" cloud functions deploy ^
  --env cloud1-d0gjkempz0f6d4ef2 ^
  --names login sync leaderboard submitScore config deleteAccount ^
  --remote-npm-install ^
  --project "D:\Project\WeChat\EmberJadedOneHeartGane"
```

查看已部署的函数：

```bat
"C:\...\cli.bat" cloud functions list --env cloud1-d0gjkempz0f6d4ef2 ^
  --project "D:\Project\WeChat\EmberJadedOneHeartGane"
```

> `--remote-npm-install` 等价于图形界面的「云端安装依赖」，不会上传本地 `node_modules`。

## 3. 验证

1. 重新编译项目；
2. 大厅 → 设置 → 底部应显示「云服务：已连接」；
3. 若显示「离线模式」，看控制台是否有云函数报错，或环境 ID 是否填对；
4. 云开发控制台 → 云函数 → 日志，能看到 `login` 调用记录。

## 4. 函数说明

| 函数 | 作用 | 备注 |
|---|---|---|
| `login` | 返回 openid，首次登录建 `players` 文档 | 客户端静默调用，不弹授权 |
| `sync` | 存档拉取/上传，带 `revision` 冲突检测 | 客户端先写本地，再异步同步 |
| `leaderboard` | 排行榜查询 | 需要组合索引 |
| `submitScore` | 提交分数并返回名次 | 服务端做范围校验 |
| `config` | 返回远程配置 | `config/global` 文档不存在时返回空 |
| `deleteAccount` | 删除 `players`/`saves`/`scores` | 对应「删除我的数据」 |

## 5. 注意

- 客户端不存任何密钥；`openid` 只从 `cloud.getWXContext()` 取。
- 云函数改动后必须重新部署，`dist` 里的客户端代码不含云函数逻辑。
- 每个函数目录有独立 `package.json`，用「云端安装依赖」部署最省事。
- 免费额度有限，上线前先看云开发控制台的用量与告警。
- 联机/云能力正式发布前需要完成小程序备案，见 [compliance.md](../docs/compliance.md)。
