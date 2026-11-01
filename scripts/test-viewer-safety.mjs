/**
 * @file Offline checks for viewer safety seams and real hook paths.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'

/** Transpile only explicit source modules, injecting browser/React dependencies in memory. */
const designModules = new Map()
function loadDesignModule(relative = 'index.ts') {
  if (!designModules.has(relative)) designModules.set(relative, loadSource(`design-system/${relative}`))
  return designModules.get(relative)
}

function loadSource(relative, dependencies = {}, apiUrl = '') {
  const source = readFileSync(new URL(`../src/${relative}`, import.meta.url), 'utf8')
    .replaceAll('import.meta.env.VITE_API_URL', JSON.stringify(apiUrl))
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  const require = name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (relative.startsWith('design-system/')) {
      if (name === 'react') return React
      if (name === 'react/jsx-runtime') return jsxRuntime
      if (name.startsWith('.')) {
        const base = new URL(name, new URL(`../src/${relative}`, import.meta.url))
        const found = ['', '.ts', '.tsx', '/index.ts'].map(extension => new URL(base.href + extension))
          .find(url => existsSync(url) && !url.href.endsWith('/'))
        const prefix = new URL('../src/design-system/', import.meta.url).href
        assert.ok(found?.href.startsWith(prefix), `Design system imported a non-presentation dependency: ${name}`)
        return loadDesignModule(found.href.slice(prefix.length))
      }
    }
    if (/^(?:\.\.\/)+design-system$/.test(name)) return loadDesignModule()
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`)
    return dependencies[name]
  }
  new Function('require', 'module', 'exports', output)(require, module, module.exports)
  return module.exports
}

const connection = loadSource('utils/connectionStatus.ts')
const history = loadSource('utils/readOhlcvResponse.ts')
const paging = loadSource('utils/datasetPaging.ts')
const bar = { time: 1704067200, open: 1.1, high: 1.2, low: 1, close: 1.15, volume: 0 }

test('default workspace opens EURUSD history, its selected dataset and left-chart session OHLC', () => {
  const state = loadSource('store/persistedState.ts')
  const workspace = state.DEFAULT_TAB
  assert.equal(workspace.layoutMode, 4)
  assert.deepEqual(workspace.slots, [
    { type: 'chart', symbol: 'EURUSD' }, { type: 'chart', symbol: 'EURUSD' },
    { type: 'dataset', selectedFile: 'indicators/Triggers_BT/EURUSD.csv', openRandom: false }, { type: 'logs' },
  ])
  assert.equal(workspace.charts['0'].tf, 'M1')
  assert.equal(workspace.charts['1'].tf, 'H4')
  assert.ok(Object.values(workspace.charts['0'].indicators.sessionsOhlc).every(value => value === true))
  assert.ok(Object.entries(workspace.charts['0'].indicators).every(([id, indicator]) => id === 'sessionsOhlc' || !indicator.enabled))
  assert.ok(Object.values(workspace.charts['1'].indicators).every(indicator => !indicator.enabled))
  assert.deepEqual(state.DEFAULT_PERSISTED.slots.slice(0, 4), workspace.slots)
  assert.deepEqual(state.DEFAULT_PERSISTED.charts, workspace.charts)
  assert.deepEqual(state.DEFAULT_PERSISTED.tabs.map(tab => [tab.name, tab.type]), [
    ['Workspace 1', 'workspace'], ['Engine', 'engine'], ['Storage', 'storage'], ['Data', 'data'],
  ])
  assert.equal(state.DEFAULT_PERSISTED.activeTabId, workspace.id)
  assert.equal(new Set(state.DEFAULT_PERSISTED.tabs.map(tab => tab.id)).size, 4)
  assert.deepEqual(state.DEFAULT_PERSISTED.slotSymbols.slice(0, 2), ['EURUSD', 'EURUSD'])
})

test('workspace examples are chosen only from visible admitted files and explicit selections never reroll', () => {
  const { selectWorkspaceDataset } = loadSource('utils/workspaceDataset.ts')
  const a = { type: 'file', name: 'First.json', path: 'indicators/first.json' }
  const b = { type: 'file', name: 'Second.json', path: 'indicators/second.json' }
  const tree = [{ type: 'folder', name: 'Indicators', path: 'indicators', children: [a,
    { type: 'folder', name: 'Nested', path: 'indicators/nested', children: [b] }] },
    { type: 'folder', name: 'Unit Tests', path: 'unit_tests', children: [{ type: 'file', name: 'Hidden', path: 'unit_tests/hidden.json' }] }]
  assert.equal(selectWorkspaceDataset(tree, undefined, true, () => 0), a)
  assert.equal(selectWorkspaceDataset(tree, undefined, true, () => 0.999), b)
  assert.equal(selectWorkspaceDataset(tree, b.path, true, () => assert.fail('Saved selection must not reroll')), b)
  assert.equal(selectWorkspaceDataset(tree, 'unselected/private.json', true), null)
  assert.equal(selectWorkspaceDataset(tree, 'unit_tests/hidden.json', true), null)
  assert.equal(selectWorkspaceDataset([], undefined, true), null)
  assert.equal(selectWorkspaceDataset(tree, undefined, false), null, 'Closing a viewer must not auto-open another file')
})

test('new workspace defaults do not replace the existing workspace or its preferences', () => {
  const state = loadSource('store/persistedState.ts')
  const chart = state.withChartStateDefaults({ tf: 'H1' })
  let current = { ...state.DEFAULT_PERSISTED, uiThemeMode: 'light', layoutMode: 1,
    slots: [{ type: 'chart', symbol: 'EURUSD' }], charts: { '0': chart }, activeTabId: 'existing',
    tabs: [{ ...state.DEFAULT_TAB, id: 'existing', name: 'My saved workspace', layoutMode: 1,
      slots: [{ type: 'chart', symbol: 'EURUSD' }], charts: { '0': chart } }] }
  const { PersistedProvider } = loadSource('store/PersistedContext.tsx', {
    react: { createContext: () => ({ Provider: 'provider' }), useCallback: fn => fn, useContext: () => {},
      useMemo: fn => fn(), useState: initial => [typeof initial === 'function' ? initial() : initial, update => {
        current = typeof update === 'function' ? update(current) : update
      }] },
    'react/jsx-runtime': jsxRuntime,
    './persistedState': state,
    './persistence': { PersistenceManager: { load: () => current, save: () => {} } },
  })
  const ctx = PersistedProvider({ children: null }).props.value
  ctx.addTab('workspace')
  const id = current.activeTabId
  assert.equal(current.layoutMode, 4)
  assert.deepEqual(current.slots, state.DEFAULT_TAB.slots)
  assert.equal(current.charts['0'].tf, 'M1')
  assert.equal(current.charts['1'].tf, 'H4')
  assert.equal(current.uiThemeMode, 'light')
  ctx.setSlotContent(2, { type: 'dataset', selectedFile: 'indicators/chosen.json', openRandom: false })
  ctx.updateChart('0', { tf: 'M15' })
  ctx.switchTab('existing')
  assert.equal(current.layoutMode, 1)
  assert.equal(current.charts['0'].tf, 'H1')
  assert.equal(current.tabs[0].name, 'My saved workspace')
  ctx.switchTab(id)
  assert.equal(current.slots[2].selectedFile, 'indicators/chosen.json')
  assert.equal(current.charts['0'].tf, 'M15')
  assert.equal(state.DEFAULT_TAB.charts['0'].tf, 'M1', 'Editing a new workspace must not mutate the defaults')
})

test('fresh storage opens four default tabs without reopening closed tabs in a saved workspace', () => {
  const state = loadSource('store/persistedState.ts')
  const { PersistenceManager } = loadSource('store/persistence.ts', { './persistedState': state })
  const originalStorage = globalThis.localStorage
  let saved = null
  try {
    globalThis.localStorage = { getItem: () => saved }
    assert.deepEqual(PersistenceManager.load().tabs.map(tab => tab.type), ['workspace', 'engine', 'storage', 'data'])
    saved = JSON.stringify({ ...state.DEFAULT_PERSISTED, uiThemeMode: 'light',
      tabs: [{ ...state.DEFAULT_TAB, name: 'My saved workspace' }] })
    const restored = PersistenceManager.load()
    assert.equal(restored.tabs.length, 1)
    assert.equal(restored.tabs[0].name, 'My saved workspace')
    assert.equal(restored.uiThemeMode, 'light')
    assert.equal(restored.activeTabId, state.DEFAULT_TAB.id)
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  }
})

test('saving snapshots live workspace slots and charts so reload preserves a chosen or closed dataset', t => {
  const state = loadSource('store/persistedState.ts')
  const { PersistenceManager } = loadSource('store/persistence.ts', { './persistedState': state })
  let save
  t.mock.method(globalThis, 'setTimeout', callback => { save = callback; return 0 })
  const originalStorage = globalThis.localStorage
  let written
  try {
    globalThis.localStorage = { getItem: () => written, setItem: (key, value) => { assert.equal(key, 'apollo_v2'); written = value } }
    for (const slot of [{ type: 'dataset', selectedFile: 'indicators/chosen.json', openRandom: false },
      { type: 'dataset', openRandom: false }]) {
      const existing = { ...state.DEFAULT_TAB, id: 'other', name: 'Untouched', layoutMode: 1,
        slots: [{ type: 'logs' }], charts: {} }
      const live = { ...state.DEFAULT_PERSISTED, tabs: [state.DEFAULT_TAB, existing],
        slots: state.DEFAULT_TAB.slots.map((value, index) => index === 2 ? slot : value),
        charts: { ...state.DEFAULT_TAB.charts, '0': state.withChartStateDefaults({ tf: 'M5' }) } }
      const before = JSON.stringify(live)
      PersistenceManager.save(live)
      save()
      const parsed = JSON.parse(written)
      assert.deepEqual(parsed.tabs[0].slots[2], slot)
      assert.equal(parsed.tabs[0].charts['0'].tf, 'M5')
      assert.deepEqual(parsed.tabs[1], existing)
      const restored = PersistenceManager.load()
      assert.deepEqual(restored.slots[2], slot)
      assert.equal(restored.charts['0'].tf, 'M5')
      assert.equal(JSON.stringify(live), before, 'Saving must not mutate active/default tab records')
    }
    assert.equal(state.DEFAULT_TAB.slots[2].openRandom, false)
    assert.equal(state.DEFAULT_TAB.slots[2].selectedFile, 'indicators/Triggers_BT/EURUSD.csv')
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  }
})

test('page-tab reloads preserve remembered mixed workspace slots, preferences and other tabs', t => {
  const state = loadSource('store/persistedState.ts')
  const { PersistenceManager } = loadSource('store/persistence.ts', { './persistedState': state })
  let save
  t.mock.method(globalThis, 'setTimeout', callback => { save = callback; return 0 })
  const originalStorage = globalThis.localStorage
  let written
  try {
    globalThis.localStorage = { getItem: () => written, setItem: (key, value) => { assert.equal(key, 'apollo_v2'); written = value } }
    for (const type of ['engine', 'data', 'storage']) {
      for (const dataset of [{ type: 'dataset', selectedFile: 'indicators/chosen.json', openRandom: false },
        { type: 'dataset', openRandom: false }]) {
        const slots = [{ type: 'chart', symbol: 'EURUSD' }, dataset, { type: 'logs', selectedJobId: 'example-2' }, { type: 'empty' }]
        const charts = { '0': state.withChartStateDefaults({ tf: 'M5', broker: 'market',
          settings: { ...state.DEFAULT_CHART_SETTINGS, candleUp: '#112233' } }) }
        const workspace = { ...state.DEFAULT_TAB, id: 'remembered', name: 'My workspace',
          slots, charts, activeSlot: 2, panelSizes: { rows: [45, 55], cols: [[60, 40], [50, 50]] }, symbolSyncEnabled: true }
        const other = { ...state.DEFAULT_TAB, id: 'other', name: 'Untouched', layoutMode: 1,
          slots: [{ type: 'logs' }], charts: {} }
        const live = { ...state.DEFAULT_PERSISTED, ...workspace, uiThemeMode: 'light',
          chartSettings: { ...state.DEFAULT_CHART_SETTINGS, candleDown: '#334455' },
          tabs: [other, workspace, { id: 'page', name: type, type }], activeTabId: 'page' }
        const before = JSON.stringify(live)
        PersistenceManager.save(live)
        save()
        for (let reload = 0; reload < 2; reload++) {
          const restored = PersistenceManager.load()
          for (const key of ['slots', 'charts', 'layoutMode', 'activeSlot', 'panelSizes',
            'symbolSyncEnabled', 'uiThemeMode', 'chartSettings', 'tabs', 'activeTabId']) {
            assert.deepEqual(restored[key], live[key], `${type} reload must preserve ${key}`)
          }
          PersistenceManager.save(restored)
          save()
        }
        assert.equal(JSON.stringify(live), before, 'Save/reload must not mutate the input')
      }
    }
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  }
})

test('slot restoration keeps active workspace precedence, slot sanitation and legacy symbol migration', () => {
  const state = loadSource('store/persistedState.ts')
  const { PersistenceManager } = loadSource('store/persistence.ts', { './persistedState': state })
  const originalStorage = globalThis.localStorage
  let saved
  try {
    globalThis.localStorage = { getItem: () => JSON.stringify(saved) }
    saved = { ...state.DEFAULT_PERSISTED, slots: [{ type: 'logs' }] }
    assert.deepEqual(PersistenceManager.load().slots, state.DEFAULT_TAB.slots, 'Active workspace wins over stale flat slots')
    saved = { ...saved, tabs: [{ id: 'page', name: 'Data', type: 'data' }], activeTabId: 'page',
      slots: [{ type: 'monitor' }, { type: 'chart', symbol: '' }, { type: 'dataset', openRandom: false }] }
    assert.deepEqual(PersistenceManager.load().slots, [
      { type: 'empty' }, { type: 'chart', symbol: 'EURUSD' }, { type: 'dataset', openRandom: false },
    ])
    delete saved.slots
    const migratedSlots = state.DEFAULT_PERSISTED.slotSymbols.map(symbol => ({ type: 'chart', symbol }))
    assert.deepEqual(PersistenceManager.load().slots, migratedSlots, 'Page tabs without slots retain the legacy migration')
    saved = { slotSymbols: ['EURUSD', 'EURUSD'], charts: {}, layoutMode: 2 }
    const migrated = PersistenceManager.load()
    assert.equal(migrated.tabs[0].type, 'workspace')
    assert.deepEqual(migrated.slots, migratedSlots, 'Pre-tab saves still migrate symbol lists')
    saved = { tabs: [{ id: 'old', name: 'Chart 2', type: 'chart', slotSymbols: ['EURUSD'], charts: {} }], activeTabId: 'old' }
    assert.deepEqual(PersistenceManager.load().slots, [{ type: 'chart', symbol: 'EURUSD' }])
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  }
})

test('new charts have no automatically visible session or exchange indicators', () => {
  const state = loadSource('store/persistedState.ts')
  const chart = state.withChartStateDefaults()
  for (const indicator of Object.values(chart.indicators)) assert.equal(indicator.enabled, false)
  for (const id of ['sessionLevels', 'sessionsOhlc', 'stockExchanges']) {
    assert.ok(Object.values(state.DEFAULT_CHART_INDICATORS[id]).every(value => value === false))
    assert.ok(Object.values(chart.indicators[id]).every(value => value === false))
  }
})

test('saved disabled legacy overlays are cleared without erasing explicitly enabled selections or chart preferences', () => {
  const state = loadSource('store/persistedState.ts')
  const legacy = {
    tf: 'M1', broker: 'market',
    settings: { ...state.DEFAULT_CHART_SETTINGS, candleUp: '#112233' },
    sources: { trends: 'selected-result', families: null, triggers: null, sessionLevels: null },
    indicators: { ...state.DEFAULT_CHART_INDICATORS,
      sessionLevels: { enabled: false, showSydney: true, showTokyo: true, showLondon: true, showNewYork: true },
      sessionsOhlc: { enabled: false, showSydney: true, showTokyo: true, showLondon: true, showNewYork: true },
      stockExchanges: { enabled: false, showTSE: true, showLSE: true, showNYSE: true } },
  }
  const before = JSON.stringify(legacy)
  const normalized = state.withChartStateDefaults(legacy)
  for (const id of ['sessionLevels', 'sessionsOhlc', 'stockExchanges']) {
    assert.ok(Object.values(normalized.indicators[id]).every(value => value === false))
  }
  assert.equal(normalized.tf, 'M1')
  assert.equal(normalized.broker, 'market')
  assert.equal(normalized.settings.candleUp, '#112233')
  assert.equal(normalized.sources.trends, 'selected-result')
  assert.equal(JSON.stringify(legacy), before, 'Normalization must not mutate saved input')
  assert.deepEqual(state.withChartStateDefaults(normalized), normalized)
  for (const id of ['sessionLevels', 'sessionsOhlc', 'stockExchanges']) {
    const chosen = { ...normalized.indicators[id], enabled: true }
    chosen[id === 'stockExchanges' ? 'showLSE' : 'showLondon'] = true
    const explicit = state.withChartStateDefaults({ ...legacy, indicators: { ...legacy.indicators, [id]: chosen } })
    assert.deepEqual(explicit.indicators[id], chosen)
    assert.deepEqual(state.withChartStateDefaults(explicit).indicators[id], chosen)
  }
})

test('workspace reload and old chart templates normalize disabled overlay defaults without resetting storage', () => {
  const state = loadSource('store/persistedState.ts')
  const { PersistenceManager } = loadSource('store/persistence.ts', { './persistedState': state })
  const templates = loadSource('store/templateStore.ts', { './persistedState': state })
  const legacy = { ...state.withChartStateDefaults(), indicators: { ...state.DEFAULT_CHART_INDICATORS,
    sessionLevels: { enabled: false, showSydney: true, showTokyo: true, showLondon: true, showNewYork: true },
    sessionsOhlc: { enabled: false, showSydney: true, showTokyo: true, showLondon: true, showNewYork: true },
    stockExchanges: { enabled: false, showTSE: true, showLSE: true, showNYSE: true } } }
  const saved = JSON.stringify({ ...state.DEFAULT_PERSISTED, charts: { '0': legacy },
    tabs: [{ ...state.DEFAULT_PERSISTED.tabs[0], charts: { '0': legacy } }] })
  const originalStorage = globalThis.localStorage
  try {
    globalThis.localStorage = { getItem: key => { assert.equal(key, 'apollo_v2'); return saved },
      setItem: () => assert.fail('Loading must not rewrite saved storage'), removeItem: () => assert.fail('No storage reset') }
    const loaded = PersistenceManager.load()
    for (const chart of [loaded.charts['0'], loaded.tabs[0].charts['0'],
      state.withChartStateDefaults(templates.applySlotToChartState(state.withChartStateDefaults(), templates.slotFromChartState(legacy)))]) {
      for (const id of ['sessionLevels', 'sessionsOhlc', 'stockExchanges']) {
        assert.ok(Object.values(chart.indicators[id]).every(value => value === false))
      }
    }
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  }
})

test('ngrok warning header is limited to configured HTTPS API reads and preserves caller options', () => {
  const { ngrokRequestInit } = loadSource('utils/ngrokRequestInit.ts')
  const api = 'https://example.ngrok-free.dev'
  const controller = new AbortController()
  const headers = new Headers({ 'X-Query-Trigger': 'manual', Accept: 'application/json' })
  const init = { headers, signal: controller.signal, cache: 'no-store', credentials: 'omit' }
  for (const suffix of ['dev', 'app']) {
    const base = `https://example.ngrok-free.${suffix}`
    const result = ngrokRequestInit(`${base}/health`, base, init)
    assert.equal(result.headers.get('ngrok-skip-browser-warning'), '1')
    assert.equal(result.headers.get('X-Query-Trigger'), 'manual')
    assert.equal(result.headers.get('Accept'), 'application/json')
    assert.equal(result.signal, controller.signal)
    assert.equal(result.cache, 'no-store')
    assert.equal(result.credentials, 'omit')
    assert.equal(headers.has('ngrok-skip-browser-warning'), false)
  }
  for (const [url, base, options = init] of [
    ['/api/health', '/api'], ['/health', ''], ['http://127.0.0.1:8001/health', 'http://127.0.0.1:8001'],
    ['https://visitor.example.test/health', 'https://visitor.example.test'],
    [`${api}/health`, 'http://example.ngrok-free.dev'],
    ['http://example.ngrok-free.dev/health', api], ['https://other.ngrok-free.dev/health', api],
    ['https://example.ngrok-free.dev.attacker.test/health', api],
    ['https://example.ngrok-free.dev:8443/health', api], ['https://user@example.ngrok-free.dev/health', api],
    [`${api}/health`, `${api}/api`], [`${api}/health`, `${api}?query=1`],
    [`${api}/health`, `${api}#fragment`], [`${api}/health`, 'https://user@example.ngrok-free.dev'],
    [`${api}/health`, api, { ...init, method: 'POST' }],
  ]) assert.equal(ngrokRequestInit(url, base, options), options, `${url} configured as ${base}`)
  assert.equal(ngrokRequestInit(`${api}/health`, api).headers.get('ngrok-skip-browser-warning'), '1')
  const tupleInit = { headers: [['Accept', 'application/json']], method: 'get' }
  assert.equal(ngrokRequestInit(`${api}/health`, api, tupleInit).headers.get('Accept'), 'application/json')
})

