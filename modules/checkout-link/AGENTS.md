<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->
<!-- name: modules-checkout-link -->

# checkout-link

## Purpose

Original, server-rendered Juo checkout link. Listens for clicks on `#juo-go-to-checkout-with-ideal` (a static button placed by Liquid snippets), runs the same cart-swap as the WC and JS variants, and navigates to `/checkout?skip_shop_pay=true`. The button itself is added via Liquid (e.g. `cart-checkout-links.liquid`, `default-checkout-link.liquid`) so this module just wires behavior.

Kept for legacy stores already integrated with the `juo-checkout-link.liquid` snippet. **New installs should use [[modules-checkout-link-wc]] instead.**

## Key Files

| File                                                       | Description                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                                                 | IIFE that wires up the click handler, the cart-change subscription, the in-flight-dedup `updateSellingPlansMap()`, and the bfcache `revertCart`.                                                                                                   |
| `cartWatcher.ts`                                           | Same shape as the sibling modules — PerformanceObserver + `localStorage["juo-cart"]` + `cart_changed`.                                                                                                                                             |
| `checkout-link.scss`                                       | Button styling.                                                                                                                                                                                                                                    |
| `types.ts`                                                 | Shopify cart/line-item typings.                                                                                                                                                                                                                    |
| `theme/snippets/juo-checkout-link.liquid`                  | Defines the iDEAL button and supporting markup.                                                                                                                                                                                                    |
| `theme/snippets/cart-checkout-links.liquid`                | Cart-page placement.                                                                                                                                                                                                                               |
| `theme/snippets/side-cart-checkout-links.liquid`           | Side-drawer placement.                                                                                                                                                                                                                             |
| `theme/snippets/default-checkout-link.liquid`              | Fallback "default checkout" wording when no subscription items are present.                                                                                                                                                                        |
| `theme/snippets/has-prepaid-plan.liquid`                   | Sets a `has_prepaid` Liquid var by comparing each line's `selling_plan.billing_policy.interval{,_count}` against its `delivery_policy`. Prepaid = same interval, larger billing `interval_count`. Replaces the old option-string parsing approach. |
| `theme/sections/juo-selling-plans.liquid`                  | The `line_item.key → fixed_selling_plan_id` JSON map for the swap.                                                                                                                                                                                 |
| `theme/assets/{ideal-logo@2x.png,mastercard.svg,visa.svg}` | Static logo assets.                                                                                                                                                                                                                                |

## For AI Agents

### Working In This Directory

- The click handler uses **event delegation on `document`** with a selector match against `#juo-go-to-checkout-with-ideal`. The button can be removed and re-rendered without rebinding.
- `lastItemKeys` caches the selling-plans-map fetch by joined cart line keys. Don't fetch eagerly when keys haven't changed.
- `isProcessing` is a module-scope guard against double clicks; restoration paths must reset it.
- The form-level `has-selling-plan` class is added/removed by `handleCartChange` — themes can hook into it to hide their own checkout button when the iDEAL button is active.
- Same swap algorithm as the sibling modules; **fix in lockstep** when you touch one of them. See also [[modules-checkout-link-wc]] and [[modules-checkout-link-js]].

### Testing Requirements

- Manual only. Add a subscription product, render the appropriate `*-checkout-links.liquid` snippet for the placement (cart vs side drawer), click iDEAL, confirm redirect with mapped plans.
- Failure-path test: cause `cart/add.js` to fail (e.g. invalidate the cart token in devtools) and verify the original cart is restored.

### Common Patterns

- IIFE, `window.Shopify` guard at top.
- `revertCart` runs once during `init` (no `setTimeout` here) and again on `pageshow` with `persisted=true`.
- `originalItems` snapshot includes the current `selling_plan` so the restore path can rebuild the cart exactly.

## Dependencies

### Internal

- None outside this directory.

### External

- `window.Shopify.routes.root` at runtime.
- The button `#juo-go-to-checkout-with-ideal` must be present in the DOM (rendered by one of the included Liquid snippets).
- Section `juo-selling-plans` must exist.

<!-- MANUAL: -->
