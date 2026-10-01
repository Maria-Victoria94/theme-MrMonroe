# `<juo-checkout-link>`

Drop-in web component for a local-payments checkout button on carts containing Juo subscription items. On click it swaps the cart's selling plans for the upstream provider's fixed-plan variant, then redirects to `/checkout?skip_shop_pay=true`.

The component owns **behavior only** — state machine, cart swap, a11y, error handling. **Visual content (logos, labels, layout) is whatever you put inside the tag.** Theme classes on the host apply directly to the visible button.

Use this for new installs, or any theme where you can add a Liquid snippet.

---

## Quick start

```liquid
{% render 'juo-checkout-link-wc' %}
```

The default snippet is just:

```liquid
<juo-checkout-link>
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

The element auto-hides when the cart has no subscription items, auto-shows when it does, and reverts any orphaned cart-swap state on every cart-page load.

To add provider logos or custom layout, put them as children:

```liquid
<juo-checkout-link class="cart__checkout-button">
  {% render 'ideal-logo' %}
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

---

## When to use which module

| Module                        | Pick when                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `checkout-link-wc` (this one) | New installs, or any theme where you can add a Liquid snippet. **Preferred default.**         |
| `checkout-link`               | Legacy installs already wired to the `juo-checkout-link.liquid` snippet.                      |
| `checkout-link-js`            | JS-rendered carts (Rebuy, theme-specific drawers) where the snippet path can't reach the DOM. |

Only one of these should be active in a theme at a time.

---

## API reference

### Tag

```html
<juo-checkout-link
  >Button content (text, images, SVGs, anything)</juo-checkout-link
>
```

The host element **is** the button. It gets `role="button"`, `tabindex`, `aria-disabled`, click activation, and Enter/Space keyboard activation. Theme classes and inline styles on the host apply to the visible button directly — no inner wrapper.

The component never wipes your child content. Whatever you put between the tags renders as-is. If the element is empty, it falls back to the text `Checkout with iDEAL`.

### Attributes

| Attribute               | Type               | Default                        | Purpose                                                                                                                                                                                                                                            |
| ----------------------- | ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout-url`          | URL                | `/checkout?skip_shop_pay=true` | Where to navigate after the cart swap.                                                                                                                                                                                                             |
| `selling-plans-section` | string             | `juo-selling-plans`            | Shopify section ID used to fetch the plan-swap map. Rarely changed.                                                                                                                                                                                |
| `disabled`              | boolean (presence) | unset                          | Forces the button into a disabled state regardless of cart contents.                                                                                                                                                                               |
| `data-hide-when-active` | CSS selector list  | unset                          | Comma-separated selectors for page elements to hide while a fixed plan is in the cart. See [Hide other elements](#hide-other-elements-when-a-fixed-plan-is-in-the-cart).                                                                           |
| `native-fetch`          | boolean (presence) | unset                          | Route the checkout-swap cart writes (`cart/clear` + `cart/add.js`) through a pristine `fetch` from a hidden iframe, bypassing themes that monkey-patch `window.fetch`. See [Bypassing a patched `window.fetch`](#bypassing-a-patched-windowfetch). |

### Events (all bubble)

| Event                  | `detail`                       | When                                                                                                                          |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `juo:checkout:ready`   | `{ hasSellingPlan: boolean }`  | After a cart change settles. Suppressed while in `processing`, `success`, or `error` so an in-flight swap is not interrupted. |
| `juo:checkout:start`   | `{ cart }`                     | User clicked, swap is starting.                                                                                               |
| `juo:checkout:success` | `{ url }`                      | Swap succeeded, redirect imminent.                                                                                            |
| `juo:checkout:error`   | `{ error, restored: boolean }` | Swap failed and original cart was restored.                                                                                   |

### Visual states

The element exposes a `data-state` attribute. CSS selectors can hook into it:

| `data-state` | Meaning                                                                 | Visible?                                                                     |
| ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `idle`       | Cart has no subscription items.                                         | Hidden (`display:none`).                                                     |
| `loading`    | Fetching selling plans on first mount; cart-presence not yet confirmed. | Hidden (`display:none`).                                                     |
| `ready`      | Active and clickable. Cart contains at least one subscription item.     | Yes.                                                                         |
| `processing` | Swap in flight.                                                         | Disabled, content hidden, centered spinner via `::after`.                    |
| `success`    | Swap succeeded; navigation imminent (`/checkout` is being fetched).     | Disabled, content hidden, spinner still running until the browser navigates. |
| `error`      | Swap failed; cart restored. Returns to `ready` after 3s.                | Visible, shake animation.                                                    |

The element is only ever visible when the cart contains a selling plan. During the initial fetch (`loading`) the cart's selling-plan state isn't known yet, so the element stays hidden to avoid a visible-then-disappear flash.

### CSS custom properties

```css
juo-checkout-link {
  --juo-cl-color-primary: #be7c4d;
  --juo-cl-color-text: #fff;
  --juo-cl-border-radius: 0;
  --juo-cl-height: auto;
}
```

These only affect the bundled default look. If you put theme classes on the host (`<juo-checkout-link class="…">`), the defaults are wrapped in `:where(...)` so your classes win on specificity without `!important`.

---

## Recipes

### Match the store's existing checkout button

```liquid
<juo-checkout-link class="btn btn--primary cart__checkout-button">
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

