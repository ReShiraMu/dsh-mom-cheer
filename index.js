/**
 * dsh-mom-cheer — injects one fixed line (default "妈妈加油") at the start of
 * every conversation.
 *
 * Mechanism follows the stock time-context plugin: an `agent/pre-step`
 * waterfall listener appends a durable, plugin-sourced user message right
 * after the user's own message on the first step of a turn. The message is
 * written to the session log, so it persists, replays, and compacts like
 * ordinary conversation content.
 *
 * Config (cordis.patch.yml):
 *   text: string          — injected line, default "妈妈加油"
 *   everyTurn: boolean    — true: inject at every turn's first step;
 *                           false (default): only on turn 1, i.e. the start of
 *                           each new conversation (turn numbering survives
 *                           resume via the turnBoundary projection)
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
  const everyTurn = config.everyTurn === true

  ctx.on('agent/pre-step', async ({ turn, step, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted) return decision
    if (step !== 1 || (!everyTurn && turn !== 1)) return decision
    return {
      ...decision,
      messages: [
        ...decision.messages,
        freeze({
          id: randomUUID(),
          role: 'user',
          content: [{ type: 'text', text }],
          source: {
            kind: 'plugin',
            plugin: name,
            form: 'snapshot',
            sections: [{ name, text }],
          },
        }),
      ],
    }
  })
}
