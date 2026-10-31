/**
 * @file Guards synthetic history date bounds and stable candle snapshots.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { historyBars } from '../e2e/history.fixture.mjs'

test('synthetic history honors inclusive UTC dates for M1 and H4 requests', () => {
  const snapshot = Date.parse('2026-10-31T00:01:00Z')
  for (const tf of ['M1', 'H4']) {
    const all = historyBars(new URL(`https://fixture/market/EURUSD?tf=${tf}`), snapshot)
    for (const [start, end] of [
      ['2026-10-30', '2026-10-30'],
      ['2026-10-31', '2026-10-31'],
      ['2026-11-01', '2026-11-01'],
    ]) {
      const selected = historyBars(
        new URL(`https://fixture/market/EURUSD?tf=${tf}&start=${start}&end=${end}`),
        snapshot,
      )
      assert.deepEqual(
        selected,
        all.filter((bar) => {
          const date = new Date(bar.time * 1000).toISOString().slice(0, 10)
          return date >= start && date <= end
        }),
      )
    }
    assert.deepEqual(
      historyBars(new URL(`https://fixture/market/EURUSD?tf=${tf}&end=2026-10-29`), snapshot),
      all.filter((bar) => bar.time < Date.parse('2026-10-30') / 1000),
    )
    assert.deepEqual(
      historyBars(new URL(`https://fixture/market/EURUSD?tf=${tf}&start=2026-10-31`), snapshot),
      all.filter((bar) => bar.time >= Date.parse('2026-10-31') / 1000),
    )
    assert.equal(all.length, 120)
    assert.ok(all.every((bar, i) => i === 0 || all[i - 1].time < bar.time))
  }
})

test('synthetic history does not advance when a test crosses a minute boundary', (t) => {
  const snapshot = Date.parse('2026-10-31T20:12:59Z')
  const clock = t.mock.method(Date, 'now', () => snapshot)
  const url = new URL('https://fixture/market/EURUSD?tf=M1&start=2026-10-31&end=2026-10-31')
  const initial = historyBars(url, snapshot)
  clock.mock.mockImplementation(() => snapshot + 2000)
  assert.deepEqual(historyBars(url, snapshot), initial)
  assert.notDeepEqual(historyBars(url, Date.now()), initial)
})