test('API reads, polling and both dedup paths use the scoped ngrok transport without enabling writes', async () => {
  const api = 'https://example.ngrok-free.dev'
  const ngrok = loadSource('utils/ngrokRequestInit.ts')
  const transport = loadSource('utils/viewerApi.ts', { './ngrokRequestInit': ngrok }, api)
  const { dedupFetch } = loadSource('utils/dedupFetch.ts', { './viewerApi': transport })
  const originalFetch = globalThis.fetch
  const calls = []
  let cleanup
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init })
      return new Response('{"read_only":true}', { headers: { 'Content-Type': 'application/json' } })
    }
    assert.deepEqual(await transport.apiGet('/health'), { read_only: true })
    await dedupFetch(`${api}/pairs`)
    await dedupFetch(`${api}/storage/tree`, { cache: 'no-store' })
    const { useApi } = loadSource('hooks/useApi.ts', {
      '../utils/viewerApi': transport,
      react: { useState: initial => [initial, () => {}], useCallback: fn => fn,
        useEffect: effect => { cleanup = effect() } },
    })
    useApi('/health')
    await Promise.resolve()
    assert.equal(calls.length, 4)
    for (const call of calls) assert.equal(call.init.headers.get('ngrok-skip-browser-warning'), '1')
    assert.equal(calls[2].init.cache, 'no-store')
    assert.equal(calls[3].init.signal.aborted, false)
    cleanup()
    assert.equal(calls[3].init.signal.aborted, true)
    for (const action of [() => transport.apiPost('/jobs', {}), () => transport.apiPut('/jobs', {}),
      () => transport.apiDelete('/jobs'), () => transport.apiCancelJob('synthetic'),
      () => transport.apiGetJobResult('synthetic')]) await assert.rejects(action, /Unavailable/)
    assert.equal(calls.length, 4)
  } finally {
    if (cleanup) cleanup()
    globalThis.fetch = originalFetch
  }
})

