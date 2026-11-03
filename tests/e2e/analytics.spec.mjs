/**
 * @file Checks real SDK page-view privacy and dashboard resilience without sending analytics.
 */
import { test, expect } from './visitor.fixture.mjs'

test('page visits contain only coarse paths, never URL details', async ({ page }) => {
  for (const [entry, path] of [
    ['/', '/'],
    ['/engine/private-job', '/engine'],
    ['/data/private-dataset', '/data'],
    ['/account/private-account', '/account'],
  ]) {
    await page.goto(`${entry}?private=not-for-analytics#private-fragment`)
    const script = page.locator('script[data-sdkn="@vercel/analytics/react"]')
    await expect(script).toHaveCount(1)
    await expect(script).toHaveAttribute('src', '/_vercel/insights/script.js')
    await expect(script).toHaveAttribute('data-disable-auto-track', '1')
    await expect
      .poll(() => page.evaluate(() => window.vaq?.filter(([type]) => type === 'pageview')))
      .toEqual([['pageview', { route: path, path }]])
  }
  // Unknown entry URLs are server 404s; client-side unknown paths still must not leak.
  await page.evaluate(() => {
    history.pushState(null, '', '/private-path?private=value#private')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect
    .poll(() => page.evaluate(() => window.vaq?.filter(([type]) => type === 'pageview')))
    .toEqual([
      ['pageview', { route: '/account', path: '/account' }],
      ['pageview', { route: '/', path: '/' }],
    ])
})

test('history tracks coarse route changes without recounting tabs, themes or URL details', async ({
  page,
}) => {
  await page.goto('/?private=initial#private')
  await expect
    .poll(() => page.evaluate(() => window.vaq?.filter(([type]) => type === 'pageview')))
    .toEqual([['pageview', { route: '/', path: '/' }]])
  await page.getByRole('button', { name: 'Jour', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByText('Engine', { exact: true }).filter({ visible: true }).click()
  await expect(page.getByRole('button', { name: '▶ Run', exact: true }).first()).toBeDisabled()
  await page.evaluate(() => {
    history.pushState(null, '', '/?private=changed#changed')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.evaluate(() => {
    history.pushState(null, '', '/data/private-dataset?private=changed#changed')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect
    .poll(() => page.evaluate(() => window.vaq?.filter(([type]) => type === 'pageview')))
    .toEqual([
      ['pageview', { route: '/', path: '/' }],
      ['pageview', { route: '/data', path: '/data' }],
    ])
  await page.goBack()
  await expect
    .poll(() => page.evaluate(() => window.vaq?.filter(([type]) => type === 'pageview')))
    .toEqual([
      ['pageview', { route: '/', path: '/' }],
      ['pageview', { route: '/data', path: '/data' }],
      ['pageview', { route: '/', path: '/' }],
    ])
  await expect(page.locator('script[data-sdkn="@vercel/analytics/react"]')).toHaveCount(1)
})

test('blocked analytics leaves dashboard navigation and read-only boundaries intact', async ({
  page,
}) => {
  await page.route('**/_vercel/insights/script.js', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByText('EURUSD.csv', { exact: true })).toBeVisible()
  await page.getByText('Engine', { exact: true }).filter({ visible: true }).click()
  await expect(page.getByRole('button', { name: '▶ Run', exact: true }).first()).toBeDisabled()
  await page.getByRole('button', { name: 'Jour', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
