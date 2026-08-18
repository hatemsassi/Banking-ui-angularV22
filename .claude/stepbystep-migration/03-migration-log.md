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

## Hop 14 → 15

- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@15 @angular-devkit/build-angular@15 @angular/compiler-cli@15`
  - `npm install --legacy-peer-deps @angular/core@15 @angular/common@15 @angular/compiler@15 @angular/forms@15 @angular/platform-browser@15 @angular/platform-browser-dynamic@15 @angular/router@15 @angular/animations@15`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=14 --to=15 --allow-dirty`
- Migration schematics run (all reported "no changes made" — no matching
  patterns in this codebase):
  - `relativeLinkResolution` Router config removal migration
  - `RouterLinkWithHref` → `RouterLink` migration
- **A separate schematic run as part of the `@angular/cli` package update
  did make real changes**, and caused a genuine (now-fixed) regression:
  - Removed the `"main": "src/test.ts"` option from the `test` target in
    `angular.json`, and deleted `src/test.ts` — this is Angular's own move
    toward the karma builder auto-discovering spec files instead of a
    hand-written `require.context` entry point.
  - This left two loose ends that the schematic did not finish cleaning up,
    which broke `ng test` (`__webpack_require__(...).context is not a
    function`, then `zone-testing.js is needed... could not be found`):
    1. `tsconfig.spec.json` still listed the now-deleted `src/test.ts` in
       its `"files"` array — removed it.
    2. Nothing loaded `zone.js/testing` anymore (it was previously imported
       inside the deleted `test.ts`) — fixed by adding `"zone.js/testing"`
       to the `test` target's `polyfills` array in `angular.json` (kept
       separate from the app's `src/polyfills.ts`, which is also used by
       the production build, so test-only zone patching doesn't ship to
       prod).
  - Manual fixes: edited `tsconfig.spec.json` and `angular.json` (see diff
    in the commit for this hop).
- Also hit one transient, non-reproducible build error on the first build
  attempt (`Cannot find package '...\typescript\index.js'`, immediately
  after ngcc processing) — a retry succeeded with no changes; treated as a
  one-off ngcc/lockfile race, not a real regression.
- Build (`ng build --configuration production`): **PASSES** after the
  manual fixes above. Bundle sizes essentially unchanged.
- Tests (`ng test --watch=false --browsers=ChromeHeadless`): **14 failed /
  10 passed** — back to the exact v13 baseline, no new failures.
- Committed as a single commit for this hop (package bump + the two manual
  test-config fixes together, since the fixes are required to make the hop
  build/test-clean).

Status: **complete.**

## Hop 15 → 16

- Checked `ng2-datepicker`/`ng2-charts` compatibility before starting (per
  the upgrade plan's flag on this hop): `ng2-datepicker@12.0.0` (latest,
  already installed) declares a loose `@angular/core >= 11.0.0` peer, so it
  keeps installing; it built and ran without any errors on v16, so **no
  replacement needed yet** — deferring further per the "pause and ask
  before replacing" rule, since nothing is actually broken. Re-check at
  each future hop.
- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@16 @angular-devkit/build-angular@16 @angular/compiler-cli@16`
  - `npm install --legacy-peer-deps @angular/core@16 @angular/common@16 @angular/compiler@16 @angular/forms@16 @angular/platform-browser@16 @angular/platform-browser-dynamic@16 @angular/router@16 @angular/animations@16`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=15 --to=16 --allow-dirty`
- Migration schematics run:
  - **`CanActivate` interface deprecation migration — made real changes:**
    removed the deprecated `implements CanActivate` clause and its now-
    unused import from `admin-guard.service.ts` and `token-guard.service.ts`.
    The classes still expose the same `canActivate()` method the Router
    uses structurally, so this is a no-op functionally, just removes a
    deprecated type annotation.
  - `moduleId` deprecation migration: no changes made (not used here).
- Build (`ng build --configuration production`): **PASSES.** `ng2-charts`
  and `ng2-datepicker` are no longer flagged as legacy View Engine libraries
  needing ngcc processing at this version — good sign for their continued
  viability, though still worth re-checking each hop.
- Tests: **14 failed / 10 passed** — exactly the baseline, no regressions.
- Committed as a single commit for this hop.

Status: **complete.**

## Hop 16 → 17

- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@17 @angular-devkit/build-angular@17 @angular/compiler-cli@17`
  - `npm install --legacy-peer-deps @angular/core@17 @angular/common@17 @angular/compiler@17 @angular/forms@17 @angular/platform-browser@17 @angular/platform-browser-dynamic@17 @angular/router@17 @angular/animations@17`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=16 --to=17 --allow-dirty`
