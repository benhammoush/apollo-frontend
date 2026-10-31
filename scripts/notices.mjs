/**
 * @file Reproduces frontend dependency notices from the locked installed runtime graph.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const sections = []
const incorporated = readFileSync('scripts/incorporated-notices.txt', 'utf8')
  .trim()
  .split(/\r?\n={20,}\r?\n/)
// Vite's browser preload helper is incorporated into static output.
const paths = Object.keys(lock.packages).filter(
  (path) => path && (!lock.packages[path].dev || path === 'node_modules/vite'),
)
for (const path of paths.sort()) {
  const entry = lock.packages[path]
  const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'))
  assert.equal(pkg.version, entry.version, `Installed dependency mismatch: ${path}`)
  const notices = readdirSync(path).filter((name) =>
    /^(?:licen[cs]e|copying|notice|copyright)(?:\..*)?$/i.test(name),
  )
  if (notices.length)
    sections.push(
      `${pkg.name} ${pkg.version}\nLicence: ${pkg.license ?? 'see text below'}\n\n${notices
        .sort()
        .map((name) => readFileSync(join(path, name), 'utf8').trim())
        .join('\n\n')}`,
    )
  else
    assert.ok(
      incorporated.some((text) => text.startsWith(`${pkg.name} ${pkg.version}\n`)),
      `Review missing licence text: ${pkg.name}`,
    )
  if (pkg.name === 'victory-vendor')
    for (const child of readdirSync(join(path, 'lib-vendor')).sort()) {
      sections.push(
        `victory-vendor incorporated ${child}\n\n${readFileSync(join(path, 'lib-vendor', child, 'LICENSE'), 'utf8').trim()}`,
      )
    }
}

// Lightweight Charts embeds tslib even when it is not a separate installed package.
for (const text of incorporated) {
  const [name, version] = text.trim().split('\n')[0].split(' ')
  if (name !== 'tslib')
    assert.equal(
      lock.packages[`node_modules/${name}`]?.version,
      version,
      `Review incorporated notice for ${name}`,
    )
  sections.push(text.trim())
}
const introduction =
  'APOLLO THIRD-PARTY NOTICES\n\nThird-party material retains its own licences. Apollo first-party showcase terms do not restrict these licences.\n\nThis collection covers the locked frontend runtime graph, the incorporated Vite preload helper and tslib. Backend packages are not part of this artifact. This is not a certification of first-party authorship or market-data rights.\n\nTradingView Lightweight Charts™\nCopyright (с) 2025 TradingView, Inc. https://www.tradingview.com/'
// Normalize line endings and trailing spaces without changing notice wording.
const text =
  `${introduction}\n\n${'='.repeat(72)}\n${sections.join('\n\n' + '='.repeat(72) + '\n')}\n`
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apollo · Third-party notices</title><link rel="icon" href="/favicon.png"><style>body{margin:24px auto;padding:0 16px;max-width:880px;font:14px/1.65 system-ui,sans-serif}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#2563eb}</style></head><body><main><h1>Third-party notices</h1><p><a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">Charts by TradingView</a></p><p><a href="/third-party-notices.txt">Plain-text notices</a></p><pre>${escaped}</pre></main></body></html>\n`
for (const [file, content] of [
  ['third-party-notices.txt', text],
  ['notices.html', html],
]) {
  const path = `review-assets/${file}`
  if (process.argv.includes('--check'))
    assert.equal(
      readFileSync(path, 'utf8'),
      content,
      `Refresh ${file} with node scripts/notices.mjs`,
    )
  else writeFileSync(path, content)
}
