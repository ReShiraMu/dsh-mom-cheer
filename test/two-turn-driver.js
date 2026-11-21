/**
 * Dev-only two-turn driver: creates one agent, sends two followups, then
 * reports which turn each mom-cheer injection landed on. Mount it in place
 * of the headless runner:
 *
 *   dsh --profile headless --patch test/two-turn.patch.yml "x"
 *
 * Not part of the plugin's runtime surface; exists to e2e-test turn gating
 * on a real Harness boot.
 */

import { randomUUID } from 'node:crypto'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const name = 'two-turn-driver'
export const inject = ['agentDefaultModel', 'agents', 'sessions']

/** Report the turn of every plugin-sourced user message in the session log. */
function report(agent) {
  let turn = 0
  const lines = []
  for (let seq = 0; seq < agent.session.seq; seq += 1) {
    const event = agent.session.eventAt(seq)
    if (event?.type === 'turn/start') turn = event.data.turn
    if (event?.type !== 'user/message') continue
    const source = event.data?.source
    if (!source?.kind?.startsWith(('plugin')) continue
    const text = event.data.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
    lines.push(`kind=${source.kind} turn=${turn} seq=${seq} text=${JSON.stringify(text)}`)
  }
  process.stdout.write(lines.length === 0 ? 'two-turn-driver: no plugin injections\n' : `two-turn-driver: injections:\n${lines.join('\n')}\n`)
}

async function run(ctx) {
  await ctx.get('loader')?.await()
  const agents = ctx.get('agents')
  const defaultModel = ctx.get('agentDefaultModel')
  const sessions = ctx.get('sessions')
  const selection = defaultModel.currentSelection()
  const { agent } = await agents.create({
    sessionId: `session-${randomUUID()}`,
    meta: { cwd: process.cwd() },
    agentOptions: { provider: selection.provider, model: selection.model },
    setup: (agentCtx) => {
      installModelSelection(agentCtx, { current: selection, assembled: undefined })
    },
  })
  await agent.whenIdle()
  agent.followup(createUserMessage({
    content: [{ type: 'text', text: '第一回合，只回复两个字：收到' }],
    source: { kind: 'user' },
  }))
  await agent.whenIdle()
  agent.followup(createUserMessage({
    content: [{ type: 'text', text: '第二回合，只回复两个字：明白' }],
    source: { kind: 'user' },
  }))
  await agent.whenIdle()
  report(agent)
  await sessions.flush(agent.session)
  ctx.get('appExit')?.(0)
}

export function apply(ctx) {
  run(ctx).catch((error) => {
    process.stderr.write(`two-turn-driver: ${error instanceof Error ? error.message : String(error)}\n`)
    ctx.get('appExit')?.(1)
  })
}