### Add a provider logo

The component renders no logos of its own. Put whatever artwork the merchant needs as child content:

```liquid
<juo-checkout-link class="cart__checkout-button">
  <img
    src="{{ 'ideal-logo.svg' | asset_url }}"
    alt="iDEAL"
    width="44"
    height="20"
  >
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

Multiple logos? Just add them — flex layout from the default stylesheet (or your theme's button class) handles spacing.

### Per-store color overrides via theme settings

```liquid
<juo-checkout-link
  style="--juo-cl-color-primary: {{ settings.juo_primary_color }};"
>
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

### Listen for checkout events (analytics, GA, etc.)

```js
document.addEventListener("juo:checkout:start", (e) => {
  gtag("event", "juo_checkout_start", { cart: e.detail.cart });
});
document.addEventListener("juo:checkout:success", (e) => {
  gtag("event", "juo_checkout_success", { url: e.detail.url });
});
```

### Hide other elements when a fixed plan is in the cart

When the cart contains a fixed/selling plan, the iDEAL button checks out the **entire** cart (including any regular products in a mixed cart) — so the theme's native checkout button, express-payment buttons, etc. become redundant. Use `data-hide-when-active` to hide them.

Put a comma-separated CSS selector list on the tag. While the cart has a fixed plan, every matching element **anywhere on the page** gets the `juo-hidden-by-checkout` class (`display: none !important`); when the plan leaves the cart, the class is removed and they reappear. The targets need no DOM relationship to the button — matching is done against the whole document.

```liquid
<juo-checkout-link
  data-hide-when-active="[name='checkout'], .cart__checkout-button, .shopify-payment-button"
>
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

This rides the `juo:checkout:ready` event, so it stays in sync on first paint and on every cart change. Leaving the attribute off (or blank) disables the behavior entirely. An invalid selector is logged to the console and ignored — it never blocks checkout.

**Make it merchant-configurable** by wiring the attribute to a section setting so a store can pick the elements from the theme editor without touching code:

```liquid
<juo-checkout-link
  data-hide-when-active="{{ section.settings.juo_hide_selectors | escape }}"
>
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

```json
{
  "type": "text",
  "id": "juo_hide_selectors",
  "label": "Hide these elements when the local-payments checkout is available",
  "info": "Comma-separated CSS selectors. Leave blank to disable.",
  "default": "[name='checkout'], .cart__checkout-button"
}
```

### Bypassing a patched `window.fetch`

Some merchant themes and apps monkey-patch `window.fetch` to intercept cart writes — Kaching Bundles is the common culprit, but bundle/upsell apps and analytics wrappers do it too. That interception can corrupt the selling-plan swap (e.g. re-adding bundle items, rewriting line properties), leaving the cart in a bad state at checkout.

Add the `native-fetch` attribute to route the checkout-swap **cart writes** — the `cart/clear` and `cart/add.js` calls in the swap and revert paths — through a pristine `fetch` pulled from a hidden same-origin iframe, which has its own untouched `window.fetch`. Cart reads (`/cart.js`, the selling-plans section fetch) are not the target of this interception and stay on the global `fetch`:

```liquid
<juo-checkout-link native-fetch>
  {{- 'sections.cart.checkout_local_payments' | t -}}
</juo-checkout-link>
```

It's **off by default** — only turn it on when you've confirmed a patched-fetch problem on the store, since it adds a hidden iframe to the page. The iframe is created lazily (only when the attribute is present) and kept attached for the page lifetime: the bound `fetch` runs in the iframe's global scope, so detaching it would break later calls with "The global scope is shutting down".

### Multiple elements on the same page

Placing the snippet in both the cart page and the drawer is safe. The module uses a singleton cart watcher so:

- Only one PerformanceObserver and one selling-plans fetch run total.
- Only the clicked button executes the swap; the others throw fast on a concurrent click.
- Revert runs once per load, not N times.

---

## Behavior summary

