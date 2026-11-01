/**
 * @file Exercises rendered visitor workspace, persistence, datasets, errors and restricted controls.
 */
import { test, expect } from './visitor.fixture.mjs'

test('fresh workspace paints both default charts and restores its selected dataset', async ({
  page,
  visitor,
}) => {
  await page.goto('/')
  await expect(page.getByText('EURUSD.csv', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Indicators 1 ▾', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Indicators 1 ▾', exact: true }).click()
  await expect(page.getByText('Sess.OHLC', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Indicators 1 ▴', exact: true }).click()
  await expect(page.getByText(/40 of 120 rows loaded/)).toBeVisible()
  await expect(
    page.getByText('Synthetic template · no original rows', { exact: true }),
  ).toBeVisible()
  for (const field of ['dataset_id:', 'schema_version:', 'revision:', 'paginated:', 'page_size:'])
    await expect(page.getByText(field, { exact: true })).toHaveCount(0)
  for (const label of ['Workspace 1', 'Engine', 'Storage', 'Data'])
    await expect(page.getByText(label, { exact: true }).filter({ visible: true })).toBeVisible()
  await expect
    .poll(() => visitor.requests.filter((url) => url.startsWith('/market/')).length)
    .toBeGreaterThanOrEqual(2)
  await expect
    .poll(() =>
      page.locator('canvas').evaluateAll(
        (canvases) =>
          canvases.filter((canvas) => {
            const context = canvas.getContext('2d')
            if (!context || !canvas.width || !canvas.height) return false
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
            let colored = 0
            for (let i = 0; i < data.length; i += 4)
              if ((data[i] > 150 && data[i + 1] < 120) || (data[i + 1] > 120 && data[i] < 120))
                colored++
            return colored > 200
          }).length,
      ),
    )
    .toBeGreaterThanOrEqual(2)
  await page.reload()
  await expect(page.getByText('EURUSD.csv', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Indicators 1 ▾', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Indicators 1 ▾', exact: true }).click()
  await expect(page.getByText('Sess.OHLC', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'M1 ▾', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'H4 ▾', exact: true })).toBeVisible()
})

test('dataset JSON paging retains loaded rows after a later-page error', async ({
  page,
  visitor,
}) => {
  visitor.failLater = true
  await page.goto('/')
  await expect(page.getByText(/40 of 120 rows loaded/)).toBeVisible()
  await page.getByRole('button', { name: 'JSON Tree', exact: true }).click()
  await expect(page.getByText(/Search, sort, JSON and copy use loaded rows only/)).toBeVisible()
  await page.getByRole('button', { name: 'Table', exact: true }).evaluate((button) => {
    const panel = button.parentElement.parentElement.parentElement
    for (const node of panel.querySelectorAll('div'))
      if (getComputedStyle(node).overflow === 'auto' && node.scrollHeight > node.clientHeight) {
        node.scrollTop = node.scrollHeight
        node.dispatchEvent(new Event('scroll'))
      }
  })
  await expect(page.getByRole('alert')).toContainText('Loading stopped: HTTP 503')
  await expect(page.getByText(/40 of 120 rows loaded/)).toBeVisible()
  visitor.failLater = false
  await page.getByRole('button', { name: 'Reload dataset' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('initial dataset failure offers an explicit retry', async ({ page, visitor }) => {
  visitor.failFile = true
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
  visitor.failFile = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText(/40 of 120 rows loaded/)).toBeVisible()
})

test('dataset search and successful JSON paging use the loaded subset', async ({ page }) => {
  // Row-tool assertions start after the selected snapshot arrives, not during queued chart reads.
  await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/storage/file' && response.status() === 200,
    ),
    page.goto('/'),
  ])
  await expect(page.getByText(/40 of 120 rows loaded/)).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Search 40 rows', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'JSON Tree', exact: true }).click()
  for (const count of [80, 120]) {
    await page.getByRole('button', { name: 'Table', exact: true }).evaluate((button) => {
      const panel = button.parentElement.parentElement.parentElement
      for (const node of panel.querySelectorAll('div'))
        if (getComputedStyle(node).overflow === 'auto' && node.scrollHeight > node.clientHeight) {
          node.scrollTop = node.scrollHeight
          node.dispatchEvent(new Event('scroll'))
        }
    })
    await expect(page.getByText(`${count} of 120 rows loaded`, { exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Table', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search 120 rows', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search 120 rows', exact: true }).fill('synthetic-39')
  await expect(page.getByText('synthetic-39', { exact: true })).toBeVisible()
  await expect(page.getByText('synthetic-0', { exact: true })).toHaveCount(0)
  await page.getByPlaceholder(/^Search \d+(?:\/\d+)? rows$/).clear()
})

test('theme preference and searchable synthetic logs survive workspace reload', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Jour', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  // Persistence deliberately debounces writes; reload only after the save is observable.
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('apollo_v2') ?? '{}').uiThemeMode),
    )
    .toBe('light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('note')).toContainText('Synthetic example logs')
  await page.getByRole('textbox', { name: 'Search example job logs' }).fill('Synthetic')
  await expect(page.getByText(/No computation was executed/)).toBeVisible()
})

test('engine and data deep links keep execution and export unavailable', async ({ page }) => {
  await page.goto('/engine')
  const run = page.getByRole('button', { name: '▶ Run', exact: true })
  await expect(run.first()).toBeVisible()
  for (const button of await run.all()) await expect(button).toBeDisabled()
  await page.goto('/data')
  await expect(page.getByRole('button', { name: /Add terminal/i })).toBeDisabled()
  await expect(page.getByRole('button', { name: /Export OHLC/i })).toBeDisabled()
})

for (const type of ['engine', 'data', 'storage']) {
  test(`${type} reload keeps the remembered workspace instead of requesting unselected symbols`, async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByText('EURUSD.csv', { exact: true })).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem('apollo_v2') ?? '{}').slots?.[2]?.selectedFile,
        ),
      )
      .toBe('indicators/Triggers_BT/EURUSD.csv')
    const slots = await page.evaluate(() => JSON.parse(localStorage.getItem('apollo_v2')).slots)
    await page
      .getByText({ engine: 'Engine', data: 'Data', storage: 'Storage' }[type], { exact: true })
      .filter({ visible: true })
      .click()
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = JSON.parse(localStorage.getItem('apollo_v2') ?? '{}')
          return state.tabs?.find((tab) => tab.id === state.activeTabId)?.type
        }),
      )
      .toBe(type)
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    // Force a save of the reloaded live state while the workspace is still hidden.
    await page.getByRole('button', { name: 'Jour', exact: true }).click()
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = JSON.parse(localStorage.getItem('apollo_v2') ?? '{}')
          return { theme: state.uiThemeMode, slots: state.slots }
        }),
      )
      .toEqual({ theme: 'light', slots })
    await page.getByText('Workspace 1', { exact: true }).click()
    await expect(page.getByText('EURUSD.csv', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'M1 ▾', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'H4 ▾', exact: true })).toBeVisible()
    await expect(page.getByRole('note')).toContainText('Synthetic example logs')
  })
}

