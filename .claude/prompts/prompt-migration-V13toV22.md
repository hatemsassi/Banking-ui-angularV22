# ROLE
You are a senior Angular upgrade engineer with deep expertise in incremental
major-version migrations (Angular 13 → 22), the Angular CLI `ng update`
workflow, RxJS 7→7.8 compatibility, standalone components, and the
deprecation/removal history across Angular 14–22 (Ivy-only builds, the
`inject()` function, functional guards/resolvers, control flow syntax
`@if/@for/@switch`, signals, `provideHttpClient`, zoneless change detection,
and esbuild/Vite-based `application` builder).

# CONTEXT
Project: Angular 13.3 banking UI application.
Current key dependencies:
- @angular/* : ~13.3.0 (core, common, router, forms, animations, platform-browser)
- rxjs: ~7.5.0, zone.js: ~0.11.4, typescript: ~4.6.2
- @angular/cli / @angular-devkit/build-angular: ~13.3.3
- @auth0/angular-jwt: ^5.0.2 (JWT auth interceptor)
- bootstrap: ^5.2.1, jquery: ^3.6.1, @fortawesome/fontawesome-free: ^6.2.0
- chart.js: 2.9.4 + ng2-charts: ^2.4.2 (old chart.js v2 API, breaking changes through chart.js v4)
- ng2-datepicker: ^12.0.0 (unmaintained since Angular 12 era — likely needs replacement)
- ng-openapi-gen: ^0.23.0 (codegen from src/app/swagger/swagger.json)
- Testing: Karma + Jasmine (karma ~6.3.0, jasmine-core ~4.0.0)

Target: Angular 22, on the modern esbuild/Vite `application` builder, using
standalone components where practical, with all deprecated APIs removed and
CI (build + unit tests) green at every stage.

Constraints:
- This is a working banking application — correctness and no functional
  regressions matter more than speed.
- Migration must be incremental: one major version at a time (13→14→...→22),
  never skip versions, since `ng update` and Angular's own deprecation
  windows are designed for N→N+1 steps.
- Do the work on the current branch (angular-upgrade-v21) or a new branch per
  step, committing after each successful, tested version bump.

# TASK
Migrate this application from Angular 13 to Angular 22 end-to-end:

1. Audit: read package.json, angular.json, tsconfig*.json, and scan the
   codebase for deprecated/removed API usage (NgModule-heavy structure,
   HttpClientModule, ViewEngine remnants, RxJS deprecated operators,
   TestBed patterns, `entryComponents`, `*ngIf`/`*ngFor` templates,
   `ComponentFactoryResolver`, etc.).
2. Produce a step-by-step upgrade plan, one major version at a time
   (13→14→15→16→17→18→19→20→21→22), noting for each hop: breaking changes
   relevant to this codebase, required code changes, and third-party
   dependency compatibility (ng2-charts/chart.js, ng2-datepicker,
   @auth0/angular-jwt, bootstrap/jquery, ng-openapi-gen).
3. For each version hop:
   a. Run `ng update @angular/core@<N> @angular/cli@<N>` (and
      `@angular/material` if present) and apply the automated schematics.
   b. Fix resulting compile errors and deprecation warnings.
   c. Update or replace incompatible third-party packages (flag ones with
      no maintained Angular-22-compatible successor, e.g. ng2-datepicker,
      and propose a replacement).
   d. Migrate to newer idioms opportunistically but safely: standalone
      components/bootstrapApplication, `inject()`, functional
      guards/interceptors, `@if/@for/@switch` control flow, signals where
      it clearly improves the code — but do not do a giant rewrite in one
      pass if it risks regressions; prefer schematics-driven automatic
      migrations first.
   e. Run `ng build` and the full test suite (`ng test`); fix failures.
   f. Commit with a message identifying the version reached.
4. At the end, switch the build to the new esbuild/Vite `application`
   builder if not already migrated automatically, and clean up any
   leftover deprecated config in angular.json.
5. Final pass: remove dead deprecation-shims, delete unused
   polyfills/zone.js config if the app goes zoneless-ready (only if
   explicitly requested — otherwise keep zone.js), and update README/
   engines fields.

# COMMAND
- Work version-by-version; do not attempt to jump straight to Angular 22.
- After each hop, show me: the exact `ng update` command run, a summary of
  files changed, any manual fixes applied, and the build/test result.
- Pause and ask before replacing a third-party library (e.g. ng2-datepicker,
  ng2-charts) with an alternative — propose options with trade-offs first.
- Do not silently delete failing tests to make CI pass — fix or flag them.
- Keep commits small and reversible; one commit per version hop minimum.
- If a hop has no automated schematic for a breaking change, explain the
  change and the manual fix before applying it.

# OUTPUT
1. An upgrade plan (table: version hop → breaking changes affecting this
   repo → action items → risk level).
2. The actual code changes, applied incrementally and committed per version.
3. A final migration report summarizing: versions traversed, packages
   replaced/removed, manual interventions required, remaining
   deprecations/TODOs, and a verification checklist (build passes, tests
   pass, app runs, key user flows manually smoke-tested).
4. Add steps 1, 2, and 3 to one or more in the folder stepbystep-migration/*.md