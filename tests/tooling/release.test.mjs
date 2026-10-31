/**
 * @file Guards release policy, credential diagnostics, shared references and documentation lint.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync, mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import { parse } from 'yaml'
import { deliverySettings } from '../../scripts/delivery-policy.mjs'
import { assertPublicationInputs, checkText, regularFiles } from '../../scripts/check-release.mjs'

const config = JSON.parse(readFileSync('.github/ci-cd.json', 'utf8'))
const hosting = JSON.parse(readFileSync('vercel.json', 'utf8'))
const build = {
  api: config.buildEnvironment.dev.VITE_API_URL,
  ws: config.buildEnvironment.dev.VITE_WS_URL,
}
const env = {
  GITHUB_REPOSITORY: 'benhammoush/apollo-frontend',
  GITHUB_REF: 'refs/heads/main',
  CI_SOURCE_SHA: 'a'.repeat(40),
  CI_ENVIRONMENT: 'dev',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_RUN_ATTEMPT: '1',
  DEV_PROJECT_ID: 'prj_dev',
  PRODUCTION_PROJECT_ID: 'prj_prod',
  VERCEL_PROJECT_ID: 'prj_dev',
  TARGET_ORIGIN: 'https://apollo-frontend-dev.vercel.app',
  ...config.buildEnvironment.dev,
}

test('isolated delivery targets and exact declared build inputs fail closed', () => {
  assert.equal(deliverySettings(env, config, hosting, build).name, 'apollo-frontend-dev')
  assert.deepEqual(deliverySettings(env, config, hosting, build).hosting, {
    version: 3,
    routes: hosting.routes,
  })
  for (const override of [
    { GITHUB_REPOSITORY: 'other/repo' },
    { GITHUB_REF: 'refs/pull/1/merge' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { CI_SOURCE_SHA: 'main' },
    { CI_ENVIRONMENT: 'preview' },
    { DEV_PROJECT_ID: 'prj_prod' },
    { VERCEL_PROJECT_ID: 'prj_prod' },
    { TARGET_ORIGIN: 'http://example.test' },
    { TARGET_ORIGIN: 'https://example.test/path' },
    { CI_ENVIRONMENT: 'production' },
  ])
    assert.throws(() => deliverySettings({ ...env, ...override }, config, hosting, build))
  assert.throws(() =>
    deliverySettings(env, config, hosting, { ...build, api: 'https://other.test' }),
  )
  assert.throws(() => deliverySettings(env, config, hosting, undefined))
  const production = {
    ...env,
    CI_ENVIRONMENT: 'production',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    VERCEL_PROJECT_ID: 'prj_prod',
    TARGET_ORIGIN: 'https://apollo-frontend.vercel.app',
  }
  assert.equal(deliverySettings(production, config, hosting, build).name, 'apollo-frontend')
  assert.throws(() =>
    deliverySettings({ ...production, GITHUB_RUN_ATTEMPT: '2' }, config, hosting, build),
  )
})

test('credential scans reject known forms without including matched values in diagnostics', () => {
  const secret = ['ghp', '_', 'x'.repeat(36)].join('')
  assert.throws(
    () => checkText(secret, 'sample.ts'),
    (error) => !error.message.includes(secret) && error.message.includes('sample.ts'),
  )
  assert.throws(() => checkText(['-----BEGIN ', 'PRIVATE KEY-----'].join(''), 'key.txt'))
  checkText('https://visitor.example.test', 'public-config')
})

test('publication walkers reject links instead of following private paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'apollo-boundary-'))
  try {
    writeFileSync(join(root, 'public.txt'), 'public')
    symlinkSync(root, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
    assert.throws(() => regularFiles(root), /Linked path/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('publication ignores keep the synthetic log module while excluding local data and setup', () => {
  const rules = readFileSync('.gitignore', 'utf8')
  assertPublicationInputs(
    ['src/data/exampleJobLogs.ts', '.github/ci-cd.json', 'package-lock.json'],
    rules,
  )
  for (const file of ['data/private.json', 'docs/SETUP.md', '.env', 'dist/index.html']) {
    assert.throws(
      () => assertPublicationInputs([file], rules),
      /Required publication input is ignored/,
    )
  }
  assert.throws(
    () => assertPublicationInputs(['src/data/exampleJobLogs.ts'], 'data/'),
    /Required publication input is ignored/,
  )
  assert.throws(
    () => assertPublicationInputs(['src/data/exampleJobLogs.ts'], '/src/data/'),
    /Required publication input is ignored/,
  )
  assertPublicationInputs(['src/data/exampleJobLogs.ts'], '/data/')
})

test('generated notices keep license wording without trailing whitespace', () => {
  const attributes = readFileSync('.gitattributes', 'utf8').split(/\r?\n/)
  assert.ok(attributes.includes('* text=auto eol=lf'))
  assert.ok(attributes.includes('*.png -text'))
  for (const name of ['notices.html', 'third-party-notices.txt']) {
    const text = readFileSync(`review-assets/${name}`, 'utf8')
    assert.doesNotMatch(text, /[\t ]+\r?$/m)
    assert.ok(text.includes('Permission is hereby granted, free of charge,'))
    assert.ok(text.includes('THE SOFTWARE IS PROVIDED'))
  }
})

test('visitor source omits unavailable private workflows and legacy pane settings', () => {
  for (const name of ['ScoreModal', 'DivergenceAnalysisModal']) {
    assert.equal(existsSync(`src/components/modals/${name}.tsx`), false)
    assert.ok(!readFileSync('src/components/DatasetsTab.tsx', 'utf8').includes(`./modals/${name}`))
  }
  assert.match(
    readFileSync('src/components/chart/constants.ts', 'utf8'),
    /BB_TF_CONFIG[^=]*=\s*\{\s*\}/,
  )
  const publicGuide = readFileSync('docs/release-preparation.md', 'utf8')
  assert.doesNotMatch(publicGuide, /IC Markets|ngrok|SMOKE_BYPASS|SETUP\.md|apollo-frontend-dev/)
})

test('all callers pin one published shared revision and retain safe triggers', () => {
  assert.equal(config.automationSha, '43018f3d7ec3605d14379be6f1f5de287ad6a1f1')
  assert.equal(config.profile, 'web')
  assert.equal(config.integration, false)
  assert.equal(config.lockScope, 'all')
  const workflows = {}
  for (const name of [
    'verify-pr',
    'verify-and-deploy-dev',
    'verify-and-deploy-prod',
    'weekly-vuln-audit',
  ]) {
    const text = readFileSync(`.github/workflows/${name}.yml`, 'utf8')
    const workflow = parse(text, { uniqueKeys: true, maxAliasCount: 0 })
    workflows[name] = workflow
    for (const job of Object.values(workflow.jobs))
      if (job.uses) {
        assert.ok(job.uses.endsWith(`@${config.automationSha}`))
        if (name !== 'weekly-vuln-audit')
          assert.equal(job.with.automation_sha, config.automationSha)
        assert.equal(job.with.node_version, config.nodeVersion)
      }
  }
  const pr = workflows['verify-pr']
  assert.deepEqual(Object.keys(pr.on), ['pull_request'])
  assert.ok(!JSON.stringify(pr).includes('secrets'))
  assert.equal(pr.jobs.verify_result.name, 'Verify')
  assert.equal(pr.jobs.verify_result.if, 'always()')
  assert.equal(pr.jobs.verify_result.needs, 'verify')
  const dev = workflows['verify-and-deploy-dev']
  assert.deepEqual(dev.on.push.branches, ['main'])
  assert.equal(dev.jobs.deploy_dev.needs, 'verify')
  const prod = workflows['verify-and-deploy-prod']
  assert.deepEqual(Object.keys(prod.on), ['workflow_dispatch'])
  assert.equal(prod.jobs.deploy_production.needs, 'verify_release')
})

test('documentation lint rejects missing module/function docs and invalid parameter names', async () => {
  const lint = new ESLint()
  const [bad] = await lint.lintText('export function helper(value) { return value }', {
    filePath: 'scripts/check-probe.mjs',
  })
  assert.ok(bad.messages.some((message) => message.ruleId === 'jsdoc/require-jsdoc'))
  assert.ok(bad.messages.some((message) => message.ruleId === 'jsdoc/require-file-overview'))
  const [mismatch] = await lint.lintText(
    '/** @file Fixture module. */\n/** Return the value.\n * @param other - Input.\n */\nexport function helper(value) { return value }',
    { filePath: 'scripts/check-probe.mjs' },
  )
  assert.ok(mismatch.messages.some((message) => message.ruleId === 'jsdoc/check-param-names'))
  const [good] = await lint.lintText(
    '/** @file Fixture module. */\n/** Return the input.\n * @param value - Selected input.\n */\nexport function helper(value) { return value }',
    { filePath: 'scripts/check-probe.mjs' },
  )
  assert.deepEqual(good.messages, [])
})

test('lint glob coverage survives the patched minimatch override', async () => {
  // shortcut: override the lint dependency until upstream accepts the patched major.
  const lint = new ESLint()
  for (const file of [
    'src/App.tsx',
    'src/data/exampleJobLogs.ts',
    'src/components/chart/hooks/useChartCanvas.ts',
    'tests/tooling/release.test.mjs',
    'scripts/check-release.mjs',
  ]) {
    assert.equal(await lint.isPathIgnored(file), false, file)
    const config = await lint.calculateConfigForFile(file)
    assert.equal(config.rules['no-unreachable'][0], 2, file)
    if (file.startsWith('scripts/check-') || file.startsWith('tests/')) {
      assert.equal(config.rules['jsdoc/require-jsdoc'][0], 2, file)
    }
  }
  for (const file of ['dist/example.js', 'node_modules/example.js', 'test-results/example.js']) {
    assert.equal(await lint.isPathIgnored(file), true, file)
  }
})