test('Levels stays unavailable after restoring previously enabled chart settings', async ({
  page,
  visitor,
}) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('apollo_v2'))).not.toBeNull()
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('apollo_v2'))
    const charts = [saved.charts, ...(saved.tabs ?? []).map((tab) => tab.charts)]
    for (const group of charts)
      for (const chart of Object.values(group ?? {})) {
        chart.indicators = {
          ...chart.indicators,
          levels: { enabled: true, showH1: true, showD1: true },
        }
        chart.levelVisible = { H1: true, D1: true }
      }
    localStorage.setItem('apollo_v2', JSON.stringify(saved))
  })
  await page.reload()
  await expect(page.getByText(/40 of 120 rows loaded/)).toBeVisible()
  await page.getByRole('button', { name: 'Indic. ▾', exact: true }).first().click()
  const unavailable = page.getByRole('button', { name: 'xxx', exact: true })
  await expect(unavailable).toHaveCount(15)
  for (const button of await unavailable.all()) await expect(button).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Niveaux', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sessions OHLC', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Stock Exchanges', exact: true })).toBeEnabled()
  expect(visitor.requests.some((url) => url.startsWith('/levels/'))).toBe(false)
})

test('mobile navigation stays usable without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('nav').getByRole('button', { name: 'Storage', exact: true }).click()
  await expect(page.getByRole('button', { name: /Indicators \d+ folders?$/ })).toBeVisible()
  await page.locator('nav').getByRole('button', { name: 'Data', exact: true }).click()
  await expect(page.getByRole('button', { name: /Add terminal/i })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('nav').getByRole('button', { name: 'Workspace', exact: true }).click()
  await expect(page.locator('canvas:visible').first()).toBeVisible()
})

test('socket disconnect is visible and reconnects without HTTP writes', async ({
  page,
  visitor,
}) => {
  await page.goto('/')
  await expect(page.getByText('CONNECTED', { exact: true })).toBeVisible()
  const count = visitor.sockets.length
  visitor.sockets.at(-1).close({ code: 1000, reason: 'UI reconnection fixture' })
  await expect(page.getByText('OFFLINE', { exact: true })).toBeVisible()
  await expect.poll(() => visitor.sockets.length).toBeGreaterThan(count)
  await expect(page.getByText('CONNECTED', { exact: true })).toBeVisible()
})

test('static routing preserves notices and rejects API, sockets and missing files', async ({
  request,
}) => {
  for (const path of [
    '/',
    '/engine',
    '/data',
    '/account',
    '/notices.html',
    '/third-party-notices.txt',
  ]) {
    expect((await request.get(path)).status()).toBe(200)
  }
  for (const path of ['/api', '/ws', '/unknown', '/assets/missing.js', '/docs/SETUP.md', '/.env'])
    expect((await request.get(path)).status()).toBe(404)
})
