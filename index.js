/**
 * dsh-mom-cheer — injects one fixed line (default "妈妈加油") at the start of
 * every conversation turn, except the first.
 *
 * Mechanism follows the stock time-context plugin: an `agent/pre-step`
 * waterfall listener appends a durable, plugin-sourced user message right
 * after the user's own message on the first step of a turn. The message is
 * written to the session log, so it persists, replays, and compacts like
 * ordinary conversation content.
 *
 * Turn 1 is skipped by default: the first request's structure anchors the
 * whole conversation's policy trajectory, so the line only appears from the
 * second turn on. Turn numbering is restored from the `turnBoundary` session
 * projection, so a resumed session keeps its original numbering.
 *
 * Config (cordis.patch.yml):
 *   text: string              — injected line, default "妈妈加油"
 *   includeFirstTurn: boolean — true: also inject on turn 1; false (default):
 *                               inject only on turns >= 2
 */

import { randomUUID } from 'node:crypto'

export const name = 'mom-cheer'

/** The agents registry owns pre-step processing. */
export const inject = ['agents']

/** Deep-freeze one message, matching the freezeMessage contract. */
function freeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) freeze(value[key])
    Object.freeze(value)
  }
  return value
}

export function apply(ctx, config = {}) {
  const text = typeof config.text === 'string' && config.text.length > 0
    ? config.text
    : '妈妈加油'
  const includeFirstTurn = config.includeFirstTurn === true

  ctx.on('agent/pre-step', async ({ turn, step, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted) return decision
    if (step !== 1 || (!includeFirstTurn && turn === 1)) return decision
    return {
      ...decision,
      messages: [
        ...decision.messages,
        freeze({
          id: randomUUID(),
          role: 'user',
          content: [{ type: 'text', text }],
          source: {
            kind: `plugin:${name}`,
            form: 'snapshot',
            sections: [{ name, text }],
          },
        }),
      ],
    }
  })
}
