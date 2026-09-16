# dsh-mom-cheer

[English](README.md) | 中文

一个极简的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提示词注入插件：在每轮对话开头注入一句固定文本——默认「妈妈加油」，首轮除外——以持久的、插件署名的 user 消息形式进入会话。

## 工作原理

插件注册 `agent/pre-step` waterfall 监听器（与官方 `time-context` 包相同的机制）。从第二回合起，在每回合的第一步把一条 `source: { kind: 'plugin', plugin: 'mom-cheer' }` 的 user 消息追加在用户消息之后——即模型应答前的近距离位置。

首轮默认跳过：首个请求的结构会锚定整条会话的策略轨迹，因此该句从第二回合才开始出现。注入消息作为普通会话内容写入 session 日志：resume 后仍在、可回放、参与 compaction。回合编号由 `turnBoundary` 会话投影恢复，resume 的会话沿用原编号。

在真实 `headless` 启动上用双回合驱动实测（dsh 0.1.5-rc.2）：首轮不注入，「妈妈加油」在第二回合开头注入。

![双回合实测](assets/headless-demo.png)

session 日志中，注入呈现为一条普通的 `user/message` 事件：

![会话事件](assets/session-event.png)

## 安装

### 1. 预设模式（推荐：按需生效）

把 mom 挂到 **agent 预设** 里：只有选中该预设的会话才注入，其余会话与全局零影响。

在你的预设目录（如 `~/.dsh/.agent-presets/mom/`，通常由内置预设复制而来）的 `agent.cordis.yml` 末尾追加一行：

```yaml
- id: mom-cheer
  name: 'dsh-mom-cheer'        # 包可被预设解析到时用包名；独立目录场景请写文件绝对路径
  config:
    text: '妈妈加油'
```

预设的裸包名按 Node 规则从 harness 的 `node_modules` 向上解析；`dsh-mom-cheer` 不在其中（例如只以 `link:` 依赖装在 profile、或本来就是独立目录）时，直接指向插件入口文件：

```yaml
- id: mom-cheer
  name: 'G:/DeepSeek Harness/dsh-mom-cheer/index.js'
  config:
    text: '妈妈加油'
```

预设行可以携带 `config:`——包自带的 `dsh.bundle.patch` 不写 config，两路互不冲突。新预设立即出现在预设选择器里（发现是每次重读的，无需重启）。

### 2. profile bundle（每个会话都生效）

```bash
dsh plugin --profile web add <本目录路径>
```

包声明了 `dsh.bundle.patch`，安装时自动加入 profile 的 bundle 层栈——该 profile 的**所有**会话都会注入。只想要按需注入时请改用预设模式，避免这条路径。也可通过 `dsh-super-injector` 运行时注入（`dev_inject_plugin <目录>`），免重启生效。

## 配置

在 profile 的 `cordis.patch.yml` 中配置：

```yaml
- id: mom-cheer
  config:
    text: '妈妈加油'          # 注入文本
    includeFirstTurn: false   # true：首轮也注入
```

| 字段 | 类型 | 默认值 | 作用 |
|---|---|---|---|
| `text` | string | `妈妈加油` | 注入的文本，留空回退默认值。 |
| `includeFirstTurn` | boolean | `false` | `false`：从第二回合起每轮开头注入（跳过 turn 1、step 1）；`true`：首轮也注入。 |

## 卸载

```bash
dsh plugin --profile web remove dsh-mom-cheer
```

预设模式下，删掉预设 `agent.cordis.yml` 里的 `mom-cheer` 行即可（对之后新建的会话生效）。

## 验证

注入生效时，会话日志 / 消息流里会出现一条带 `source.plugin: 'mom-cheer'` 署名的普通 `user/message` 事件（Web GUI 里显示为插件署名的 user 消息）。从第二回合起可见即为正常；预设模式只在选中该预设的会话里出现。

## 兼容性

- DeepSeek Harness `>= 0.1.x`（在 `0.1.5-rc.2` 上开发并实测）
- Node `>= 22.19`
- 零运行时依赖

## 许可证

[MIT](LICENSE)
