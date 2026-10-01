<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->
<!-- name: modules-checkout-link-js -->

# checkout-link-js

## Purpose

Selector-driven IIFE variant of the Juo checkout link. Mounts an iDEAL checkout button next to a JS-rendered cart's native button (cart page, Rebuy drawer, etc.) by injecting a snippet template (`#juo-ideal-checkout-link`) into a `MutationObserver`-discovered wrapper. Same swap algorithm as `checkout-link-wc` but DOM-imperative instead of WC-based.

Pick this **only** when the snippet path can't reach the DOM (i.e., the cart is mounted client-side by Rebuy or a theme's drawer). For new installs prefer [[modules-checkout-link-wc]].

## Key Files

| File                                      | Description                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`                                | The whole module, IIFE-wrapped. Owns the DOM-injection (`addCheckoutLink`), the cart swap (`switchCart`), the bfcache revert (`revertCart`), and the cart-change subscription. |
| `cartWatcher.ts`                          | PerformanceObserver-driven cart watcher. Same shape as the sibling modules; mirrors cart state into `localStorage["juo-cart"]` and dispatches `cart_changed`.                  |
| `checkout-link.scss`                      | Button + wrapper styling.                                                                                                                                                      |
| `types.ts`                                | Shopify cart/line-item typings.                                                                                                                                                |
| `theme/snippets/juo-checkout-link.liquid` | Defines the `#juo-ideal-checkout-link` and `#juo-cart-default-button` `<template>` elements consumed by `index.ts`.                                                            |
| `theme/sections/juo-selling-plans.liquid` | Generates the `line_item.key → fixed_selling_plan_id` JSON map for the swap.                                                                                                   |
| `theme/assets/ideal-logo@2x.png`          | iDEAL logo.                                                                                                                                                                    |

## For AI Agents

### Working In This Directory

- **Selectors at the top of `index.ts` are theme-specific** — `defaultButtonSelector`, `cartActionsSelector`, `cartItemSellingPlansSelector`, `iconsSelector`. Adjust them when integrating into a new theme. The current values cover the cart page (`.cart__checkout-button` / `.cart__ctas`) and Rebuy drawer (`.rebuy-cart__checkout-button` / `[data-rebuy-component='checkout-area']`).
- The IIFE bails out if `window.Shopify == null`. Don't add work outside that guard.
- Cart-swap algorithm is intentionally near-identical to [[modules-checkout-link-wc]]'s `swapCartForCheckout`. If you fix one, evaluate whether the other needs the same fix — they cover the same merchant problem.
- `hasPrepaid` detection scans selling-plan option strings (`df:`, `bf:`) — this is a known fragile path; see also [[modules-checkout-link]]. When changing prepaid detection, check whether the WC variant needs the same logic (it currently doesn't gate on prepaid).
- Reverting after bfcache (`pageshow` with `persisted=true`) reads `_selling_plan_id` from each line item's properties — keep that property name in sync across all three checkout-link modules.
- `revertCart` after the IIFE runs (via `setTimeout(..., 1000)` in `init`). This is a deliberate delay to let the theme's own cart hydration land first.

### Testing Requirements

- Manual only. Confirm the iDEAL button appears beside the theme's native checkout button when a subscription is in the cart, and disappears when it isn't.
- For Rebuy: open the drawer, ensure the button mounts after Rebuy renders. The `MutationObserver` in `init()` waits for `cartActionsSelector`.

### Common Patterns

- DOM mutations go through `addCheckoutLink`. It is reentrant-safe: if the iDEAL button already exists it returns early.
- All cart writes use `cart/clear` then `cart/add.js` with `attributes` preserved.

## Dependencies

### Internal

- None outside this directory.

### External

- `window.Shopify.routes.root` at runtime.
- The two `<template>` elements injected by `juo-checkout-link.liquid` must exist in the DOM.
- The section response `/?section_id=juo-selling-plans` must contain the `<template>` JSON map.

<!-- MANUAL: -->
