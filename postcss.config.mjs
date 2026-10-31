/**
 * @file Applies the existing frontend PostCSS plugins.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
const root = path.dirname(fileURLToPath(import.meta.url))
export default {
  plugins: [
    tailwindcss({
      content: [path.join(root, 'index.html'), path.join(root, 'src/**/*.{js,ts,jsx,tsx}')],
      theme: { extend: {} },
      plugins: [],
    }),
    autoprefixer(),
  ],
}