- Migration schematics run (all "no changes made" — no matching patterns):
  new `@if/@for/@switch` control-flow syntax migration, `TransferState`
  import-path migration, unused `useJit`/`missingTranslation` compiler
  option removal, two-way binding longform migration.
- **Required manual fix:** Angular 17's compiler requires
  `TypeScript >=5.2.0 <5.5.0`; the project was still on `4.6.4`. Bumped
  `typescript` to `~5.4.5` (`npm install --legacy-peer-deps --save-dev
  typescript@~5.4.5`) — no new type errors surfaced under the stricter
  compiler, `strict`/`strictTemplates` settings already in place from v13.
- Build: **PASSES.** Tests: **14 failed / 10 passed**, exact baseline, no
  regressions.
- Did **not** run the optional `@if/@for` control-flow schematic or switch
  to the new `application` builder yet — both are opportunistic per the
  plan, deferred to the final cleanup pass (hop 21→22) so each hop stays
  focused on the version bump itself.
- Committed as a single commit for this hop.

Status: **complete.**

## Hop 17 → 18

- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@18 @angular-devkit/build-angular@18 @angular/compiler-cli@18`
  - `npm install --legacy-peer-deps @angular/core@18 @angular/common@18 @angular/compiler@18 @angular/forms@18 @angular/platform-browser@18 @angular/platform-browser-dynamic@18 @angular/router@18 @angular/animations@18`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=17 --to=18 --allow-dirty`
- Migration schematics run:
  - **`HttpClientModule` → `provideHttpClient()` migration — made a real
    change, earlier than the upgrade plan anticipated (plan had this
    pencilled in for hop 18→19; Angular's schematic actually ships it at
    18).** `app.module.ts`: removed `HttpClientModule` from `imports`,
    added `provideHttpClient(withInterceptorsFromDi())` to `providers` (kept
    `withInterceptorsFromDi()` since the app uses a class-based
    `HTTP_INTERCEPTORS` provider (`HttpInterceptorService`), not the newer
    functional interceptor style — converting that is optional cleanup, not
    required for this to work). The schematic also reformatted the
    `@NgModule` decorator's property order/line-wrapping cosmetically; left
    as-is since it's not wrong, just differently formatted.
  - Two-way binding longform, `afterRender` phase API, and
    `BootstrapContext`-for-SSR migrations: no changes made (not applicable
    to this codebase).
- Build: **PASSES.** Tests: **14 failed / 10 passed**, exact baseline, no
  regressions.
- Committed as a single commit for this hop.

Status: **complete.**

## Hop 18 → 19

- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@19 @angular-devkit/build-angular@19 @angular/compiler-cli@19`
  - `npm install --legacy-peer-deps @angular/core@19 @angular/common@19 @angular/compiler@19 @angular/forms@19 @angular/platform-browser@19 @angular/platform-browser-dynamic@19 @angular/router@19 @angular/animations@19`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=18 --to=19 --allow-dirty`
- Migration schematics run:
  - **Standalone-flag migration — made real changes across 17 files:** added
    explicit `standalone: false` to every `@Component`/`@Directive`/`@Pipe`
    in the codebase (`login`, `register`, `light-info`, `user-dashboard`,
    `my-transactions`, `main-page`, `my-contact-list`, `new-transaction`,
    `new-contact`, `profile`, `main-admin-page`, `manage-users`,
    `admin-dashboard`, `confirm-register`, `access-deined`, `app.component`,
    `menu`). This is expected and purely mechanical: Angular 19 flips the
    *default* for the `standalone` flag to `true`, so the schematic makes the
    existing NgModule-declared classes explicit about opting out, with no
    behavior change.
  - `ExperimentalPendingTasks` → `PendingTasks` rename, and
    `BootstrapContext` for `main.server.ts`: no changes made (not applicable
    — no SSR entry point in this app).
  - Left the **optional** `APP_INITIALIZER`/`ENVIRONMENT_INITIALIZER` →
    `provideAppInitializer`/`provideEnvironmentInitializer` migration
    un-run — none of those tokens are used in this codebase, so it would be
    a no-op; noted here for completeness.
- **Required manual fix:** Angular 19's compiler requires
  `TypeScript >=5.5.0 <5.9.0`; bumped from `5.4.5` to `~5.8.3`
  (`npm install --legacy-peer-deps --save-dev typescript@~5.8.3`) — no new
  type errors.
- Build (`ng build --configuration production`): **PASSES.** Bundle sizes
  essentially unchanged (main 947.91 kB vs 932.47 kB at v17 — small growth
  from newer Angular runtime code, still well within budget).
- Tests (`ng test --watch=false --browsers=ChromeHeadless`): **14 failed /
  10 passed** — exact baseline, no new failures.
- Committed as a single commit for this hop.

Status: **complete.**
