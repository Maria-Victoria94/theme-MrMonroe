<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->
<!-- name: src-utils -->

# utils

## Purpose

Shared TS utilities consumable by any installed module. Framework-free, DOM-aware, no external runtime deps.

## Key Files

| File             | Description                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collapsible.ts` | `createCollapsible(el, initial)` — height-animated open/close helper. Sets `transition: height 300ms ease-in-out` and toggles between `0` and measured `auto`. |
| `formatMoney.ts` | Port of Shopify's classic `Shopify.formatMoney` helper. Accepts cents + format string (`${{amount}}`, `{{amount_with_comma_separator}}`, etc.).                |

## For AI Agents

### Working In This Directory

- Keep utilities pure-TS. Don't introduce framework imports (Vue, etc.) — modules that don't use Vue must still be able to import these without bundling overhead.
- Adding a new util? Export from its own file with named exports. There is no barrel `index.ts`.

### Common Patterns

- All utilities are DOM-touching but synchronous and stateless aside from the closure each call creates.
- `formatMoney` mirrors the legacy Shopify helper precisely — when matching it against a Liquid `{{ money }}` filter, the format strings line up.

## Dependencies

### External

- None at runtime. The TS files are consumed by module bundles directly.

<!-- MANUAL: -->
