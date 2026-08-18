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

## Hop 19 → 20

- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@20 @angular-devkit/build-angular@20 @angular/compiler-cli@20`
  - `npm install --legacy-peer-deps @angular/core@20 @angular/common@20 @angular/compiler@20 @angular/forms@20 @angular/platform-browser@20 @angular/platform-browser-dynamic@20 @angular/router@20 @angular/animations@20`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=19 --to=20 --allow-dirty`
- Migration schematics run (all "no changes made" — no matching patterns):
  `DOCUMENT` import-path move (`@angular/common` → `@angular/core`),
  deprecated `InjectFlags` enum replacement, deprecated `TestBed.get` →
  `TestBed.inject` replacement, `BootstrapContext` for `main.server.ts`.
- Left the two **optional** migrations un-run (control-flow block-syntax
  conversion, `Router.getCurrentNavigation` → `Router.currentNavigation`
  signal) — both are opportunistic per the plan, deferred to the final
  cleanup pass.
- TypeScript already at `~5.8.3`, within Angular 20's required range — no
  bump needed.
- Build (`ng build --configuration production`): **PASSES.** Bundle sizes
  essentially unchanged (main 955.94 kB vs 947.91 kB at v19).
- Tests (`ng test --watch=false --browsers=ChromeHeadless`): **14 failed /
  10 passed** — exact baseline, no new failures.
- Committed as a single commit for this hop.

Status: **complete.**

## Hop 20 → 21

- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@21 @angular-devkit/build-angular@21 @angular/compiler-cli@21`
  - `npm install --legacy-peer-deps @angular/core@21 @angular/common@21 @angular/compiler@21 @angular/forms@21 @angular/platform-browser@21 @angular/platform-browser-dynamic@21 @angular/router@21 @angular/animations@21`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=20 --to=21 --allow-dirty`
- Migration schematics run — **two made real changes:**
  - **Bootstrap-options migration** (`src/main.ts`): the deprecated
    zone-related bootstrap flag was rewritten as
    `platformBrowserDynamic().bootstrapModule(AppModule, {
    applicationProviders: [provideZoneChangeDetection()] })`, importing
    `provideZoneChangeDetection` from `@angular/core`. Zone.js-based change
    detection is kept (no zoneless adoption — out of scope per the original
    prompt unless explicitly requested).
  - **Control-flow syntax migration — no longer optional in this Angular
    version, made changes across 10 template files:** `*ngIf`/`*ngFor`
    rewritten to `@if`/`@for` block syntax (with `track` expressions added
    to every `@for`) in `menu`, `manage-users`, `profile`, `new-contact`,
    `new-transaction`, `my-contact-list`, `my-transactions`,
    `user-dashboard`, `register`, `login`. Spot-checked `login.component.html`
    — migration is structurally correct (nesting preserved, `track msg`
    added to the loop over `errorMessages`).
  - `ApplicationConfig` import-path move, `BootstrapContext` for
    `main.server.ts`, `Router.lastSuccessfulNavigation` signal invocation:
    no changes made (not applicable to this codebase).
  - Left the **optional** `Router.getCurrentNavigation` →
    `Router.currentNavigation` signal migration un-run (opportunistic,
    deferred).
- **Required manual fix #1:** Angular 21's compiler requires
  `TypeScript >=5.9.0 <6.1.0`; bumped from `5.8.3` to `~5.9.0`.
- **Required manual fix #2 (real, non-schematic bug):** after the
  TypeScript bump, the build failed with `TS2307: Cannot find module
  '@angular/common/http'` across every service that injects `HttpClient`.
  Root cause: `@angular/common@21` only exposes its `./http` subpath via
  the modern package.json `"exports"` map (`./fesm2022/http.mjs` +
  `./types/http.d.ts`) — there's no longer a legacy `http/package.json`
  shim directory for it. This project's `tsconfig.json` still had
  `"moduleResolution": "node"` (the old handwritten-in-v13 classic
  resolution mode), which does not read the `"exports"` map at all, so it
  couldn't find the subpath even though the files physically exist.
  Fixed by changing `tsconfig.json`'s `"moduleResolution"` from `"node"` to
  `"bundler"` (Angular's current recommendation, compatible with the
  existing `"module": "es2020"` and the still-webpack-based dev/karma
  builders used at this hop). This is a real, permanent fix, not a
  version-specific workaround — `moduleResolution: "node"` is deprecated
  and this codebase should not have still been on it going into v21.
- Build (`ng build --configuration production`): **PASSES** after both
  manual fixes. Bundle sizes essentially unchanged (main 958.38 kB vs
  955.94 kB at v20).
- Tests (`ng test --watch=false --browsers=ChromeHeadless`): **14 failed /
  10 passed** — exact baseline, no new failures.
- Committed as a single commit for this hop (package bump + schematic
  output + the two manual fixes together, since they're required to make
  the hop build/test-clean).

Status: **complete.**

## Hop 21 → 22

- Commands run:
  - `npm install --legacy-peer-deps --save-dev @angular/cli@22 @angular-devkit/build-angular@22 @angular/compiler-cli@22`
  - `npm install --legacy-peer-deps @angular/core@22 @angular/common@22 @angular/compiler@22 @angular/forms@22 @angular/platform-browser@22 @angular/platform-browser-dynamic@22 @angular/router@22 @angular/animations@22`
  - `./node_modules/.bin/ng update @angular/core --migrate-only --from=21 --to=22 --allow-dirty`
