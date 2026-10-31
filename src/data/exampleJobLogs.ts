/** Fixed synthetic snapshots, never operational jobs or a fallback for live data. */
export type ExampleJobStatus = 'queued' | 'running' | 'done' | 'error'

export interface ExampleJobLog {
  readonly job_id: string
  readonly name: string
  readonly label: string
  readonly status: ExampleJobStatus
  readonly size: number
  readonly lines: readonly string[]
}

const statuses: ExampleJobStatus[] = [
  'done', 'running', 'queued', 'error', 'done',
  'done', 'queued', 'running', 'error', 'done',
]

export const EXAMPLE_JOB_LOGS: readonly ExampleJobLog[] = Object.freeze(statuses.map((status, index) => {
  const number = String(index + 1).padStart(2, '0')
  const date = `2026-01-${number}`
  const messages: [string, string][] = [
    ['INFO', 'Synthetic example only. No computation was executed.'],
    ['INFO', '[xxxx] Example job queued.'],
  ]
  if (status !== 'queued') {
    messages.push(['INFO', '[xxxx] Example worker initialized.'])
    messages.push(['INFO', '[xxxx] Preparing synthetic bar history.'])
  }
  if (status === 'running') {
    messages.push(['INFO', '[xxxx] Sample progress: 50%. This snapshot does not update.'])
  } else if (status === 'done') {
    messages.push(['INFO', '[xxxx] Sample indicator update completed.'])
    messages.push(['INFO', '[xxxx] Example output: 100 synthetic rows; nothing was written.'])
    messages.push(['INFO', '[xxxx] Example job completed.'])
  } else if (status === 'error') {
    messages.push(['WARNING', '[xxxx] Example history is unavailable.'])
    messages.push(['ERROR', '[xxxx] Example job stopped without producing output.'])
  }
  const lines = Object.freeze(messages.map(([level, msg], line) => JSON.stringify({
    ts: `${date}T09:00:${String(line).padStart(2, '0')}Z`, level, msg,
  })))
  return Object.freeze({
    job_id: `example-${number}`,
    name: `example-${number}.jsonl`,
    label: `xxxx example ${number} · ${date}`,
    status,
    size: new TextEncoder().encode(`${lines.join('\n')}\n`).length,
    lines,
  })
}))
