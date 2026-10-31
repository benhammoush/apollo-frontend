/**
 * @file Builds only the visitor frontend and explicitly selected public assets.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { publicAssets } from './public-assets.mjs'
import { publicEndpoints } from './public-hosting.mjs'
const root = path.dirname(fileURLToPath(import.meta.url))
const denied = [
  'src/components/modals/TriggerBtConfigModal.tsx',
  'src/components/modals/NblConfigModal.tsx',
  'src/components/modals/InfoModal.tsx',
  'src/types/agents.ts',
  'src/types/trading.ts',
  'src/contexts/SystemStatusContext.tsx',
  'src/utils/api.ts',
  'src/components/ActivityTracker.tsx',
  'src/types/privateConfigTimeframes.ts',
]
export default defineConfig(({ mode }) => {
  if (mode !== 'public') throw new Error('Private source-review candidate requires public mode')
  const endpoints = publicEndpoints()
  return {
    root,
    publicDir: false,
    envDir: path.join(root, 'empty-env'),
    envPrefix: [],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(endpoints.api),
      'import.meta.env.VITE_WS_URL': JSON.stringify(endpoints.ws),
      'import.meta.env.VITE_WS_FALLBACK_PORT': JSON.stringify(''),
    },
    server: {
      host: '127.0.0.1',
      port: 5175,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:8001' },
        '/ws': { target: 'ws://127.0.0.1:8001', ws: true },
      },
    },
    resolve: { alias: { '@': path.join(root, 'src') } },
    plugins: [
      react(),
      publicAssets(root, { required: endpoints.hosted }),
      {
        name: 'apollo-absent-private-source-guard',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'build-config.json',
            source: JSON.stringify({ api: endpoints.api, ws: endpoints.ws }),
          })
          for (const id of this.getModuleIds()) {
            const file = id.split('?')[0].replaceAll('\\', '/')
            if (!path.isAbsolute(file) || file.includes('/node_modules/')) continue
            const relative = path.relative(root, file).replaceAll('\\', '/')
            if (
              relative === '..' ||
              relative.startsWith('../') ||
              path.isAbsolute(relative) ||
              denied.some((item) => item.toLowerCase() === relative.toLowerCase())
            )
              this.error('Non-candidate or private source entered the public build')
          }
        },
      },
    ],
  }
})