test('Design-system themes derive CSS variables from the same typed palette without owning persistence', () => {
  const system = loadDesignModule()
  const tokens = loadDesignModule('tokens.ts')
  const previousDocument = globalThis.document
  const originalMode = system.getThemeMode()
  const properties = new Map()
  const root = { dataset: {}, style: { setProperty: (key, value) => properties.set(key, value) } }
  try {
    globalThis.document = { documentElement: root }
    for (const mode of ['light', 'dark']) {
      const palette = system.applyThemeMode(mode)
      assert.equal(palette, tokens.themes[mode])
      assert.equal(system.theme, palette, 'Public exports must retain the live palette binding')
      assert.equal(system.getThemeMode(), mode)
      assert.equal(root.dataset.theme, mode)
      assert.equal(root.style.colorScheme, mode)
      assert.deepEqual(Object.fromEntries(properties), system.getThemeCssVariables(mode))
      assert.equal(properties.get('--app-bg'), palette.colors.bg.primary)
      assert.equal(properties.get('--app-fg'), palette.colors.text.primary)
      assert.equal(properties.get('--app-scrollbar-track'), palette.colors.bg.card)
      assert.equal(properties.get('--apollo-colors-text-axis-text'), palette.colors.text.axisText)
      assert.equal(properties.get('--apollo-fonts-sans'), palette.fonts.sans)
      assert.equal(properties.get('--apollo-fonts-size-sm'), `${palette.fonts.size.sm}px`)
      assert.equal(properties.get('--apollo-fonts-weight-bold'), String(palette.fonts.weight.bold))
      assert.equal(properties.get('--apollo-spacing-md'), `${palette.spacing.md}px`)
      assert.equal(properties.get('--apollo-radii-lg'), `${palette.radii.lg}px`)
      const resolve = value => value.replace(/var\((--[a-z-]+)\)/g, (_match, name) => properties.get(name))
      assert.equal(resolve(system.inputStyle.background), palette.colors.bg.deep)
      assert.equal(resolve(system.inputStyle.color), palette.colors.text.primary)
      assert.equal(resolve(system.inputStyle.border), `1px solid ${palette.colors.border.muted}`)
      assert.equal(resolve(system.inputStyleLg.background), palette.colors.bg.input)
      assert.equal(resolve(system.selectStyleLg.border), `1px solid ${palette.colors.border.default}`)
      assert.equal(resolve(system.checkStyle.accentColor), palette.colors.text.link)
      assert.equal(resolve(system.labelTextStyle.color), palette.colors.text.secondary)
      assert.equal(resolve(system.optionalTextStyle.color), palette.colors.text.disabled)
      assert.equal(system.buttonSecondaryStyle().color, palette.colors.text.secondary)
    }
    assert.equal(system.hexWithAlpha('#112233', 0.5), 'rgba(17,34,51,0.5)')
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
    system.applyThemeMode(originalMode)
  }
})

