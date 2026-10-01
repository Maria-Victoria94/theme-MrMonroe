---
name: checkout-link-translations
description: Add or update the `sections.cart.checkout_local_payments` translation that the Juo checkout-link snippets render. Two-step workflow — copy the requested locale files from `.theme/locales/` to `overrides/locales/` and commit the copies first, then insert the translation key in each override and commit separately. Invoke when the user asks to translate, localize, or add i18n strings for the checkout-link / `<juo-checkout-link>` button.
---

# checkout-link-translations

## What this skill does

Adds one translation key — `sections.cart.checkout_local_payments` — to a chosen set of locale files in `overrides/locales/`. Every checkout-link variant in this repo renders that key (`juo-checkout-link-wc.liquid`, both `juo-checkout-link.liquid` variants, and `default-checkout-link.liquid`).

The work is split into **two separate commits** so the file-copy diff stays reviewable apart from the actual translation strings:

1. **Commit A — copy**: mirror chosen `.theme/locales/<code>.json` files into `overrides/locales/<code>.json` (unchanged byte-for-byte).
2. **Commit B — translate**: edit each override JSON to set `sections.cart.checkout_local_payments`.

## Inputs you must collect

Before doing anything, confirm both with the user (or read from the user's invocation):

1. **Locales** — a list of locale codes. Each must already exist as `.theme/locales/<code>.json`. Common examples: `en.default`, `nl`, `fr`, `de`, `pl`. Do **not** assume — ask if the user only said e.g. "translate to Dutch and French" without giving codes.
2. **Translation value(s)** — either one string used across all locales, or one per locale. If the user gives only one string and the locale list is plural, ask whether they want it duplicated or want per-locale values.

If either is missing, ask with `AskUserQuestion` before proceeding.

### Example invocation

A real run of this skill for the BLIK payment method:

- **Locales**: `en.default`, `pl`
- **Per-locale values**:
  - `en.default` → `Pay with BLIK`
  - `pl` → `Zapłać BLIKIEM`

Note the localized verb form in Polish (`Zapłać BLIKIEM`, instrumental case) rather than a direct copy of the English string — that's the point of asking "same string or per-locale" up front. A merchant-named payment method like BLIK, Przelewy24, iDEAL, or Bancontact almost always wants the surrounding verb localized even though the brand name stays.

## Step 1 — Copy locale files (Commit A)

For each requested locale `<code>`:

- **Check both `overrides/locales/<code>.json` and `.theme/locales/<code>.json`.**
- If the override already exists, **skip the copy** (do not clobber). Note this in the user-facing summary — Commit A may end up with fewer files than locales if some already exist.
- If `.theme/locales/<code>.json` is missing, **fail loudly** for that code. List which codes do exist (the user may have mistyped a region tag like `nl-NL` vs `nl`).
- Otherwise, copy with the Bash tool:
  ```
  mkdir -p overrides/locales
  cp .theme/locales/<code>.json overrides/locales/<code>.json
  ```

Do **not** copy:

- `<code>.schema.json` files — those are theme-editor strings, not storefront translations.
- Anything besides the explicitly requested codes.

After all copies, show `git status` to the user and stage:

```
git add overrides/locales/
```

Create Commit A with a message matching this repo's style (terse, imperative, no trailing summary). Suggested:

```
Copy <N> locale file(s) to overrides for checkout-link translations
```

Do not push.

## Step 2 — Insert the translation (Commit B)

For each override file:

1. **Read** `overrides/locales/<code>.json`. Note that the file begins with a `/* ... */` comment block — that's JSONC. Preserve the comment as-is.
2. **Find the `sections.cart` block.** Use the Read tool; do not pipe through `jq` or `python -m json.tool` (the leading comment trips strict JSON parsers).
3. **Insert the key** at `sections.cart.checkout_local_payments` using the Edit tool:
   - If `sections.cart.checkout_local_payments` already exists with a different value, **ask the user** before overwriting.
   - If `sections.cart` exists but has no `checkout_local_payments`, add it as a new entry. Match the indent depth of sibling keys (usually 4 spaces).
   - If `sections` exists but has no `cart` subkey, add `"cart": { "checkout_local_payments": "<value>" }` inside `sections`.
   - If `sections` doesn't exist at top level (rare in Shopify locales), add the full `"sections": { "cart": { "checkout_local_payments": "<value>" } }` block adjacent to the existing top-level keys, before the final closing `}`.
4. **Mind the trailing comma.** When inserting a new entry into an existing object, the entry before it must gain a comma. When inserting before an existing entry, the new entry must end with a comma.

Recommended Edit pattern when `sections.cart` already exists with sibling keys:

```
old_string:
    "<some-existing-sibling-key>": "<existing value>"
  }

new_string:
    "<some-existing-sibling-key>": "<existing value>",
    "checkout_local_payments": "<your value>"
  }
```

Pick an `<existing-sibling-key>` whose closing `}` is the close of `sections.cart` — not a nested object inside it. Reading the surrounding 10–20 lines first prevents the easy mistake of inserting one level too deep.

After all edits:

- Run `git diff overrides/locales/` and show the user.
- **Do not auto-commit Commit B.** The translation strings are human content — the user reviews the diff and commits when ready. Offer the suggested commit message:
  ```
  Add checkout_local_payments translation for <locale list>
  ```

## Sanity checks

- The translated string is a button label. If it's longer than ~40 characters, flag it to the user before committing.
- The key value should not contain unescaped quotes. If the value contains `"`, escape as `\"`.
- If `overrides/locales/<code>.json` is missing a top-level `sections` key when you read it, treat that as the legitimate starting state of a freshly-copied minimal locale file and add the nesting from scratch.

## Boundaries — what this skill does NOT do

- **Does not** copy or modify `<code>.schema.json` files.
- **Does not** add any keys other than `sections.cart.checkout_local_payments`. For unrelated translations (e.g. `customer.*.subscription_link` from the README), ask the user to invoke this skill again with a clear scope or to extend the skill.
- **Does not** push to a remote.
- **Does not** edit anything inside `.theme/` — that directory is overwritten by `pnpm theme:pull`.
- **Does not** `git add -A`. Stage only `overrides/locales/`.

## Reference: where the key is consumed

- `modules/checkout-link-wc/theme/snippets/juo-checkout-link-wc.liquid:1`
- `modules/checkout-link-js/theme/snippets/juo-checkout-link.liquid:6,15`
- `modules/checkout-link/theme/snippets/juo-checkout-link.liquid:16`
- `modules/checkout-link/theme/snippets/default-checkout-link.liquid:2`

If the user adds the snippet to a theme but the button shows `translation missing: sections.cart.checkout_local_payments`, the cause is almost always: the override locale file wasn't added for the storefront's current locale. Running this skill for that locale fixes it.
