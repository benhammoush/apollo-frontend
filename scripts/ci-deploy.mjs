/**
 * @file Trusted-main adapter for verified static output; no builds, provisioning or retries.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { deliverySettings } from './delivery-policy.mjs'

const env = process.env
assert.equal(env.GITHUB_ACTIONS, 'true', 'Delivery is CI-only')
assert.ok(env.CI_CONTROL_ROOT && env.CI_AUTOMATION_ROOT, 'Trusted checkouts required')
const config = JSON.parse(readFileSync(resolve(env.CI_CONTROL_ROOT, '.github/ci-cd.json'), 'utf8'))
const hosting = JSON.parse(readFileSync(resolve(env.CI_CONTROL_ROOT, 'vercel.json'), 'utf8'))
const build = JSON.parse(readFileSync('dist/build-config.json', 'utf8'))
const settings = deliverySettings(env, config, hosting, build)
const { publishWeb } = await import(
  pathToFileURL(resolve(env.CI_AUTOMATION_ROOT, 'scripts/providers.mjs')).href
)
await publishWeb(env, settings)