test('Moved shared UI retains native disabled controls, skeleton semantics and modal dismissal', () => {
  const system = loadDesignModule()
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(system.LaunchActionButton, { label: 'Run', disabled: true }),
    React.createElement(system.DatasetSkeleton, { label: 'Loading rows', rows: 3 }),
    React.createElement(system.Dot, { color: system.theme.colors.accent.green }),
  ))
  assert.match(html, /<button[^>]*disabled=""/)
  assert.match(html, /role="status" aria-label="Loading rows" aria-live="polite"/)
  assert.match(html, /aria-hidden="true"/)
  let effect
  const events = []
  const previousDocument = globalThis.document
  const fakeDocument = { addEventListener: (type, fn) => events.push([type, fn]),
    removeEventListener: (type, fn) => events.push([`remove:${type}`, fn]) }
  const { default: Modal } = loadSource('design-system/components/Modal.tsx', {
    react: { useEffect: fn => { effect = fn } },
  })
  let closed = 0
  const tree = Modal({ title: 'Example', children: 'Content', onClose: () => closed++ })
  try {
    globalThis.document = fakeDocument
    const cleanup = effect()
    events[0][1]({ key: 'Enter' })
    assert.equal(closed, 0)
    events[0][1]({ key: 'Escape' })
    assert.equal(closed, 1)
    tree.props.onClick()
    assert.equal(closed, 2)
    let stopped = false
    tree.props.children.props.onClick({ stopPropagation: () => { stopped = true } })
    assert.ok(stopped)
    cleanup()
    assert.equal(events[1][0], 'remove:keydown')
    assert.equal(events[1][1], events[0][1])
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})

test('Design-system ownership has no legacy imports, feature dependencies or competing base palette', () => {
  const root = new URL('../src/', import.meta.url)
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(entry.name, directory)
      if (entry.isDirectory()) { scan(new URL(entry.name + '/', directory)); continue }
      if (!/\.tsx?$/.test(entry.name)) continue
      const relative = url.href.slice(root.href.length)
      const source = readFileSync(url, 'utf8')
      const file = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true)
      for (const node of file.statements) {
        if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue
        const spec = node.moduleSpecifier?.text
        if (!spec) continue
        if (relative.startsWith('design-system/')) {
          assert.ok(spec === 'react' || spec.startsWith('.'), `${relative}: unexpected dependency ${spec}`)
          if (spec.startsWith('.')) assert.ok(new URL(spec, url).href.startsWith(new URL('design-system/', root).href), `${relative}: feature dependency ${spec}`)
        } else {
          assert.ok(!/^(?:\.\.\/|\.\/)+(?:theme|.*shared\/(?:Modal|InfoTip|Dot|DatasetSkeleton|LaunchCard|formStyles))$/.test(spec), `${relative}: legacy presentation import ${spec}`)
          if (spec.includes('design-system/')) assert.equal(relative === 'main.tsx' ? spec : '', './design-system/styles.css', `${relative}: use the public design-system entry`)
        }
      }
    }
  }
  scan(root)
  const main = readFileSync(new URL('main.tsx', root), 'utf8')
  assert.match(main, /import '\.\/design-system\/styles\.css'/)
  assert.doesNotMatch(main, /style\.textContent|createElement\('style'\)/)
  const base = readFileSync(new URL('design-system/base.css', root), 'utf8')
  assert.doesNotMatch(base, /#[a-fA-F\d]{3,8}\b/)
  const tokens = readFileSync(new URL('design-system/tokens.ts', root), 'utf8')
  assert.doesNotMatch(tokens, /\b(?:document|window|localStorage|fetch)\s*[.(]/)
})

test('Indicator modal masks and disables the fifteen unavailable entries, including Levels', () => {
  const tokens = loadDesignModule()
  const library = loadSource('components/chart/indicatorLibrary.ts')
  const persisted = loadSource('store/persistedState.ts')
  const { default: IndicatorModal } = loadSource('components/chart/IndicatorModal.tsx', {
    'react/jsx-runtime': jsxRuntime, '../../design-system': tokens, './indicatorLibrary': library,
  })
  const disabledIds = ['bollingerBands', 'atr', 'adx', 'rsi', 'ema20', 'ema50', 'ema200',
    'sma20', 'sma50', 'sma200', 'trends', 'families', 'triggers', 'sessionLevels', 'levels']
  function collectButtons(node, result = []) {
    if (!React.isValidElement(node)) return result
    if (node.type === 'button') result.push(node)
    React.Children.forEach(node.props.children, child => collectButtons(child, result))
    return result
  }
  for (const active of [false, true]) {
    const indicators = structuredClone(persisted.DEFAULT_CHART_INDICATORS)
    for (const indicator of Object.values(indicators)) {
      for (const [key, value] of Object.entries(indicator)) if (typeof value === 'boolean') indicator[key] = active
    }
    const actions = []
    const props = { open: true, indicators, showTrends: { H1: active }, showFamilies: active,
      onClose: () => actions.push('close'), onSelect: id => actions.push(id) }
    const tree = IndicatorModal(props)
    const buttons = collectButtons(tree)
    assert.equal(buttons.length, library.INDICATOR_DEFINITIONS.length + 1)
    const choices = buttons.filter(button => button.props.children?.type === 'span')
    assert.equal(choices.filter(button => button.props.disabled).length, 15)
    for (const [index, definition] of library.INDICATOR_DEFINITIONS.entries()) {
      const masked = disabledIds.includes(definition.id)
      const choice = choices[index]
      assert.ok(choice)
      assert.equal(choice.props.disabled, masked)
      assert.equal(choice.props.children.props.children, masked ? 'xxx' : definition.label)
      if (masked) {
        assert.equal(choice.props.onClick, undefined)
      } else {
        choice.props.onClick()
      }
    }
    assert.deepEqual(actions, ['close', 'sessionsOhlc', 'close', 'stockExchanges'])
    const html = renderToStaticMarkup(tree)
    for (const definition of library.INDICATOR_DEFINITIONS.filter(def => disabledIds.includes(def.id))) {
      assert.ok(!html.includes(`<span>${definition.label}</span>`))
    }
    assert.equal(IndicatorModal({ ...props, open: false }), null)
  }
})

