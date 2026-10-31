# Frontend verification and delivery

The frontend uses the shared web profile pinned in `.github/ci-cd.json`.
It has no paired backend checkout.

## Local checks

Use Node 24 and npm 11. Install with
`npm ci --ignore-scripts --no-audit --no-fund --include=dev`.
`npm run ci:quality` checks correctness, scoped documentation/formatting, types,
versions, publication boundaries, notices, both dependency audits, tests and the
hosted build. Set `VITE_API_URL` and matching `VITE_WS_URL` from the selected
`.github/ci-cd.json` environment before running it. These are public, not secrets.

`npm run ci:browser` tests the already-built artifact in Chromium, Firefox and
WebKit. Playwright owns an isolated loopback static server and browser contexts;
it never starts MT5, workers or the visitor API. Browser fixtures intercept every
external request/socket. They are not included in deployed output and are not a
runtime fallback or evidence of hosted broker acceptance. Install matching
browsers with `npx --no-install playwright install` when necessary.

Correctness lint and TypeScript cover product source. Documentation and Prettier
adoption cover release tooling/configuration touched in this phase; wholesale
product-source documentation and formatting migration is separate. Existing
viewer-safety tests retain their original code and coverage. Generated notices
are reproducible with `node scripts/notices.mjs`; review the actual licence texts
as well as the automated equality check. Boundary scans detect recognizable
credential forms, not every possible secret or ownership problem.

The development-only `minimatch` override selects the patched matcher while lint
dependencies still request an older major. Lint coverage has a regression check;
remove the override when upstream dependencies select the patched major directly.

## Publication boundary

Publish only reviewed product source, tooling, tests, fixed notice/favicon assets
and public documentation. Never upload private setup guides, local configuration,
credentials, old history, original datasets, `node_modules` or build/test artifacts
as source. Inspect the exact staged files and run an independent secret scan before
the first public push; `.gitignore` and this local scan are not clearance.
First-party portfolio terms are in `LICENSE.md`; incorporated third-party material
retains its own rights. The notices are not an authorship/asset-rights certification.

## Delivery boundary

PRs verify without deployment credentials. Exact-main verification delivers dev;
production is manual/main-only with retained successful same-source dev evidence
and native approval. Shared delivery validates artifacts, serializes mutation,
records source/configuration/provider identities and uploads tested static bytes
without rebuilding. Only trusted-main adapter code runs with provider credentials.
Host-specific setup and recovery procedures are not part of the public source.
Automated smoke checks do not establish owner acceptance or market-data rights.
