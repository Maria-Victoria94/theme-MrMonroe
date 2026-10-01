<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->
<!-- name: modules-checkout-link-wc -->

# checkout-link-wc

## Purpose

Web-component variant of the Juo checkout link. Defines `<juo-checkout-link>` (light DOM, custom element) that renders a local-payment checkout button for carts containing Juo subscription items. On click, swaps each line item's selling plan for the upstream-provider-compatible plan via `/cart/clear` + `/cart/add.js`, then navigates to `/checkout?skip_shop_pay=true`. On bfcache restore it reverts the swap.

**Preferred default** for new installs. Pick one of the three `checkout-link*` modules — never run more than one.

A full operator-facing API/recipe guide lives in `README.md` in this directory. **Read that before changing public behavior.**

## Key Files

| File                                         | Description                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `index.ts`                                   | Entry. Imports SCSS, registers the `hide-controller` listener, and registers the `<juo-checkout-link>` custom element exactly once.                                                                                                                                                                                                                                   |
| `hide-controller.ts`                         | Document-level listener for `juo:checkout:ready`. Reads the button's `data-hide-when-active` selector list and toggles `.juo-hidden-by-checkout` on matching elements anywhere on the page (hide while a fixed plan is in the cart). Opt-in: no attribute → no-op.                                                                                                    |
| `checkout-link-wc.ts`                        | `JuoCheckoutLink` class. Owns the DOM, the `data-state` machine (`idle` → `loading` → `ready` → `processing` → `success`/`error`), ghost-variant `MutationObserver`, and provider-logo SVGs.                                                                                                                                                                          |
| `cart-service.ts`                            | Singleton `CartService` (acquired via `acquireCartService` / released via `releaseCartService`). Wraps `CartWatcher`, deduplicates `fetchSellingPlansMap()` calls, owns `swapCartForCheckout` and `revertCart`, installs one `pageshow` listener for bfcache revert, and resolves the `fetchFn` (window.fetch or `nativeFetch()`) used for the cart-write calls only. |
| `nativeFetch.ts`                             | Returns a pristine `fetch` bound to a hidden same-origin iframe, bypassing themes/apps that monkey-patch `window.fetch`. Lazy + cached; iframe stays attached for the page lifetime. Used by `CartService` only when the `native-fetch` attribute is set.                                                                                                             |
| `cartWatcher.ts`                             | Same shape as the sibling modules — PerformanceObserver on `/cart/*` resource entries → diffs `localStorage["juo-cart"]` → dispatches `cart_changed` on `window`. Cart reads (`/cart.js`) use the global `fetch`.                                                                                                                                                     |
| `checkout-link-wc.scss`                      | Styling. Exposes CSS custom props `--juo-cl-color-*`, `--juo-cl-border-radius`, `--juo-cl-height`. Selectors target the light-DOM `.juo-cl-button` class.                                                                                                                                                                                                             |
| `types.ts`                                   | Shopify cart, line-item, and selling-plan typings. Adds `Window.Shopify.routes` augmentation.                                                                                                                                                                                                                                                                         |
| `README.md`                                  | Operator/AI-agent integration guide. Treat as the public contract.                                                                                                                                                                                                                                                                                                    |
| `theme/snippets/juo-checkout-link-wc.liquid` | One-line Liquid wrapper: `<juo-checkout-link providers="ideal">{{ 'sections.cart.checkout_local_payments'                                                                                                                                                                                                                                                             | t }}</juo-checkout-link>`. |

## For AI Agents

### Working In This Directory

- **Read `README.md` first** before changing the component's public API (attributes, events, `data-state` values, CSS custom props). It is the contract merchants integrate against.
- The element is **self-initializing**. Keep `index.ts` to its three imports — the SCSS, the `hide-controller` (registers its document listener on load, before the element first connects), and `customElements.define`. Don't add other side effects.
- The `CartService` is reference-counted. Every `connectedCallback` → `acquireCartService`, every `disconnectedCallback` → `releaseCartService`. When refCount drops to zero the service is torn down and the `pageshow` listener is removed. Keep this symmetric.
- `fetchSellingPlansMap()` is in-flight-deduped via `fetchPromise`. Don't reach in to clear it — it nulls itself in the `finally` block.
- The `native-fetch` option scope mirrors the emoni install: only the **cart-write** calls (`cart/clear` + `cart/add.js` in `swapCartForCheckout` and `revertCart`) go through `CartService`'s resolved `fetchFn`. Reads (`/cart.js`, the `/?section_id=` section fetch) intentionally stay on the global `fetch` — Kaching Bundles patches the writes, not the reads. If you add a new cart-**write**, route it through `this.fetchFn`; leave reads on `fetch`. `nativeFetch()` is only invoked when `useNativeFetch` is true, so no iframe is created for the default path.
- `swapCartForCheckout` restores the original cart on failure. **Do not skip that restore** — bare clear-then-fail leaves the merchant with an empty cart.
- The `<juo-checkout-link>` element uses **light DOM** (no shadow root). Theme CSS targeting `.juo-cl-button` works on purpose; preserve that.
- Provider SVGs are inline strings in `checkout-link-wc.ts`. Unknown provider names are silently dropped by `parseProviders`. Valid set: `ideal`, `bancontact`, `blik`.
- Ghost variant (`variant="ghost"` + `target="<selector>"`) copies classes from the resolved element. A `MutationObserver` waits for ajax-mounted targets — disconnect it on `disconnectedCallback` and when re-applying.

### Testing Requirements

- TS-only typecheck (no test suite):
  ```
  npx tsc --noEmit --target ES2020 --module ESNext --moduleResolution node --strict --esModuleInterop --skipLibCheck --lib ES2020,DOM,DOM.Iterable modules/checkout-link-wc/*.ts
  ```
- Manual: in the dev theme, add a subscription product, render `{% render 'juo-checkout-link-wc' %}`, click, confirm redirect to `/checkout?skip_shop_pay=true` with mapped selling plan ids.
- bfcache revert: after a successful checkout-link click, hit back. Cart should restore to the original selling plans. `pageshow` handler runs only when `persisted=true`.

### Common Patterns

- State transitions go through `setState()` so `data-state` and `disabled` stay in sync.
- All public events are dispatched on `this` with `bubbles: true`:
  - `juo:checkout:ready` (per cart change) — also consumed by `hide-controller.ts` to drive `data-hide-when-active`
  - `juo:checkout:start` / `:success` / `:error` (per click)
- Cart-level fetches always use `cache: "no-store"` + `Cache-Control: no-cache` headers — Shopify's edge caches `/cart.js` aggressively otherwise.

## Dependencies

### Internal

- Sibling files only. No imports from elsewhere in the repo.

### External

- `window.Shopify.routes.root` — used to construct `/cart/clear` and `/cart/add.js` URLs.
- `PerformanceObserver`/`MutationObserver` — both required at runtime; no fallback.
- Liquid section `juo-selling-plans` — `/?section_id=juo-selling-plans` must return the `<template>` JSON map for the swap to do anything (otherwise the button no-ops to the merchant's default checkout).

<!-- MANUAL: -->