test('unavailable Levels cannot be restored from saved or legacy chart settings', () => {
  const state = loadSource('store/persistedState.ts')
  for (const saved of [
    { indicators: { levels: { enabled: true, showH1: true, showD1: true } } },
    { levelVisible: { H1: true, W1: true } },
  ]) {
    const input = { ...saved, tf: 'H4', symbol: 'EURUSD', fibSettings: { lineColor: '#123456' },
      indicators: { ...saved.indicators,
        stockExchanges: { enabled: true, showTSE: true },
        sessionsOhlc: { enabled: true, showLondon: true } } }
    const before = structuredClone(input)
    const restored = state.withChartStateDefaults(input)
    assert.deepEqual(restored.indicators.levels, state.DEFAULT_CHART_INDICATORS.levels)
    assert.equal(restored.indicators.stockExchanges.showTSE, true)
    assert.equal(restored.indicators.sessionsOhlc.showLondon, true)
    assert.equal(restored.tf, 'H4')
    assert.equal(restored.symbol, 'EURUSD')
    assert.equal(restored.fibSettings.lineColor, '#123456')
    assert.deepEqual(input, before)
  }
})

test('Dashboard version matches package metadata and both headers omit the Notices label', () => {
  const version = loadSource('appVersion.ts')
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
  assert.equal(version.APP_PACKAGE_VERSION, '0.0.1')
  assert.equal(version.APP_DISPLAY_VERSION, 'v0.0.1')
  assert.equal(pkg.version, version.APP_PACKAGE_VERSION)
  assert.equal(lock.version, pkg.version)
  assert.equal(lock.packages[''].version, pkg.version)
  for (const header of ['AppHeader', 'MobileHeader']) {
    const source = readFileSync(new URL(`../src/components/layout/${header}.tsx`, import.meta.url), 'utf8')
    assert.match(source, /\{APP_DISPLAY_VERSION\}/)
    assert.doesNotMatch(source, /NoticesLink|notices\.html/)
  }
})

test('Ten synthetic job logs are fixed, bounded and contain no private names or operational data', () => {
  const { EXAMPLE_JOB_LOGS: jobs } = loadSource('data/exampleJobLogs.ts')
  assert.equal(jobs.length, 10)
  assert.equal(new Set(jobs.map(job => job.job_id)).size, 10)
  assert.equal(new Set(jobs.map(job => job.name)).size, 10)
  assert.deepEqual([...new Set(jobs.map(job => job.status))].sort(), ['done', 'error', 'queued', 'running'])
  assert.ok(Object.isFrozen(jobs))
  for (const job of jobs) {
    assert.ok(Object.isFrozen(job) && Object.isFrozen(job.lines))
    assert.match(job.label, /^xxxx example \d{2} · 2026-01-\d{2}$/)
    assert.ok(job.lines.length >= 2 && job.lines.length <= 7)
    assert.equal(job.size, new TextEncoder().encode(`${job.lines.join('\n')}\n`).length)
    const rows = job.lines.map(line => JSON.parse(line))
    assert.match(rows[0].msg, /Synthetic example only/)
    assert.ok(rows.slice(1).every(row => row.msg.startsWith('[xxxx]')))
    assert.ok(rows.every(row => Number.isFinite(Date.parse(row.ts))))
    assert.doesNotMatch(JSON.stringify(job), /Bollinger|Trends|Families|Trigger BT|NBL|[A-Z]:\\|https?:\/\/|password|account_id|terminal_path/)
  }
  assert.deepEqual(loadSource('data/exampleJobLogs.ts').EXAMPLE_JOB_LOGS, jobs)
})

test('Example logs render all jobs and selected content on desktop/mobile without operational controls or polling', () => {
  const tokens = loadDesignModule()
  const examples = loadSource('data/exampleJobLogs.ts')
  const time = loadSource('utils/time.ts')
  function renderLogs({ mobile = false, selected, mobileLog = false } = {}) {
    let stateIndex = 0
    const react = { ...React, useState(initial) {
      const index = stateIndex++
      return React.useState(index === 0 && selected ? selected : mobileLog && initial === 'files' ? 'log' : initial)
    } }
    const { default: Logs } = loadSource('components/Logs.tsx', {
      react, 'react/jsx-runtime': jsxRuntime, '../design-system': tokens,
      '../hooks/useIsMobile': { useIsMobile: () => mobile },
      '../utils/time': time, '../data/exampleJobLogs': examples,
      '@tanstack/react-virtual': { useVirtualizer: ({ count }) => ({
        getTotalSize: () => count * 17,
        getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 17, size: 17 })),
        scrollToIndex() {},
      }) },
    })
    return renderToStaticMarkup(React.createElement(Logs))
  }
  for (const mobile of [false, true]) {
    const html = renderLogs({ mobile })
    assert.match(html, /Synthetic example logs/)
    assert.match(html, /10 fixed snapshots, not live jobs/)
    for (const job of examples.EXAMPLE_JOB_LOGS) assert.ok(html.includes(job.label.split(' · ')[0]))
    assert.equal((html.match(/aria-pressed=/g) ?? []).length, 10)
    assert.doesNotMatch(html, /title="(?:Rename|Delete|Worker config)"|Download/)
    for (const job of examples.EXAMPLE_JOB_LOGS) {
      const selected = renderLogs({ mobile, mobileLog: mobile, selected: job.name })
      assert.ok(selected.includes(JSON.parse(job.lines.at(-1)).msg))
    }
  }
  const source = readFileSync(new URL('../src/components/Logs.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /fetchWithMeta|fetchWithRetry|viewerApi|\bfetch\s*\(|setInterval|WebSocket|JobConfigModal|commitRename|deleteJob/)
})

test('Engine cards mask display names while preserving internal selections and read-only actions', () => {
  const tokens = loadDesignModule()
  const symbols = loadSource('components/shared/SymbolMultiSelect.tsx', {
    react: React, 'react/jsx-runtime': jsxRuntime, '../../design-system': tokens,
  })
  for (const brokers of [[], ['market']]) {
    const { default: Cards } = loadSource('components/DatasetsTab.tsx', {
      react: React, 'react/jsx-runtime': jsxRuntime, '../design-system': tokens,
      '../hooks/useSystemStatus': { useSystemStatus: () => ({ agentOverview: {}, symbols: ['EURUSD'] }) },
      '../contexts/BrokerDataContext': { useBrokers: () => ({ brokers }) },
      './shared/SymbolMultiSelect': symbols,
      '../utils/fetchWithMeta': { fetchWithMeta: () => assert.fail('Cards must not issue operational requests') },
      './viewer/MaskedTriggerBtModal': { default: () => null },
      './viewer/MaskedNblModal': { default: () => null },
    })
    const html = renderToStaticMarkup(React.createElement(Cards))
    const runButtons = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs)]
      .filter(match => match[2].includes('Run'))
    assert.equal(runButtons.length, 6)
    assert.ok(runButtons.every(match => /\bdisabled=""/.test(match[1])),
      'Every computation Run button must stay disabled, including with an available broker')
    const visible = html.replace(/<[^>]*>/g, ' ')
    assert.doesNotMatch(visible, /Bollinger|Trends|Families|Trigger BT|Levels Metrics|Session Levels|Divergence Analysis|Score|Broker Quality|Unit Tests|IC Markets|Pepperstone|Spike delay|Spread/)
    assert.ok((visible.match(/xxxx/g) ?? []).length >= 13)
    for (const id of ['bb', 'trends', 'families', 'trigger_bt', 'nbl', 'session_levels']) {
      assert.match(html, new RegExp(`value="${id}"[^>]*>xxxx</option>`))
    }
    const names = [...html.matchAll(/placeholder="([^"]*)"/g)]
      .map(match => match[1]).filter(value => /\d{4}-\d{2}-\d{2}/.test(value))
    assert.equal(names.length, 2)
    assert.ok(names.every(value => value.startsWith('xxxx - ')))
  }
})

