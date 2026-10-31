/**
 * @file Checks release-tooling formatting without rewriting accepted product source.
 */
import { readFile, readdir } from 'node:fs/promises'
import { check } from 'prettier'
import assert from 'node:assert/strict'

/** Collect handwritten release/config files; product-wide formatting adoption is separate. */
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const result = []
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) result.push(...(await files(path)))
    else result.push(path)
  }
  return result
}

const selected = [
  ...(await files('tests')),
  ...(await files('.github')).filter((file) => /\.(json|yml)$/.test(file)),
  ...(await readdir('.')).filter(
    (file) => /\.(json|mjs)$/.test(file) && file !== 'package-lock.json',
  ),
  'scripts/check-format.mjs',
  'scripts/check-release.mjs',
  'scripts/notices.mjs',
  'scripts/ci-deploy.mjs',
  'scripts/delivery-policy.mjs',
]
for (const file of selected) {
  assert.ok(
    await check(await readFile(file, 'utf8'), {
      filepath: file,
      singleQuote: true,
      semi: false,
      printWidth: 100,
      endOfLine: 'lf',
    }),
    `Format ${file} with Prettier`,
  )
}
