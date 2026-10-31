/**
 * @file Supplies synthetic visitor data and blocks every non-static outbound connection.
 */
import { test as base, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { historyBars } from './history.fixture.mjs'

export { expect }
const config = JSON.parse(readFileSync('.github/ci-cd.json', 'utf8'))
const endpoints = config.buildEnvironment.dev
const revision = 'a'.repeat(64)
const rows = Array.from({ length: 120 }, (_, i) => [
  1704067200 + i * 60,
  'EURUSD',
  `synthetic-${i}`,
  i,
])

/** Intercept all external traffic before application startup, including WebSockets. */
async function visitor({ page, context }, use) {
  const snapshotTime = Date.now()
  const state = {
    requests: [],
    writes: [],
    unexpected: [],
    errors: [],
    sockets: [],
    failFile: false,
    failLater: false,
  }
  page.on('pageerror', (error) => state.errors.push(error.message))
  await context.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === 'http://127.0.0.1:5186') return route.continue()
    if (url.origin !== endpoints.VITE_API_URL) {
      state.unexpected.push(`${url.origin}${url.pathname}`)
      return route.abort()
    }
    state.requests.push(url.pathname + url.search)
    if (request.method() !== 'GET') {
      state.writes.push(request.method())
      return route.fulfill({ status: 405 })
    }
    let json
    let status = 200
    if (url.pathname === '/pairs')
      json = [{ symbol: 'EURUSD', status: 'ready', bid: 1.1, ask: 1.1002 }]
    else if (url.pathname === '/data/brokers') json = { brokers: ['market'] }
    else if (url.pathname === '/market/EURUSD') {
      json = historyBars(url, snapshotTime)
    } else if (url.pathname === '/storage/tree')
      json = {
        tree: [
          {
            id: 'examples',
            name: 'Indicators',
            path: 'Indicators',
            type: 'folder',
            children: [
              {
                id: 'sample',
                name: 'Synthetic.csv',
                path: 'Indicators/Synthetic.csv',
                type: 'file',
              },
            ],
          },
        ],
      }
    else if (url.pathname === '/storage/meta')
      json = {
        schema_version: 'apollo-table-v2',
        revision,
        total: rows.length,
        fields: ['time', 'symbol', 'example', 'value'],
        page_size: 40,
        paginated: true,
      }
    else if (url.pathname === '/storage/file') {
      const offset = Number(url.searchParams.get('offset'))
      if (state.failFile || (state.failLater && offset > 0)) {
        status = 503
        json = { error: 'Fixture unavailable' }
      } else
        json = {
          __type: 'columnar_list',
          paginated: true,
          revision,
          total: rows.length,
          offset,
          limit: 40,
          columns: ['time', 'symbol', 'example', 'value'],
          rows: rows.slice(offset, offset + 40),
          next_offset: offset + 40 < rows.length ? offset + 40 : null,
        }
    } else {
      status = 404
      state.unexpected.push(url.pathname)
      json = { error: 'Unselected fixture route' }
    }
    return route.fulfill({ status, json, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await context.routeWebSocket(/.*/, (socket) => {
    state.sockets.push(socket)
    if (socket.url() !== endpoints.VITE_WS_URL) state.unexpected.push(socket.url())
    socket.onMessage((message) => {
      if (message === 'ping') socket.send(JSON.stringify({ type: 'pong' }))
    })
  })
  await use(state)
  expect(state.writes).toEqual([])
  expect(state.unexpected).toEqual([])
  expect(state.errors).toEqual([])
}

export const test = base.extend({ visitor: [visitor, { auto: true }] })
