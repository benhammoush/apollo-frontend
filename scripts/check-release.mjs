/**
 * @file Checks source/output publication boundaries and aligned application versions.
 */
import assert from 'node:assert/strict'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import ignore from 'ignore'

/** Reject recognizable credentials without printing matched values. Not a legal/provenance audit. */
export function checkText(text, label) {
  // Exact non-routable endpoint-validation fixture, not a credential exemption by path.
  text = text.replaceAll('https://user:pass@visitor.example.test', 'https://visitor.example.test')
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bgh[pousr]_[a-zA-Z0-9]{30,}\b/,
    /\bgithub_pat_[a-zA-Z0-9_]{40,}\b/,
    /\bAKIA[A-Z0-9]{16}\b/,
    /\bAIza[a-zA-Z0-9_-]{30,}\b/,
    /\b(?:password|passwd|api[_-]?key|auth[_-]?token)\s*[:=]\s*["'][^"'\s]{12,}["']/i,
    /https?:\/\/[^/\s"']+:[^/\s"']+@/,
  ]
  assert.ok(
    !patterns.some((pattern) => pattern.test(text)),
    `Possible credential in ${label}; inspect privately`,
  )
}

/** Walk regular files only; linked paths cannot import outside/private material. */
export function regularFiles(root) {
  const stat = lstatSync(root)
  assert.ok(!stat.isSymbolicLink(), `Linked path: ${root}`)
  if (!stat.isDirectory()) {
    assert.ok(stat.isFile(), `Not a regular file: ${root}`)
    return [root]
  }
  return readdirSync(root).flatMap((name) => regularFiles(join(root, name)))
}

/** Reject ignore rules that would omit required files from a clean repository checkout. */
export function assertPublicationInputs(paths, rules) {
  const ignored = ignore().add(rules)
  for (const name of paths) {
    assert.ok(!ignored.ignores(name), `Required publication input is ignored: ${name}`)
  }
}

/** Scan explicit publication inputs, excluding private setup, installed modules and local artifacts. */
export function checkRelease(root = '.', dist = false) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  const version = readFileSync(join(root, 'src/appVersion.ts'), 'utf8').match(
    /APP_PACKAGE_VERSION\s*=\s*['"]([^'"]+)/,
  )?.[1]
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
  assert.equal(pkg.version, lock.version)
  assert.equal(pkg.version, lock.packages[''].version)
  assert.equal(pkg.version, version)
  assert.equal(pkg.private, true, 'Do not accidentally publish an npm package')
  assert.ok(!pkg.scripts.postinstall && !pkg.scripts.prepare, 'No install hooks in the candidate')
  const roots = dist ? ['dist'] : ['src', 'scripts', 'tests', '.github', 'review-assets']
  const files = roots.flatMap((name) => regularFiles(join(root, name)))
  if (!dist)
    for (const name of readdirSync(join(root, 'docs'))) {
      if (name !== 'SETUP.md') files.push(...regularFiles(join(root, 'docs', name)))
    }
  if (!dist)
    for (const name of readdirSync(root)) {
      if (
        /\.(?:json|mjs|html|md)$/.test(name) ||
        ['.gitattributes', '.gitignore', '.nvmrc'].includes(name)
      )
        files.push(join(root, name))
    }
  if (!dist)
    assertPublicationInputs(
      files.map((file) => relative(root, file).replaceAll('\\', '/')),
      readFileSync(join(root, '.gitignore'), 'utf8'),
    )
  for (const file of files) {
    const name = relative(root, file).replaceAll('\\', '/')
    assert.ok(
      !/\.(?:csv|sqlite(?:-\w+)?|db|pem|key|pfx|p12|log|map)$/i.test(name),
      `Private/artifact file in publication inputs: ${name}`,
    )
    assert.ok(
      !/(?:^|\/)(?:\.env(?:\..*)?|SETUP\.md|visitor-policy\.local\.json|source-selection\.draft\.json|candidate-status\.review\.json|public-assets\.review\.json)$/.test(
        name,
      ),
      `Excluded file: ${name}`,
    )
    if (/\.(?:[cm]?js|tsx?|json|html|md|txt|yml|css)$/.test(name))
      checkText(readFileSync(file, 'utf8'), name)
    if (dist)
      assert.ok(
        /^dist\/(?:build-config\.json|index\.html|favicon\.png|notices\.html|third-party-notices\.txt|assets\/[a-zA-Z0-9_.-]+\.(?:js|css))$/.test(
          name,
        ),
        `Unexpected output: ${name}`,
      )
  }
  if (dist)
    for (const name of ['index.html', 'favicon.png', 'notices.html', 'third-party-notices.txt'])
      assert.ok(lstatSync(join(root, 'dist', name)).isFile())
  return files.length
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(
    `Checked ${checkRelease('.', process.argv.includes('--dist'))} publication inputs; private setup excluded. Rights review remains separate.`,
  )
}
