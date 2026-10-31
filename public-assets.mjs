/**
 * @file Includes only the favicon and notices in frontend build output.
 */
import fs from 'node:fs'
import path from 'node:path'

export const PUBLIC_ASSETS = Object.freeze([
  'favicon.png',
  'notices.html',
  'third-party-notices.txt',
])
/**
 * Loads the fixed asset set without copying other files from the asset directory.
 * @param {string} root - Frontend root directory.
 * @param {{ required?: boolean }} options - Whether an absent asset directory is an error.
 * @returns {object} Vite asset plugin.
 */
export function publicAssets(root, { required = false } = {}) {
  return {
    name: 'apollo-explicit-public-assets',
    /** Emits the complete asset set; rejects missing, linked or oversized files. */
    generateBundle() {
      const assets = path.join(root, 'review-assets')
      if (!fs.existsSync(assets)) {
        if (required)
          throw new Error('Hosted build requires the selected favicon and notice assets')
        return
      }
      const selected = PUBLIC_ASSETS.map((fileName) => {
        const file = path.join(assets, fileName)
        for (let part = file; ; part = path.dirname(part)) {
          if (fs.lstatSync(part).isSymbolicLink()) throw new Error('Linked asset path')
          if (path.dirname(part) === part) break
        }
        if (!fs.statSync(file).isFile() || fs.statSync(file).size > 2_000_000)
          throw new Error('Invalid asset size/type')
        return { type: 'asset', fileName, source: fs.readFileSync(file) }
      })
      for (const asset of selected) this.emitFile(asset)
    },
  }
}
