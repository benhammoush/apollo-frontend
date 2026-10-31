/** Local artifact build only; this script never uploads or activates anything. */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.env.APOLLO_PUBLIC_TARGET = 'hosted'
await build({ root, configFile: path.join(root, 'vite.config.mjs'), mode: 'public' })
