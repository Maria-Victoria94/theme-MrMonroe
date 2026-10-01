<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->

# modules

## Purpose

Library of optional Juo modules. Each subdirectory is a self-contained feature an operator opts into by copying it to `src/modules/<name>/`. Modules in this directory are **not built**; only what is under `src/modules/` is bundled by Vite.

Treat `modules/` as a template library, and `src/modules/` as the active build set.

## Subdirectories

| Directory                    | Purpose                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout-link-wc/`          | Web-component checkout link (`<juo-checkout-link>`) for iDEAL/Bancontact/BLIK. **Preferred default for new installs.** See [[modules-checkout-link-wc]].             |
| `checkout-link-js/`          | IIFE-flavored variant of checkout-link, used in JS-rendered carts (e.g. Rebuy drawers) where the snippet path can't reach the DOM. See [[modules-checkout-link-js]]. |
| `checkout-link/`             | Legacy checkout link wired against fixed selectors. Kept for stores already integrated with it. See [[modules-checkout-link]].                                       |
| `cart-item-to-subscription/` | Per-cart-item toggle to upgrade a one-time purchase into a subscription via `/cart/change.js`. See [[modules-cart-item-to-subscription]].                            |
| `priceWatcher/`              | Forces a Dawn-style `<variant-picker>` to re-emit `variant:change` so the displayed price reflects the active `selling_plan`. See [[modules-priceWatcher]].          |

## For AI Agents

### Working In This Directory

- **Only one checkout-link variant should be active in a theme at a time** (`checkout-link-wc` vs `checkout-link-js` vs `checkout-link`). They all wire to the same cart and `_selling_plan_id` property — stacking them double-fires the swap and corrupts carts.
- When asked to "install module X", do not edit files here. Copy `modules/<name>/` to `src/modules/<name>/` and reload `pnpm run dev`. The Vite entrypoint glob (`src/modules/*/index.{ts,js,vue,ce.ts}`) picks it up automatically.
- When extending a module, edit files in `modules/<name>/` (the library copy) so future installs receive the fix. If an in-flight `src/modules/<name>/` copy also exists, mirror the change there.
- All three checkout-link modules share a near-identical cart-swap algorithm: clear the cart, re-add the items with mapped selling plans, stash original plan IDs in `_selling_plan_id`, then navigate to `/checkout?skip_shop_pay=true`. On `pageshow` with `persisted=true` (bfcache), revert. When changing the algorithm in one, evaluate whether the others need the same fix.
- All three checkout-link variants render the same translation key — `sections.cart.checkout_local_payments`. When a merchant asks for the button label in a new language, invoke the project-local `checkout-link-translations` skill (`.claude/skills/checkout-link-translations/`) rather than hand-editing locale JSONs.

### Testing Requirements

- No automated tests. Verify against the dev theme with an actual cart that contains a subscription item.
- For `checkout-link*`: ensure `/?section_id=juo-selling-plans` returns a non-empty JSON map of `line_item.key → fixed_selling_plan_id`. Without it the swap silently no-ops.

### Common Patterns

- Each module: `index.ts` (entry), `<name>.scss` (styles), `theme/` (Liquid fragments), `types.ts` (Shopify cart typings) where applicable.
- Liquid fragments under each `theme/` directory are mirrored into `dist/` by the `syncThemePlugin`. Module `theme/` beats `overrides/` beats `.theme/`.
- Modules consume cart state via either an in-module `CartWatcher` (PerformanceObserver on `/cart/*` requests) or directly via `fetch('/cart.js')`.

## Dependencies

### Internal

- Each module is independently bundled. Modules do not import each other.
- Shared utilities live in `src/utils/` (see [[src-utils]]).

### External

- `window.Shopify.routes.root` — required at runtime by every checkout-link variant.
- `PerformanceObserver` with `entryTypes: ["resource"]` — used by all three `CartWatcher`s to react to cart mutations the theme makes.

<!-- MANUAL: -->