- Migration schematics run — **three made real changes:**
  - **`ChangeDetectionStrategy.Eager` added to all 17 components** — Angular
    22 changes the *default* change-detection strategy; this schematic
    makes every existing component explicit about keeping the old default,
    so behavior is unchanged.
  - **`withXhr()` added to the `provideHttpClient()` call in
    `app.module.ts`** — Angular 22 changed `provideHttpClient()`'s default
    backend; this keeps the pre-v22 XHR-based backend instead of switching
    to `fetch`, again for behavior preservation.
  - **Extended-diagnostics suppression added to `tsconfig.app.json` and
    `tsconfig.spec.json`** (`nullishCoalescingNotNullable` and
    `optionalChainNotNullable` set to `"suppress"`) — keeps pre-v22
    template-checking leniency around `??`/`?.` so existing templates don't
    start erroring under stricter diagnostics.
  - `canMatch` third-argument addition, incremental-hydration opt-out,
    duplicate-outputs fix, safe-navigation wrapping: no changes made (not
    applicable to this codebase).
- **Required manual fix #1:** Angular 22's compiler requires
  `TypeScript >=6.0.0 <6.1.0`; bumped from `5.9.0` to `6.0.2` (tried `6.0.3`
  first — see bug below).
- **Required manual fix #2 (real upstream TypeScript bug, not an Angular
  issue):** with TypeScript 6.0.2 *and* 6.0.3, the build failed with
  `TS2552: Cannot find name 'DateTimeRangeFormatPart'` inside TypeScript's
  own bundled `lib/lib.esnext.intl.d.ts`. Root cause: that lib file uses
  the `DateTimeRangeFormatPart` type, which is actually defined in a
  different bundled lib file (`lib.es2021.intl.d.ts`), and
  `lib.esnext.intl.d.ts` doesn't reference/pull it in — a genuine defect in
  TypeScript's shipped type-declaration files for the entire 6.0.x line
  (confirmed present in both 6.0.2 and 6.0.3, the only two stable 6.0.x
  releases available). `lib.esnext.intl.d.ts` was being loaded transitively
  via `"dom"` in this project's `tsconfig.json` `"lib"` array, even though
  neither `"esnext"` nor `"esnext.intl"` was listed explicitly. Worked
  around by adding `"es2021.intl"` explicitly to `tsconfig.json`'s `"lib"`
  array, which makes the missing type available regardless of load order.
  This is a workaround for an upstream TS bug, not a design choice — worth
  removing if a later TypeScript 6.0.x patch fixes it upstream.
- **Also removed the now-unnecessary deprecated compiler options**
  `baseUrl` (unused — no `"paths"` mapping in this project) and
  `downlevelIteration` (unnecessary at `target: "es2017"`+, which already
  has native iteration support) from `tsconfig.json`, since TypeScript 6.0
  makes both hard-error unless suppressed with `ignoreDeprecations`, and
  removing them outright is cleaner than suppressing.
- Build (`ng build --configuration production`): **PASSES** after all
  fixes above, still on the legacy webpack-based `browser` builder at this
  point. Bundle sizes essentially unchanged from v21.
- Tests (`ng test --watch=false --browsers=ChromeHeadless`): **14 failed /
  10 passed** — exact baseline, no new failures (verified the failing test
  *names* match the same known set, not just the count).
- **Final-pass step (per the original migration prompt's step 4):**
  switched the build to the new esbuild/Vite `application` builder via
  `./node_modules/.bin/ng update @angular/cli --name use-application-builder --allow-dirty`.
  This rewrote `angular.json` (`build`/`serve`/`extract-i18n`/`test`
  targets now use `@angular/build:*` builders instead of
  `@angular-devkit/build-angular:*`), removed the now-obsolete
  `@angular-devkit/build-angular/plugins/karma` require from
  `karma.conf.js`, replaced the `@angular-devkit/build-angular` devDep with
  `@angular/build`, and added `esModuleInterop: true` to `tsconfig.json`.
  Output path changed from `dist/banking-ui` to `dist/banking-ui/browser`
  (new builder convention) — flagged here in case any deployment
  script/CI step referenced the old flat output path.
  - Rebuilt and retested on the new builder: **build passes** (bundle size
    dropped noticeably — main chunk 667.20 kB vs 982.28 kB raw on the old
    webpack builder, thanks to esbuild's tree-shaking/minification being
    more aggressive), **tests: 14 failed / 10 passed**, same exact baseline.
  - Did **not** run the optional `migrate-karma-to-vitest` schematic —
    switching test frameworks wasn't asked for and is out of scope; Karma +
    Jasmine still works fine on the new builder.
  - Did **not** run the two other optional/opportunistic schematics deferred
    from earlier hops (`Router.getCurrentNavigation` →
    `Router.currentNavigation` signal) — no behavior need, left for a future
    cleanup pass if desired.
- Committed as a single commit for this hop (package bump + schematic
  output + manual TS/lib fixes + application-builder migration together).

Status: **complete. This is the final hop — the app is now on Angular 22.**
