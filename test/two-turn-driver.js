/**
 * Dev-only two-turn driver (harness 0.2.x): creates one agent, sends two
 * followups, then reports which turn each mom-cheer injection landed on.
 *
 * Mount it in place of the headless runner:
 *
 *   dsh --profile headless --patch test/two-turn.patch.yml "x"
 *
 * Not part of the plugin's runtime surface; exists to e2e-test turn gating
 * on a real Harness boot.
 */

import { randomUUID } from 'node:crypto'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionSeq } from '@deepseek-ai/dsh-session'

export const name = 'two-turn-driver'
export const inject = ['agentDefaultModel', 'agents', 'sessions']

/** Every plugin-attributed user message in the session log, with its turn. */
function injections(session) {
  let turn = 0
  const found = []
  for (let seq = 0; seq < session.seq; seq += 1) {
    const event = session.eventAt(SessionSeq(seq))
    if (event?.type === 'turn/start') turn = event.data.turn
    if (event?.type !== 'user/message') continue
    const source = event.data.source
    if (typeof source?.kind !== 'string' || !source.kind.startsWith('plugin:')) continue
    const text = event.data.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
    found.push({ turn, seq, kind: source.kind, text })
  }
  return found
}

async function run(ctx) {
  const agents = ctx.get('agents')
  const defaultModel = ctx.get('agentDefaultModel')
  const sessions = ctx.get('sessions')
  const exit = ctx.get('appExit')
  if (agents === undefined || defaultModel === undefined || sessions === undefined) {
    throw new Error('two-turn-driver: agents / agentDefaultModel / sessions services are missing')
  }
  if (exit === undefined) throw new Error('two-turn-driver: the launcher must provide ctx.appExit')

  const selection = defaultModel.currentSelection()
  const { agent } = await agents.create({
    sessionId: `session-${randomUUID()}`,
    meta: { cwd: process.cwd() },
    agentOptions: { ...selection },
    setup: (agentCtx) => {
      installModelSelection(agentCtx)
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

  await sessions.flush(agent.session)

  const found = injections(agent.session)
  for (const item of found) {
    process.stdout.write(`injected kind=${item.kind} turn=${item.turn} seq=${item.seq} text=${JSON.stringify(item.text)}\n`)
  }
  const turn1 = found.filter((item) => item.turn === 1).length
  const turn2 = found.filter((item) => item.turn === 2).length
  const ok = turn1 === 0 && turn2 > 0
  process.stdout.write(found.length === 0
    ? 'two-turn-driver: FAIL — no plugin injections found\n'
    : `two-turn-driver: ${ok ? 'PASS' : 'FAIL'} — turn1=${turn1} turn2=${turn2}\n`)
  exit(ok ? 0 : 1)
}

export function apply(ctx) {
  run(ctx).catch((error) => {
    process.stderr.write(`two-turn-driver: ${error instanceof Error ? error.message : String(error)}\n`)
    ctx.get('appExit')?.(1)
  })
}
