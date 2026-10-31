/**
 * @file Offline endpoint/routing/asset checks; no listener, upload, or worker access.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

// The private tool lives in scripts/; the emitted candidate config lives at root.
const candidate = fs.existsSync(new URL('../public-hosting.mjs', import.meta.url))
const { publicEndpoints } = await import(candidate ? '../public-hosting.mjs' : './public-hosting.mjs')
const { publicAssets } = await import(candidate ? '../public-assets.mjs' : './public-assets.mjs')
const config = JSON.parse(fs.readFileSync(new URL(candidate ? '../vercel.json' : './public-vercel.json', import.meta.url)))
const hosted = { APOLLO_PUBLIC_TARGET: 'hosted', VITE_API_URL: 'https://visitor.example.test', VITE_WS_URL: 'wss://visitor.example.test/ws' }

test('local target ignores ambient endpoint variables; Vercel cannot silently use local mode', () => {
  assert.deepEqual(publicEndpoints({ VITE_API_URL: 'https://unselected.test' }), { api: '/api', ws: '/ws', hosted: false })
  for (const env of [{ VERCEL: '1' }, { APOLLO_PUBLIC_TARGET: 'production' }]) assert.throws(() => publicEndpoints(env))
})

test('hosted target admits only explicit matching HTTPS/WSS endpoints without operator fallback', () => {
  assert.deepEqual(publicEndpoints(hosted), { api: hosted.VITE_API_URL, ws: hosted.VITE_WS_URL, hosted: true })
  for (const api of [undefined, '', '/api', 'http://visitor.example.test', 'https://visitor.example.test/',
    'https://user:pass@visitor.example.test', 'https://visitor.example.test/api', 'https://visitor.example.test?x=1',
    'https://visitor.example.test#x', 'https://localhost', 'https://127.0.0.1', 'https://visitor.example.test:8000',
    'https://*.example.test', 'https://visitor.example.test.', 'https://VISITOR.example.test']) {
    assert.throws(() => publicEndpoints({ ...hosted, VITE_API_URL: api }), String(api))
  }
  for (const ws of [undefined, '', '/ws', 'ws://visitor.example.test/ws', 'wss://other.example.test/ws',
    'wss://visitor.example.test/ws?token=secret', 'wss://visitor.example.test/ws/']) {
    assert.throws(() => publicEndpoints({ ...hosted, VITE_WS_URL: ws }))
  }
  assert.throws(() => publicEndpoints({ ...hosted, VITE_WS_FALLBACK_PORT: '8000' }))
})

test('Vercel preserves existing files, rewrites only app paths, and never turns API or missing assets into HTML', () => {
  assert.equal(config.buildCommand, 'npm run build:hosted')
  assert.equal(config.outputDirectory, 'dist')
  assert.equal(config.installCommand, 'npm ci --ignore-scripts --no-audit --no-fund --include=dev')
  assert.equal(config.routes[1].handle, 'filesystem')
  const spa = new RegExp('^' + config.routes[2].src + '$')
  for (const url of ['/engine', '/engine/chart', '/data', '/account/settings']) assert.ok(spa.test(url), url)
  for (const url of ['/api', '/api/pairs', '/ws', '/ws/subscription', '/assets/missing.js', '/favicon.png',
    '/notices.html', '/third-party-notices.txt', '/engine/missing.js', '/unknown']) assert.ok(!spa.test(url), url)
  assert.equal(config.routes[3].status, 404)
  assert.equal(config.routes[2].dest, '/index.html')
})

test('hosted assets require the complete fixed set without review metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apollo-hosted-assets-'))
  try {
    const context = { emitFile() { assert.fail('No unselected asset may be emitted') } }
    publicAssets(root).generateBundle.call(context)
    assert.throws(() => publicAssets(root, { required: true }).generateBundle.call(context))
    const assets = path.join(root, 'review-assets')
    fs.mkdirSync(assets)
    fs.writeFileSync(path.join(assets, 'favicon.png'), 'favicon')
    assert.throws(() => publicAssets(root, { required: true }).generateBundle.call(context))
    assert.throws(() => publicAssets(root).generateBundle.call(context))
    fs.writeFileSync(path.join(assets, 'notices.html'), 'notices')
    fs.writeFileSync(path.join(assets, 'third-party-notices.txt'), 'licenses')
    fs.writeFileSync(path.join(assets, 'private.txt'), 'must not be included')
    for (const required of [false, true]) {
      const emitted = []
      publicAssets(root, { required }).generateBundle.call({ emitFile: asset => emitted.push(asset) })
      assert.deepEqual(emitted.map(asset => asset.fileName), ['favicon.png', 'notices.html', 'third-party-notices.txt'])
      assert.deepEqual(emitted.map(asset => asset.source.toString()), ['favicon', 'notices', 'licenses'])
    }
    fs.writeFileSync(path.join(assets, 'third-party-notices.txt'), Buffer.alloc(2_000_001))
    assert.throws(() => publicAssets(root, { required: true }).generateBundle.call(context), /Invalid asset size\/type/)
    fs.unlinkSync(path.join(assets, 'third-party-notices.txt'))
    fs.mkdirSync(path.join(assets, 'third-party-notices.txt'))
    assert.throws(() => publicAssets(root, { required: true }).generateBundle.call(context), /Invalid asset size\/type/)
  } finally { fs.rmSync(root, { recursive: true }) }
})

test('asset loading rejects linked directories', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apollo-linked-assets-'))
  try {
    const target = path.join(root, 'target')
    fs.mkdirSync(target)
    fs.writeFileSync(path.join(target, 'favicon.png'), 'favicon')
    fs.symlinkSync(target, path.join(root, 'review-assets'), process.platform === 'win32' ? 'junction' : 'dir')
    assert.throws(() => publicAssets(root, { required: true }).generateBundle.call({
      emitFile() { assert.fail('Linked assets must not be emitted') },
    }), /Linked asset path/)
  } finally { fs.rmSync(root, { recursive: true }) }
})

test('emitted Vite configuration selects hosted endpoints and retains public-only mode', { skip: !candidate }, async () => {
  const { loadConfigFromFile } = await import('vite')
  const keys = [...Object.keys(hosted), 'VITE_WS_FALLBACK_PORT', 'VERCEL']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  try {
    Object.assign(process.env, hosted, { VITE_WS_FALLBACK_PORT: '', VERCEL: '1' })
    const result = await loadConfigFromFile({ command: 'build', mode: 'public' }, fileURLToPath(new URL('../vite.config.mjs', import.meta.url)))
    assert.equal(result.config.define['import.meta.env.VITE_API_URL'], JSON.stringify(hosted.VITE_API_URL))
    assert.equal(result.config.define['import.meta.env.VITE_WS_URL'], JSON.stringify(hosted.VITE_WS_URL))
    assert.equal(result.config.define['import.meta.env.VITE_WS_FALLBACK_PORT'], '""')
    assert.equal(result.config.publicDir, false)
    assert.equal(result.config.server.host, '127.0.0.1')
    assert.equal(result.config.server.port, 5175)
    assert.equal(result.config.server.proxy['/api'].target, 'http://127.0.0.1:8001')
    assert.deepEqual(result.config.envPrefix, [])
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
})
