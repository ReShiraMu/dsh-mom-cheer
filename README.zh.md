# dsh-mom-cheer

[English](README.md) | 中文

一个极简的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提示词注入插件：在每个对话开头注入一句固定文本——默认「妈妈加油」——以持久的、插件署名的 user 消息形式进入会话。

## 工作原理

插件注册 `agent/pre-step` waterfall 监听器（与官方 `time-context` 包相同的机制）。在会话第一回合的第一步，把一条 `source: { kind: 'plugin', plugin: 'mom-cheer' }` 的 user 消息追加在用户消息之后——即模型应答前的近距离位置。

该消息作为普通会话内容写入 session 日志：resume 后仍在、可回放、参与 compaction。回合编号由 `turnBoundary` 会话投影恢复，因此 resume 的会话不会重复注入。

![无头模式实测](assets/headless-demo.png)

session 日志中，注入呈现为一条普通的 `user/message` 事件：

![会话事件](assets/session-event.png)

## 安装

```bash
dsh plugin --profile web add <本目录路径>
```

包声明了 `dsh.bundle.patch`，安装时自动加入 profile 的 bundle 层栈。也可通过 `dsh-super-injector` 运行时注入（`dev_inject_plugin <目录>`），免重启生效。

## 配置

在 profile 的 `cordis.patch.yml` 中配置：

```yaml
- id: mom-cheer
  config:
    text: '妈妈加油'     # 注入文本
    everyTurn: false     # true：每一回合开头都注入，而非仅第一回合
```

| 字段 | 类型 | 默认值 | 作用 |
|---|---|---|---|
| `text` | string | `妈妈加油` | 注入的文本，留空回退默认值。 |
| `everyTurn` | boolean | `false` | `false`：每个新对话只注入一次（turn 1、step 1）；`true`：每条用户消息后都注入（每回合 step 1）。 |

## 卸载

```bash
dsh plugin --profile web remove dsh-mom-cheer
```

## 兼容性

- DeepSeek Harness `>= 0.1.x`（在 `0.1.5-rc.1` 上开发并实测）
- Node `>= 22.19`
- 零运行时依赖

## 许可证

[MIT](LICENSE)