1. On `connectedCallback`: set `role="button"` and `tabindex`, fall back to default text only if the element is empty, set `data-state="loading"`, acquire the singleton cart service.
2. When the cart is fetched: if it contains any item with a `selling_plan_allocation`, switch to `ready` and show. Otherwise `idle` (hidden).
3. On click: swap selling plans (`/cart/clear` + `/cart/add.js` with mapped plans), then `window.location.href = checkoutUrl`.
4. On failure: restore the original cart, flash error state, return to `ready` after 3s.
5. On every cart-page load (and on bfcache restore): if any line item carries a `_selling_plan_id` property — the marker the swap leaves behind — revert the cart back to the original recurring plans. This guarantees the cart is only ever in the "fixed plan" state during the brief window between click and redirect, so the theme's native checkout button always sees the original recurring plan.

---

## Troubleshooting

### Button doesn't appear

- **No subscription items in cart.** The element only shows when at least one cart line has a `selling_plan_allocation`. Add a subscription product and refresh.
- **`juo-selling-plans` section missing.** The element fetches `/?section_id=juo-selling-plans`. Verify the section exists in `sections/juo-selling-plans.liquid`. Without it the fetch throws and the swap will fail at click time with a logged error.
- **`window.Shopify` missing.** The element bails out of `connectedCallback` if `window.Shopify` is undefined. Check the script load order — Shopify's bootstrap must run first.
- **`juo-tag.liquid` not rendered.** Vite-plugin-shopify generates this snippet to load every module bundle. Add `{% render 'juo-tag' %}` in `layout/theme.liquid` before `</head>`.
- **CSS hides it.** Inspect `data-state` on the element. If it's `idle`, see "No subscription items" above. If it's `ready` but invisible, theme CSS may be overriding `display`.

### Click does nothing

- **State isn't `ready`.** Check the element's `data-state`. If `loading` or `processing`, wait. If `error`, the previous swap failed — check console.
- **The bundle didn't load.** In the network tab, look for `juo-checkout-link-wc.js`. If it's missing, `juo-tag.liquid` isn't in the layout.
- **An element with `pointer-events: none` is on top.** The host is the click target now; any covering element with pointer-events will eat clicks.

### Cart shows fixed plan after returning from checkout

- `revertCart` runs on every cart-page load and on bfcache restore. If it fails (network error mid-revert), the cart stays in the swapped state. Check the console — the error from `cart-service.ts` will be logged. The user can refresh the cart page; the next load will retry the revert.

---

## For AI agents

When a merchant or support engineer asks you to install or modify this component:

1. **Default to the snippet.** Recommend `{% render 'juo-checkout-link-wc' %}` unless they specifically need to customize.

2. **Logos and visual content are merchant-owned.** Do not invent SVGs or hardcode provider artwork. If they ask for an iDEAL/Bancontact/BLIK logo, instruct them to drop the image or SVG as a child of the tag.

3. **The label is child text.** No `label` attribute exists. Place the translation directly between the tags:

   ```liquid
   <juo-checkout-link>
     {{- 'sections.cart.checkout_local_payments' | t -}}
   </juo-checkout-link>
   ```

4. **For "make it look like our existing button" requests:** put the theme's button classes directly on the host: `<juo-checkout-link class="theme-button-classes">`. Bundled defaults are inside `:where(...)` so theme classes win without `!important`.

5. **For "change colors" requests:** use the `--juo-cl-color-*` custom properties, not class overrides.

6. **Do NOT use `<juo-checkout-link>` alongside `juo-checkout-link.liquid` (the old non-WC snippet).** They wire to the same cart and will both try to swap. Migrate, don't dual-stack.

7. **The element is fully self-initializing.** Do not call any JS to "start" it. Dropping the tag in Liquid is sufficient.

8. **If the merchant needs to react to the swap** (analytics, custom UI), point them at the four `juo:checkout:*` events, not at private methods.

9. **`juo-tag.liquid` must be rendered in the layout.** This is the most common "nothing loads" failure. Verify the snippet exists in `layout/theme.liquid`.

10. **To hide the native checkout (or other elements) when a fixed plan is in the cart**, use the `data-hide-when-active` attribute (a CSS selector list) — see [Hide other elements](#hide-other-elements-when-a-fixed-plan-is-in-the-cart). Don't hand-roll a `:has()` CSS rule or a custom event listener; the `hide-controller.ts` companion already does this generically and stays in sync. Confirm the selectors match this theme's actual cart markup before relying on them.

11. **If the cart swap misbehaves on a store that patches `window.fetch`** (Kaching Bundles, bundle/upsell apps, analytics wrappers), add the `native-fetch` attribute — see [Bypassing a patched `window.fetch`](#bypassing-a-patched-windowfetch). Don't reach for it preemptively; it's a targeted fix for confirmed fetch-interception, not a default.
