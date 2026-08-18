# Upgrade Plan — Angular 13 → 22

Based on the audit in `01-audit.md`. Each hop is applied with
`ng update @angular/core@N @angular/cli@N`, built, tested, and committed
before moving to the next hop, per the migration prompt's COMMAND rules.

| Hop | Breaking changes affecting this repo | Action items | Risk |
|---|---|---|---|
| 13 → 14 | Typed forms introduced (opt-in, non-breaking here); strict template checking already on. `@angular/cli` analytics prompt change. | Run `ng update`, rebuild, retest. | Low |
| 14 → 15 | Standalone APIs stabilize (optional adoption); `providedIn: 'platform'` removed (not used here); MDC-based Angular Material (not used here). Directive composition API added. | Run `ng update`, rebuild, retest. Bump `ng2-charts`/`chart.js` if a compatible major exists for v15. | Low–Medium |
| 15 → 16 | Required `inject()` context changes; `ɵdefineInjectable` internals; Router `withComponentInputBinding` available; **first hop where `ng2-datepicker` compatibility must be re-checked** — likely broken. | Run `ng update`. Decide/execute `ng2-datepicker` replacement (pause for approval per COMMAND). Bump `ng2-charts`/`chart.js` in lockstep if not already done. | **High** |
| 16 → 17 | New `@if/@for/@switch` control-flow syntax available; new `application` builder (esbuild/Vite) introduced as opt-in; View Engine fully gone (already Ivy). | Run `ng update`. Optionally run `ng generate @angular/core:control-flow` on the 10 templates using `*ngIf`/`*ngFor`. Do not force-switch builder yet. | Medium |
| 17 → 18 | Zoneless change detection (experimental, opt-in — not adopted here); Material 3 defaults (N/A). | Run `ng update`, rebuild, retest. | Low |
| 18 → 19 | `provideHttpClient` becomes the recommended pattern over `HttpClientModule` (still supported); route-level render mode APIs (SSR, N/A — this is a CSR banking app). | Run `ng update`. Migrate `HttpClientModule` → `provideHttpClient(withInterceptorsFromDi())` in `app.module.ts`/`api.module.ts`. | Medium |
| 19 → 20 | Node version floor raises (verify against installed v22.23.1 — OK); further stabilization of signals APIs. | Run `ng update`, rebuild, retest. | Low |
| 20 → 21 | Continue toward the `application` builder as default for new projects; verify `angular.json` builder config still valid. | Run `ng update`, rebuild, retest. **This matches the existing branch name `angular-upgrade-v21` — treat as a checkpoint.** | Low–Medium |
| 21 → 22 | Latest stabilizations/deprecation removals as of Angular 22. | Run `ng update`, rebuild, retest. Switch `angular.json` to the `application` builder if not already migrated automatically. Final cleanup pass (dead deprecation shims, README/engines). | Medium |

## Cross-cutting items (not tied to one hop, tracked throughout)

- **`ng2-charts` / `chart.js`**: track compatible majors at each hop;
  convert `user-dashboard.component.ts` chart config from chart.js v2 to v4
  API when the jump happens (single concentrated change, not spread across
  hops, to keep it testable).
- **`ng2-datepicker`**: flagged High risk at hop 15→16; will propose
  replacement options before touching it.
- **Guards** (`admin-guard.service.ts`, `token-guard.service.ts`): optional
  opportunistic conversion to functional `CanActivateFn`, done once near the
  end (hop 21→22 cleanup pass) rather than disrupting earlier hops.
- **Control flow syntax** (`@if`/`@for`): optional opportunistic migration
  once available at 17+, applied via official schematic in one pass.

## Execution log

Progress and per-hop results are recorded in `03-migration-log.md` as each
hop completes.
