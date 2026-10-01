<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->
<!-- name: modules-cart-item-to-subscription -->

# cart-item-to-subscription

## Purpose

Per-line-item toggle that upgrades a one-time-purchase cart item to a Juo subscription (and downgrades it back). Renders a checkbox + selling-plan `<select>` per cart line via the `juo-cart-item-to-subscription` snippet and POSTs to `/cart/change.js` with the chosen `selling_plan` (or `null` to remove).

Used in cart drawers/pages where merchants want an inline "Subscribe & save" upsell without a dedicated upsell surface.

## Key Files

| File                                                  | Description                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`                                            | IIFE. Delegates `click` (checkbox) and `change` (`<select>`) on `document`; calls `setSellingPlan` / `removeSellingPlan`; emits `cart:prepare-bundled-sections` and `cart:change` events on `document.documentElement` for the host theme to react to. |
| `cart-item-to-subscription.scss`                      | Styling for the switcher (`.juo-subscribe-switcher`, `.pill-loader`, etc.).                                                                                                                                                                            |
| `theme/snippets/juo-cart-item-to-subscription.liquid` | Renders the checkbox + selling-plan select per cart line. Filters `line_item.product.selling_plan_groups` to `app_id == 'juo-subscriptions'`.                                                                                                          |

## For AI Agents

### Working In This Directory

- The two persistent line-item properties this module sets are `_juo_subscribe_cart` (the selling plan id) and `_juo_source: "subscribe-cart"`. Don't repurpose those keys — Juo backend filtering relies on them.
- The DOM contract is selector-only: `.juo-subscribe-cart__selling-plans-checkbox` (checkbox) and `.juo-subscribe-cart__selling-plan-switcher--select` (select), both with `data-variant-id`. If you change selectors, update both the Liquid snippet and the IIFE.
- `cart:prepare-bundled-sections` is emitted to let host themes (e.g. Dawn-style themes) declare which Shopify cart sections to bundle into the response. The IIFE then forwards `sections` to `/cart/change.js`. Keep that path even if the host doesn't listen — it's a no-op when nothing pushes section ids.
- The pill-loader element is theme-side markup; don't bake the spinner DOM into JS.
- The Liquid snippet filters selling-plan groups to `app_id == 'juo-subscriptions'`. **Do not remove that filter** — without it the dropdown can show non-Juo plans the swap doesn't know how to handle.

### Testing Requirements

- Manual: in a cart drawer/page, ensure each subscribable line item shows the checkbox; toggling it sets/unsets the selling plan; the host theme re-renders the cart total correctly via the `cart:change` event.

### Common Patterns

- Event delegation on `document` — survives the host theme re-rendering the cart.
- Fetches `cart.js` to locate the right line `key` for the variant, then `cart/change.js` for the actual mutation.

## Dependencies

### Internal

- None outside this directory.

### External

- `window.Shopify.routes.root` at runtime. The TS type for this comes from `src/globals.d.ts` — this module no longer declares it locally.
- A host-theme cart that listens to `cart:change` on `document.documentElement` (or polls cart state on its own) to re-render after the mutation.

<!-- MANUAL: -->