test('Storage hides only the Unit Tests root without changing the stored tree', () => {
  const source = readFileSync(new URL('../src/components/Storage.tsx', import.meta.url), 'utf8')
  const file = ts.createSourceFile('Storage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let initializer
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'visibleTree') initializer = node.initializer
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert.ok(initializer, 'Storage must derive its visible categories from the full tree')
  const visible = new Function('tree', `return ${initializer.getText(file)}`)
  const indicators = Object.freeze({ path: 'indicators', children: [{ path: 'indicators/trends' }] })
  const unitTests = Object.freeze({ path: 'unit_tests', children: [{ path: 'unit_tests/existing.csv' }] })
  const tree = Object.freeze([indicators, unitTests])
  assert.deepEqual(visible(tree), [indicators])
  assert.deepEqual(visible([unitTests]), [])
  assert.equal(tree[1], unitTests)
  assert.match(source, /visibleTree\.length === 0/)
  assert.match(source, /visibleTree\.map\(/)
})

test('history errors and malformed bodies fail before chart state can see them', async () => {
  for (const status of [403, 404, 422, 429, 503]) {
    await assert.rejects(history.readOhlcvResponse({ ok: false, status,
      json: () => assert.fail('Error body must not be parsed as bars') }), new RegExp(String(status)))
  }
  for (const body of [{ error: 'unavailable' }, [null], [{ ...bar, time: 'invalid' }], [{ ...bar, close: NaN }]]) {
    await assert.rejects(history.readOhlcvResponse({ ok: true, json: async () => body }), /Invalid history/)
  }
  const rows = [bar]
  assert.equal(await history.readOhlcvResponse({ ok: true, json: async () => rows }), rows)
  assert.deepEqual(await history.readOhlcvResponse({ ok: true, json: async () => [] }), [])
})

test('connection badge depends only on WebSocket connectivity, never market-message activity', () => {
  assert.equal(connection.connectionStatus(true), 'CONNECTED')
  assert.equal(connection.connectionStatus(false), 'OFFLINE')
  assert.match(connection.CONNECTION_TITLE, /not MT5 or market-feed health/)
})

const tableMeta = { schema_version: 'apollo-table-v2', paginated: true, revision: 'a'.repeat(64),
  total: 405, fields: ['extra_metric', 'label', 'flag'], page_size: 200 }

test('full-column metadata is explicit and bounded; legacy responses are not reinterpreted', () => {
  assert.equal(paging.tableManifest({ schema_version: 'apollo-display-v1' }), null)
  assert.equal(paging.tableManifest(tableMeta), tableMeta)
  for (const update of [{ revision: 'changed' }, { page_size: 0 }, { total: -1 },
    { fields: ['duplicate', 'duplicate'] }, { fields: ['__proto__'] },
    { fields: Array.from({ length: 4000 }, (_, i) => `field_${i}`) }]) {
    assert.throws(() => paging.tableManifest({ ...tableMeta, ...update }), /Invalid table metadata/)
  }
})

test('page URLs replace options and always pin a single approved revision', () => {
  const url = paging.tablePageUrl('/api/storage/file?path=indicators%2Ffull-table%2Fdata.csv&format=csv&limit=0', tableMeta, 200)
  const parsed = new URL(url, 'http://example.test')
  assert.equal(parsed.pathname, '/api/storage/file')
  assert.equal(parsed.searchParams.get('path'), 'indicators/full-table/data.csv')
  assert.equal(parsed.searchParams.get('format'), 'json')
  assert.deepEqual(parsed.searchParams.getAll('limit'), ['200'])
  assert.deepEqual(parsed.searchParams.getAll('revision'), [tableMeta.revision])
  assert.equal(parsed.searchParams.get('offset'), '200')
})

test('page validation preserves all cells and rejects revision/column/coverage changes', () => {
  const page = { __type: 'columnar_list', paginated: true, revision: tableMeta.revision,
    columns: tableMeta.fields, total: 405, offset: 0, limit: 200,
    rows: [[0, null, false], [1, 'insufficient_bars', true]], next_offset: 2 }
  assert.doesNotThrow(() => paging.validateTablePage(page, tableMeta, 0))
  for (const update of [{ revision: 'b'.repeat(64) }, { columns: ['flag', 'label', 'extra_metric'] },
    { offset: 1 }, { next_offset: 200 }, { rows: [] }, { rows: [[{}, null, false]] },
    { rows: [[1, null, Infinity]] }, { total: 404 }]) {
    assert.throws(() => paging.validateTablePage({ ...page, ...update }, tableMeta, 0), /Invalid or changed table page/)
  }
})

test('empty and final pages have explicit terminal coverage, not fabricated rows', () => {
  const empty = { ...tableMeta, total: 0 }
  const page = { __type: 'columnar_list', paginated: true, revision: empty.revision,
    columns: empty.fields, total: 0, offset: 0, limit: 200, rows: [], next_offset: null }
  assert.doesNotThrow(() => paging.validateTablePage(page, empty, 0))
  assert.doesNotThrow(() => paging.validateTablePage({ ...page, total: 405, offset: 404,
    rows: [[404, 'last', false]] }, tableMeta, 404))
})

test('no-store paging bypasses retained cache entries and shared abort ownership', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ call: ++calls })))
  const { dedupFetch } = loadSource('utils/dedupFetch.ts', { './viewerApi': { viewerFetch: (...args) => fetch(...args) } })
  const url = 'http://fixture.invalid/page'
  assert.deepEqual(await (await dedupFetch(url)).json(), { call: 1 })
  assert.deepEqual(await (await dedupFetch(url)).json(), { call: 1 })
  const responses = await Promise.all([dedupFetch(url, { cache: 'no-store' }), dedupFetch(url, { cache: 'no-store' })])
  assert.deepEqual(await responses[0].json(), { call: 2 })
  assert.deepEqual(await responses[1].json(), { call: 3 })
})

test('continuous loading appends exact short-page boundaries and retains earlier values', () => {
  const page = { __type: 'columnar_list', paginated: true, revision: tableMeta.revision,
    columns: tableMeta.fields, total: 405, offset: 0, limit: 200,
    rows: [[0, null, false], [1, 'missing', true]], next_offset: 2 }
  const first = paging.appendTablePage({ rows: [], bytes: 0 }, page, tableMeta)
  const second = paging.appendTablePage(first, { ...page, offset: 2, rows: [[2, 'next', false]], next_offset: 3 }, tableMeta)
  assert.deepEqual(second.rows, [...page.rows, [2, 'next', false]])
  assert.equal(first.rows.length, 2)
  assert.ok(second.bytes > first.bytes)
  for (const update of [{ offset: 0 }, { revision: 'b'.repeat(64) }, { columns: ['wrong'] }]) {
    assert.throws(() => paging.appendTablePage(first, { ...page, offset: 2, next_offset: 4, ...update }, tableMeta))
    assert.equal(first.rows.length, 2)
  }
})

test('continuous loading bounds retained rows, cells and byte accounting without discarding loaded data', () => {
  const page = { __type: 'columnar_list', paginated: true, revision: tableMeta.revision,
    columns: tableMeta.fields, total: 405, offset: 0, limit: 200,
    rows: [[0, null, false]], next_offset: 1 }
  assert.throws(() => paging.appendTablePage({ rows: [], bytes: 32_000_000 }, page, tableMeta), /safety limit/)
  const rows = Array.from({ length: 25_000 }, () => [0, null, false])
  const meta = { ...tableMeta, total: 30_000 }
  assert.throws(() => paging.appendTablePage({ rows, bytes: 0 }, { ...page, offset: 25_000, total: 30_000, next_offset: 25_001 }, meta), /safety limit/)
  const wide = { ...meta, fields: Array.from({ length: 4000 }, (_, i) => `col_${i}`), page_size: 5 }
  const prior = { rows: Array.from({ length: 500 }, () => []), bytes: 0 }
  assert.throws(() => paging.appendTablePage(prior, { ...page, columns: wide.fields,
    total: wide.total, offset: 500, limit: 5, rows: [Array(4000).fill(null)], next_offset: 501 }, wide), /safety limit/)
  assert.equal(prior.rows.length, 500)
})

