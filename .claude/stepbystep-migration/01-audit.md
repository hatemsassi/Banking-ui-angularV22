# Audit — Angular 13 → 22 Migration

Date: 2026-08-18
Branch: `angular-upgrade-v21`
Environment: Node v22.23.1, npm 12.0.2 (Node is already new enough for the Angular 22 toolchain).

## 1. Current versions

| Package | Version |
|---|---|
| @angular/core, common, router, forms, animations, platform-browser | ~13.3.0 |
| @angular/cli, @angular-devkit/build-angular | ~13.3.3 |
| rxjs | ~7.5.0 |
| zone.js | ~0.11.4 |
| typescript | ~4.6.2 |

## 2. Project shape

- 3 `NgModule`s, 17 components, **0 standalone components** — this is a classic
  NgModule-based app (`AppModule`, `ApiModule`, and one feature module).
- Build uses the legacy `@angular-devkit/build-angular:browser` /
  `:dev-server` / `:karma` builders (`angular.json`) — will migrate to the
  `application` builder.
- `tsconfig.json` already has `strict: true` and `strictTemplates: true`,
  which is a big head start (fewer template-type-checking surprises on
  upgrade).
- Global scripts/styles are wired in via `angular.json` `scripts`/`styles`
  arrays: `jquery`, `bootstrap` (both CSS and JS bundle — note both
  `bootstrap.min.js` **and** `bootstrap.bundle.min.js` are included, which is
  redundant/duplicated Popper — worth a cleanup note but out of scope for the
  version migration itself).
- Templates use `*ngIf`/`*ngFor` in 10 files — candidates for the `@if/@for`
  control-flow migration schematic (available from Angular 17,
  `ng generate @angular/core:control-flow`).

## 3. Deprecated / notable API usage found

| Pattern | Found in | Migration note |
|---|---|---|
| `HttpClientModule` | `app.module.ts`, `services/api.module.ts` | Deprecated in v19, removed later. Replace with `provideHttpClient(withInterceptorsFromDi())` (or functional interceptors) via `ng update`'s automatic schematic when it lands (v15+ manual until then). |
| `ComponentFactoryResolver` | none found | No action needed. |
| `entryComponents` | none found | No action needed. |
| `standalone: true` | none found | App is 100% NgModule-based; migration to standalone is optional/opportunistic per the prompt's COMMAND section, not mandatory. |
| Class-based `canActivate` guards | `admin-guard.service.ts`, `token-guard.service.ts` | Still supported in v22 but deprecated style; can be converted to functional `CanActivateFn` opportunistically. |
| `@auth0/angular-jwt` (`^5.0.2`) | `login.component.ts`, `admin-guard.service.ts`, `token-guard.service.ts`, `helper.service.ts` | Actively maintained, has releases compatible with modern Angular via peerDependency ranges — verify compatible major at each hop. |

## 4. Third-party dependency risk assessment

| Package | Current | Risk | Notes |
|---|---|---|---|
| `ng2-charts` | ^2.4.2 | **High** | Wraps chart.js v2 API. Needs a jump to `ng2-charts` v4+/v5+ (Angular-version-pinned major releases) together with `chart.js` v4, which has breaking API changes (registerables, tree-shaking). Must be upgraded in lockstep with Angular, not left behind. |
| `chart.js` | 2.9.4 | **High** | Same as above — v2 → v4 has breaking chart-config API changes in `user-dashboard.component.ts`. |
| `ng2-datepicker` | ^12.0.0 | **High** | Unmaintained since the Angular 12 era, no known Angular 13+ compatible release. **Recommend replacement** (native `<input type="date">`, `@angular/material` `MatDatepicker`, or a maintained alternative) — will ask before making this call, per the prompt's COMMAND section. |
| `@auth0/angular-jwt` | ^5.0.2 | Low–Medium | Check for a newer major at each hop; API surface used here (`JwtHelperService`, interceptor) is stable. |
| `bootstrap` / `jquery` / `fontawesome` | 5.2.1 / 3.6.1 / 6.2.0 | Low | Not Angular-coupled; no forced upgrade needed for the Angular version bump itself. |
| `ng-openapi-gen` | ^0.23.0 | Low | Dev-time codegen tool, not a runtime Angular dependency; unaffected by the Angular bump. |

## 5. Testing

- Karma + Jasmine, standard `ng test` setup, no custom karma config beyond
  defaults. Angular's `ng update` schematics handle Karma config version
  bumps automatically at each hop.

## 6. Conclusion

The app is small (17 components, 3 modules) and already strict-mode, which
minimizes template/type-checking breakage risk. The two real risk items are:

1. **`ng2-charts` + `chart.js`** — must be upgraded together with Angular,
   requires manual chart-config changes.
2. **`ng2-datepicker`** — needs a replacement decision before (or during)
   the hop where it stops installing/building.

Everything else is expected to be handled by `ng update`'s automatic
schematics at each major-version hop.
