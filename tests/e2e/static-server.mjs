/**
 * @file Serves only prebuilt static files and the application-owned SPA routes on loopback.
 */
import { createServer } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { resolve, extname } from 'node:path'

const root = resolve('dist')
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.txt': 'text/plain',
}
const server = createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    let file = resolve(root, `.${path === '/' ? '/index.html' : path}`)
    if (!file.startsWith(root + '/') && !file.startsWith(root + '\\'))
      throw new Error('Outside output')
    try {
      if (!statSync(file).isFile()) throw new Error('Missing file')
    } catch {
      if (!/^\/(engine|data|account)(\/[^.]*)?$/.test(path)) throw new Error('Not an app route')
      file = resolve(root, 'index.html')
    }
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(req.method === 'HEAD' ? undefined : readFileSync(file))
  } catch {
    res.writeHead(404).end('Not found')
  }
})
server.listen(5186, '127.0.0.1')
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close())