test('dataset skeletons announce loading without fake rows, progress banners or motion', () => {
  const jsx = (type, props) => ({ type, props })
  const { default: Skeleton } = loadSource('design-system/components/DatasetSkeleton.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../theme': { theme: { colors: { border: { grid: '#111', strong: '#222' } } } },
  })
  for (const rows of [3, 8]) {
    const tree = Skeleton({ label: 'Loading test dataset', rows })
    assert.equal(tree.props.role, 'status')
    assert.equal(tree.props['aria-label'], 'Loading test dataset')
    assert.equal(tree.props.style.position, 'sticky')
    const placeholders = tree.props.children[1]
    assert.equal(placeholders.props['aria-hidden'], 'true')
    assert.equal(placeholders.props.children.length, rows)
    for (const row of placeholders.props.children) {
      assert.equal(row.props.style.height, 28)
      assert.equal(row.props.children.length, 6)
      assert.ok(row.props.children.every(cell => !cell.props.children && !cell.props.style.animation))
    }
  }
})

/** Invoke the actual chart hook without mounting React or importing any operational API. */
function chartHarness(fetch) {
  const effects = [], writes = []
  const ref = current => ({ current })
  const scale = { fitContent() {}, setVisibleRange() {}, getVisibleLogicalRange: () => null }
  const params = {
    symbol: 'EURUSD', tf: 'H1', broker: 'selected', reloadCounter: 0,
    pendingNavTsRef: ref(null), candleRef: ref({ setData: rows => writes.push(rows), update() {} }),
    chartRef: ref({ timeScale: () => scale, priceScale: () => ({ applyOptions() {} }) }),
    tooltipElRef: ref(null), tfRef: ref('H1'), symbolRef: ref('EURUSD'), brokerRef: ref('selected'),
    barsRef: ref([bar]), loadedFromRef: ref(bar.time), isFetchingMoreRef: ref(false),
    lastLoadAttemptRef: ref(0), trendHLCacheRef: ref(new Map()), bgDirtyRef: ref(false),
  }
  const { useOhlcvData } = loadSource('components/chart/hooks/useOhlcvData.ts', {
    react: { useCallback: fn => fn, useEffect: fn => effects.push(fn), useRef: ref,
      useState: value => [value, () => {}] },
    '../constants': { TF_DEFAULT_DAYS: { H1: 730 }, NAV_TARGET_BARS: { H1: 100 },
      MIN_HISTORY_DATE: '2010-01-01', MIN_HISTORY_TS: 1262304000 },
    '../../../utils/fetchWithMeta': { fetchWithMeta: fetch },
    '../../../utils/readOhlcvResponse': history,
  })
  return { params, effects, writes, hook: useOhlcvData(params) }
}

/** Allow all synchronous promise chains from mocked fetches to settle. */
const settle = () => new Promise(resolve => setImmediate(resolve))

test('heavy viewer reads own admission through the full body while metadata bypasses the queue', async t => {
  const calls = []
  let finish
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url)
    if (url.includes('/market/')) return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('['))
      finish = () => { controller.enqueue(new TextEncoder().encode(']')); controller.close() }
    } }))
    return new Response('[]')
  })
  const { viewerFetch } = loadSource('utils/viewerApi.ts', {
    './ngrokRequestInit': { ngrokRequestInit: (url, api, init) => init },
  })
  const chart = viewerFetch('/api/market/EURUSD?source=market')
  const file = viewerFetch('/api/storage/file?path=example', { cache: 'no-store' })
  await settle()
  assert.deepEqual(calls, ['/api/market/EURUSD?source=market'])
  await viewerFetch('/api/data/brokers')
  assert.equal(calls.length, 2, 'Metadata must not wait on history bodies')
  finish()
  assert.deepEqual(await (await chart).json(), [])
  assert.deepEqual(await (await file).json(), [])
  assert.equal(calls.length, 3)
})

test('queued cancellation rejects promptly without releasing another active heavy read; failures recover', async t => {
  const calls = []
  let release
  t.mock.method(globalThis, 'fetch', url => {
    calls.push(url)
    if (url.includes('active')) return new Promise(resolve => { release = () => resolve(new Response('[]')) })
    if (url.includes('broken')) return Promise.reject(new TypeError('Network failed'))
    return Promise.resolve(new Response('[]'))
  })
  const { viewerFetch } = loadSource('utils/viewerApi.ts', {
    './ngrokRequestInit': { ngrokRequestInit: (url, api, init) => init },
  })
  const active = viewerFetch('/market/active')
  const controller = new AbortController()
  const cancelled = viewerFetch('/storage/file?queued', { signal: controller.signal, cache: 'no-store' })
  const rejected = assert.rejects(cancelled, { name: 'AbortError' })
  const broken = viewerFetch('/market/broken')
  const failed = assert.rejects(broken, /Network failed/)
  const next = viewerFetch('/storage/file?next')
  controller.abort()
  await rejected
  assert.deepEqual(calls, ['/market/active'])
  release()
  await active
  await failed
  assert.deepEqual(await (await next).json(), [])
  assert.deepEqual(calls, ['/market/active', '/market/broken', '/storage/file?next'])
})

test('initial history waits for a selected source rather than issuing an unqualified read', () => {
  const h = chartHarness(() => assert.fail('No source selected'))
  h.params.broker = null
  h.effects[0]()
  assert.equal(h.writes.length, 0)
})

test('an aborted effect request cannot poison the replacement chart or broker load', async () => {
  const requests = []
  const transport = { viewerFetch: (url, init) => new Promise((resolve, reject) => {
    requests.push({ url, signal: init?.signal, resolve })
    const abort = () => reject(new DOMException('Aborted', 'AbortError'))
    if (init?.signal?.aborted) abort()
    else init?.signal?.addEventListener('abort', abort, { once: true })
  }) }
  const { dedupFetch } = loadSource('utils/dedupFetch.ts', { './viewerApi': transport })
  for (const path of ['/api/data/brokers', '/api/market/EURUSD?tf=D1&source=market']) {
    const firstController = new AbortController()
    const first = dedupFetch(path, { signal: firstController.signal })
    const rejected = assert.rejects(first, { name: 'AbortError' })
    firstController.abort()
    // StrictMode re-runs setup before the rejected shared promise's finally executes.
    const nextController = new AbortController()
    const next = dedupFetch(path, { signal: nextController.signal })
    next.catch(() => {}) // Keep a failing regression assertion from leaving an unhandled rejection.
    await rejected
    assert.equal(requests.length, path.includes('/brokers') ? 1 : 2)
    assert.equal(requests.at(-1).signal.aborted, false)
    requests.at(-1).resolve(new Response(JSON.stringify(path.includes('/brokers') ? { brokers: ['market'] } : [bar])))
    assert.ok((await next).ok)
  }
})

test('initial chart effect replay paints candles without changing timeframe', async () => {
  const requests = []
  const { dedupFetch } = loadSource('utils/dedupFetch.ts', {
    './viewerApi': { viewerFetch: (url, init) => new Promise((resolve, reject) => {
      requests.push({ url, resolve })
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }) },
  })
  const h = chartHarness((url, init) => dedupFetch(`/api${url}`, init))
  const firstCleanup = h.effects[0]()
  firstCleanup()
  const cleanup = h.effects[0]()
  try {
    assert.equal(requests.length, 1, 'Effect replay must share transport, not double history admission')
    requests[0].resolve(new Response(JSON.stringify([bar])))
    for (let attempt = 0; attempt < 20 && h.writes.length === 0; attempt++) await settle()
    assert.equal(h.writes.length, 1)
    assert.deepEqual(h.writes[0], [{ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }])
    assert.deepEqual(h.params.barsRef.current, [bar])
  } finally {
    cleanup()
  }
})

