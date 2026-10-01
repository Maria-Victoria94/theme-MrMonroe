<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->
<!-- name: modules-priceWatcher -->

# priceWatcher

## Purpose

Forces a Dawn-style `<variant-picker>` element to re-emit `variant:change` with the price for the currently selected `selling_plan`. Without this, the picker keeps showing the one-time price even after the customer picks a subscription plan.

Used on product pages where the theme owns the price element and consumes `variant:change` events from `<variant-picker>`.

## Key Files

| File                                     | Description                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                               | IIFE. Reads `<variant-picker>`'s `product` + `selectedVariant`, looks up the matching `selling_plan_allocations` entry, then dispatches a synthetic `variant:change` whose `detail.variant.price` is the plan's price. Re-runs on form `variant:change` and on `#juo-subscription-widget` `change`. |
| `theme/snippets/juo-price-update.liquid` | One-liner that mounts the bundle: `{% render 'juo-tag' with '@/modules/priceWatcher/index.ts' %}`.                                                                                                                                                                                                  |

## For AI Agents

### Working In This Directory

- This module assumes a theme-specific custom element named `<variant-picker>` exposing `.product`, `.selectedVariant`, and `.masterSelector.form`. That contract is Dawn-derived; if the theme differs, this module is a no-op (it short-circuits on `picker == null` or `picker.product == null`).
- The selling-plan input is located by `form input[name="selling_plan"]`. Empty/missing → it dispatches `variant:change` with the unmodified `selectedVariant`. Don't change that fallback path.
- The `setTimeout` calls in `init()` are deliberate — they let the theme's own variant/selling-plan listeners finish before this module re-broadcasts. Keep them.

### Testing Requirements

- Manual: on a product page with a Juo subscription option, switch between subscription/OTP and confirm the displayed price tracks the plan. If the theme has no `<variant-picker>`, this module should silently no-op.

### Common Patterns

- Re-emits an existing event (`variant:change`) rather than introducing a new one — host themes don't need to subscribe to anything special.
- Uses `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for the picker because the element is theme-provided and not typed.

## Dependencies

### Internal

- None outside this directory.

### External

- A theme that defines `<variant-picker>` with the documented surface (Dawn or Dawn-derived).
- A form input `name="selling_plan"` carrying the active plan id.

<!-- MANUAL: -->
