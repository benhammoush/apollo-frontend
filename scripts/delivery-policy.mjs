/**
 * @file Validates isolated Vercel targets before handing off to pinned shared delivery.
 */
import assert from 'node:assert/strict'
import { publicEndpoints } from '../public-hosting.mjs'

/** Fail before provider access on source, target, environment or public-input mismatch. */
export function deliverySettings(env, config, hosting, build) {
  assert.equal(env.GITHUB_REPOSITORY, 'benhammoush/apollo-frontend')
  assert.equal(env.GITHUB_REF, 'refs/heads/main')
  assert.match(env.CI_SOURCE_SHA ?? '', /^[a-f0-9]{40}$/)
  assert.ok(['dev', 'production'].includes(env.CI_ENVIRONMENT))
  assert.ok(['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME))
  if (env.CI_ENVIRONMENT === 'production') {
    assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch')
    assert.equal(env.GITHUB_RUN_ATTEMPT, '1')
  }
  for (const name of ['DEV_PROJECT_ID', 'PRODUCTION_PROJECT_ID'])
    assert.match(env[name] ?? '', /^prj_[a-zA-Z0-9]+$/)
  assert.notEqual(env.DEV_PROJECT_ID, env.PRODUCTION_PROJECT_ID)
  assert.equal(
    env.VERCEL_PROJECT_ID,
    env.CI_ENVIRONMENT === 'dev' ? env.DEV_PROJECT_ID : env.PRODUCTION_PROJECT_ID,
  )
  const origin = new URL(env.TARGET_ORIGIN)
  assert.equal(origin.protocol, 'https:')
  assert.equal(origin.origin, env.TARGET_ORIGIN)
  assert.ok(!origin.username && !origin.password && !origin.port)
  const buildEnvironment = config.buildEnvironment[env.CI_ENVIRONMENT]
  assert.deepEqual(Object.keys(buildEnvironment).sort(), ['VITE_API_URL', 'VITE_WS_URL'])
  publicEndpoints({ ...buildEnvironment, APOLLO_PUBLIC_TARGET: 'hosted' })
  const endpoints = publicEndpoints({ ...buildEnvironment, APOLLO_PUBLIC_TARGET: 'hosted' })
  assert.deepEqual(
    build,
    { api: endpoints.api, ws: endpoints.ws },
    'Built public configuration drifted',
  )
  return {
    name: env.CI_ENVIRONMENT === 'dev' ? 'apollo-frontend-dev' : 'apollo-frontend',
    origin: origin.origin,
    buildEnvironment,
    hosting: { version: 3, routes: hosting.routes },
  }
}
