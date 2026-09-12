# dsh-mom-cheer

English | [中文](README.zh.md)

A minimal prompt-injection plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): injects one fixed line — `妈妈加油` by default — at the start of every conversation turn after the first, as a durable plugin-attributed user message.

## How it works

The plugin registers an `agent/pre-step` waterfall listener (the same mechanism the stock `time-context` package uses). On the first step of every turn from turn 2 on, it appends a user-role message carrying `source: { kind: 'plugin', plugin: 'mom-cheer' }` right after the user's own message — the close-distance position, immediately before the model responds.

Turn 1 is skipped by default: the first request's structure anchors the whole conversation's policy trajectory, so the line only appears from the second turn on. The message is written to the session log like ordinary conversation content: it persists across resume, replays, and participates in compaction. Turn numbering is restored from the `turnBoundary` session projection, so a resumed session keeps its original numbering.

Verified end-to-end with a two-turn driver on a real `headless` boot (dsh 0.1.5-rc.2): nothing is injected on turn 1, and `妈妈加油` lands at the start of turn 2.

![Two-turn verification](assets/headless-demo.png)

The session log records the injection as a regular `user/message` event:

![Session event](assets/session-event.png)

## Install

```bash
dsh plugin --profile web add <path-to-this-directory>
```

The package declares `dsh.bundle.patch`, so it joins the profile's bundle layer stack automatically on install. It also works with runtime injectors such as `dsh-super-injector` (`dev_inject_plugin <dir>`) without a restart.

## Configuration

Configure through the profile's `cordis.patch.yml`:

```yaml
- id: mom-cheer
  config:
    text: '妈妈加油'          # injected line
    includeFirstTurn: false   # true: also inject on turn 1
```

| Field | Type | Default | Effect |
|---|---|---|---|
| `text` | string | `妈妈加油` | The injected line. Empty falls back to the default. |
| `includeFirstTurn` | boolean | `false` | `false`: inject at the start of every turn from turn 2 on (turn 1, step 1 skipped). `true`: also inject on the first turn. |

## Uninstall

```bash
dsh plugin --profile web remove dsh-mom-cheer
```

## Compatibility

- DeepSeek Harness `>= 0.1.x` (developed and verified on `0.1.5-rc.2`)
- Node `>= 22.19`
- No runtime dependencies

## License

[MIT](LICENSE)
