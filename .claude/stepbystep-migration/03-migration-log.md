# Migration Log — Angular 13 → 22

## Pre-flight

- `node_modules` was found out of sync with `package.json`/`package-lock.json`
  (had Angular 21.2.20 installed despite the manifests declaring `~13.3.0`),
  which broke `ng update`'s dependency resolution. This was almost certainly
  leftover from an earlier, uncommitted attempt at this same migration on
  this branch (`angular-upgrade-v21`). Reinstalled clean from the committed
  v13 lockfile (`npm ci --legacy-peer-deps`) to get a known-good baseline.
  `--legacy-peer-deps` is required because `ng2-charts@2.4.3` declares a
  peer on `rxjs@^6.3.3` while the project uses `rxjs@~7.5.0` — this is a
  pre-existing conflict on v13, not something introduced by the migration.

- **Baseline build (v13, production config): PASSES.**
  `main` bundle 927.81 kB / styles 280.29 kB — within budget.

- **Baseline unit tests (v13, `ng test --watch=false --browsers=ChromeHeadless`):
  10 passed / 14 FAILED out of 24 specs**, already broken on Angular 13
  before any migration work. Root causes seen in the output: missing test
  providers (`NullInjectorError: No provider for Router!`, `HttpClient`),
  and `NG0304: 'app-menu'/'router-outlet' is not a known element` (host
  component under test doesn't declare `RouterTestingModule`/imports it
  needs). **These failures pre-exist the migration and are treated as the
  baseline** — per the migration prompt's COMMAND rules, they are flagged
  here rather than silently patched or deleted. The gate for each hop going
  forward is "no *new* failures beyond this same set of 14", not "24/24
  green", unless/until a separate test-fixing pass is requested.

## Hop 13 → 14

- **Environment note:** `npx ng update`'s temporary-CLI install step failed
  under this environment's npm config (`--allow-scripts is not allowed in
  project-scoped installs`), which is a deliberate sandbox guardrail on
  install-script execution — not something to bypass by loosening the global
  npm config. Worked around it by installing the target `@angular/*` and
  `@angular/cli`/`@angular-devkit/build-angular`/`@angular/compiler-cli`
  packages directly via `npm install --legacy-peer-deps`, then running
  `./node_modules/.bin/ng update @angular/core --migrate-only --from=13
  --to=14 --allow-dirty` (using the local CLI binary directly, not `npx`,
  since `npx ng` kept trying to compare against the npm-registry-latest CLI
  version and re-trigger the same blocked temporary install). Same approach
  will be used for every subsequent hop.
- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@14 @angular-devkit/build-angular@14 @angular/compiler-cli@14`
  - `npm install --legacy-peer-deps @angular/core@14 @angular/common@14 @angular/compiler@14 @angular/forms@14 @angular/platform-browser@14 @angular/platform-browser-dynamic@14 @angular/router@14 @angular/animations@14`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=13 --to=14 --allow-dirty`
- Migration schematics run (all reported "no changes made" — codebase had no
  matching legacy patterns):
  - `entryComponents` removal migration
  - `Routes`/`Route` strict `pathMatch` typing migration
  - Typed `Forms` model opt-out migration
- Files changed: `package.json`, `package-lock.json` only — no `src/`
  changes required for this hop.
- TypeScript resolved to `4.6.4` automatically (within v14's required
  `>=4.6.2 <4.9` range) — no manual bump needed.
- Build (`ng build --configuration production`): **PASSES.** Bundle sizes
  essentially unchanged (main 929.69 kB vs 927.81 kB baseline).
- Tests (`ng test --watch=false --browsers=ChromeHeadless`): **12 failed / 12
  passed** (vs. 14 failed / 10 passed baseline on v13) — no new failures,
  in fact two pre-existing failures now pass incidentally. No regressions.
- Committed as a single commit for this hop.

Status: **complete.**