test('unowned GETs still share in-flight reads; aborting one owned chart cannot cancel another', async () => {
  const requests = []
  const { dedupFetch } = loadSource('utils/dedupFetch.ts', {
    './viewerApi': { viewerFetch: (url, init) => new Promise((resolve, reject) => {
      requests.push({ url, resolve })
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }) },
  })
  const one = dedupFetch('/api/pairs')
  const two = dedupFetch('/api/pairs')
  assert.equal(requests.length, 1)
  requests[0].resolve(new Response('["EURUSD"]'))
  const results = await Promise.all([one, two])
  assert.notEqual(results[0], results[1])
  assert.deepEqual(await results[0].json(), ['EURUSD'])
  assert.deepEqual(await results[1].json(), ['EURUSD'])
  const controller = new AbortController()
  const cancelled = dedupFetch('/api/market/EURUSD?tf=D1', { signal: controller.signal })
  const rejection = assert.rejects(cancelled, { name: 'AbortError' })
  const survivor = dedupFetch('/api/market/EURUSD?tf=D1', { signal: new AbortController().signal })
  controller.abort()
  assert.equal(requests.length, 2, 'Both charts share the second underlying GET')
  requests[1].resolve(new Response(JSON.stringify([bar])))
  await rejection
  assert.deepEqual(await (await survivor).json(), [bar])
})

test('caller body cancellation stays isolated for both shared and cached responses', async () => {
  let calls = 0
  const { dedupFetch } = loadSource('utils/dedupFetch.ts', {
    './viewerApi': { viewerFetch: async () => { calls++; return new Response(JSON.stringify([bar])) } },
  })
  const controller = new AbortController()
  const one = dedupFetch('/api/market/EURUSD?tf=D1', { signal: controller.signal })
  const two = dedupFetch('/api/market/EURUSD?tf=D1', { signal: new AbortController().signal })
  const [cancelledBody, survivingBody] = await Promise.all([one, two])
  controller.abort()
  await assert.rejects(cancelledBody.json(), { name: 'AbortError' })
  assert.deepEqual(await survivingBody.json(), [bar])
  assert.equal(calls, 1)
  const cachedController = new AbortController()
  const cached = await dedupFetch('/api/market/EURUSD?tf=D1', { signal: cachedController.signal })
  assert.equal(cached.headers.get('x-cache'), 'hit')
  cachedController.abort()
  await assert.rejects(cached.json(), { name: 'AbortError' })
  assert.equal(calls, 1)
  await assert.rejects(dedupFetch('/api/other', { signal: cachedController.signal }), { name: 'AbortError' })
  assert.equal(calls, 1, 'An already-cancelled consumer must not start transport')
})

test('shared reads have a transport deadline even when every original consumer has gone away', async t => {
  let expire
  const requests = []
  t.mock.method(globalThis, 'setTimeout', callback => { expire = callback; return 0 })
  const { dedupFetch } = loadSource('utils/dedupFetch.ts', {
    './viewerApi': { viewerFetch: (url, init) => new Promise((resolve, reject) => {
      requests.push({ resolve })
      init.signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true })
    }) },
  })
  const first = dedupFetch('/api/market/EURUSD?tf=D1')
  const failure = assert.rejects(first, { name: 'AbortError' })
  expire()
  await failure
  const next = dedupFetch('/api/market/EURUSD?tf=D1')
  assert.equal(requests.length, 2, 'Timeout must release the failed in-flight entry')
  requests[1].resolve(new Response(JSON.stringify([bar])))
  assert.deepEqual(await (await next).json(), [bar])
})

test('cancelled initial body reads do not report spurious browser-specific parsing errors', async t => {
  const errors = t.mock.method(console, 'error', () => {})
  let rejectBody
  const h = chartHarness(async () => ({ ok: true, json: () => new Promise((resolve, reject) => { rejectBody = reject }) }))
  const cleanup = h.effects[0]()
  await settle()
  cleanup()
  rejectBody(new TypeError('Failed to read data from the ReadableStream: AbortError'))
  await settle()
  assert.equal(errors.mock.calls.length, 0)
  assert.equal(h.writes.length, 0)
})

test('navigation and lazy-load rejection preserve bars, coverage and loading admission', async t => {
  t.mock.method(console, 'error', () => {})
  for (const status of [403, 422, 429, 503]) {
    const h = chartHarness(async () => ({ ok: false, status }))
    const before = h.params.barsRef.current
    h.hook.navigateToDate(bar.time)
    await settle()
    assert.equal(h.params.barsRef.current, before)
    assert.equal(h.params.loadedFromRef.current, bar.time)
    h.hook.loadOlderChunk()
    await settle()
    assert.equal(h.params.barsRef.current, before)
    assert.equal(h.params.loadedFromRef.current, bar.time)
    assert.equal(h.params.isFetchingMoreRef.current, false)
    assert.equal(h.writes.length, 0)
  }
})

test('empty navigation does not corrupt an existing chart; changed sources reject late results', async () => {
  const empty = chartHarness(async () => ({ ok: true, json: async () => [] }))
  const before = empty.params.barsRef.current
  empty.hook.navigateToDate(bar.time)
  await settle()
  assert.equal(empty.params.barsRef.current, before)
  assert.equal(empty.writes.length, 0)
  let resolve
  const late = chartHarness(() => new Promise(done => { resolve = done }))
  late.hook.navigateToDate(bar.time)
  late.params.brokerRef.current = 'other'
  resolve({ ok: true, json: async () => [bar] })
  await settle()
  assert.equal(late.writes.length, 0)
})

test('initial HTTP rejection never triggers broader fallback; legitimate empty fallback keeps source', async t => {
  t.mock.method(console, 'error', () => {})
  for (const reject of [true, false]) {
    const requests = []
    const h = chartHarness(async url => {
      requests.push(url)
      return requests.length === 1 ? { ok: !reject, status: 429, json: async () => [] }
        : { ok: true, json: async () => [bar] }
    })
    const cleanup = h.effects[0]()
    await settle()
    cleanup()
    assert.equal(requests.length, reject ? 1 : 2)
    assert.ok(requests.every(url => url.includes('source=selected')))
    assert.equal(h.writes.length, reject ? 0 : 1)
  }
})

test('successful navigation and older loads preserve valid values and merge timestamps', async () => {
  const h = chartHarness(async () => ({ ok: true, json: async () => [bar] }))
  h.hook.navigateToDate(bar.time)
  await settle()
  assert.deepEqual(h.params.barsRef.current, [bar])
  assert.equal(h.writes.length, 1)
  const older = { ...bar, time: bar.time - 3600 }
  const lazy = chartHarness(async () => ({ ok: true, json: async () => [older] }))
  lazy.hook.loadOlderChunk()
  await settle()
  assert.deepEqual(lazy.params.barsRef.current, [older, bar])
  assert.equal(lazy.params.loadedFromRef.current, older.time)
})

test('older history never prepends overlapping or newer candles', async () => {
  const older = { ...bar, time: bar.time - 60 }
  const newer = { ...bar, time: bar.time + 60 }
  for (const response of [[older, bar, newer], [bar, newer], [newer]]) {
    const h = chartHarness(async () => ({ ok: true, json: async () => response }))
    const before = h.params.barsRef.current
    h.hook.loadOlderChunk()
    await settle()
    assert.deepEqual(h.params.barsRef.current, response.includes(older) ? [older, bar] : before)
    assert.equal(h.writes.length, response.includes(older) ? 1 : 0)
    assert.equal(h.params.isFetchingMoreRef.current, false)
    assert.equal(h.params.loadedFromRef.current, response.includes(older) ? older.time : -1)
  }
})

test('fallback stays cancellable before headers and throughout response body parsing', async t => {
  t.mock.method(console, 'error', () => {})
  for (const phase of ['headers', 'body']) {
    let count = 0, signal, cancelled = false
    const h = chartHarness(async (url, init) => {
      if (++count === 1) return { ok: true, json: async () => [] }
      signal = init.signal
      const blocked = () => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          cancelled = true
          reject(new DOMException('Aborted', 'AbortError'))
        }, { once: true })
      })
      return phase === 'headers' ? blocked() : { ok: true, json: blocked }
    })
    const cleanup = h.effects[0]()
    await settle()
    assert.equal(count, 2)
    assert.equal(signal.aborted, false)
    cleanup()
    await settle()
    assert.equal(signal.aborted, true)
    assert.equal(cancelled, true)
    assert.equal(h.writes.length, 0)
  }
})
