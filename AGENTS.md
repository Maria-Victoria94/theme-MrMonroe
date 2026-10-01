<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->

# theme-skeleton

## Purpose

Build harness for Juo Shopify themes. Bundles per-merchant JS/CSS modules (Vue + plain TS web components) on top of a merchant's pulled-down Shopify theme. The final theme is produced by layering three sources and pushing the result to a dev or live theme via the Shopify CLI.

The merge order (each layer overwrites the previous) is:

1. `.theme/` — live theme pulled from the connected store via `shopify theme pull`
2. `overrides/` — per-store overrides committed to this repo
3. `src/modules/*/theme/` — theme fragments contributed by enabled Juo modules

Vite then writes bundles into `dist/assets/` and emits a `juo-tag.liquid` snippet used by module Liquid templates to mount the JS/CSS bundles. The `@driver-digital/vite-plugin-shopify-clean` plugin deletes stale `juo-*.{js,css}` artifacts from `dist/assets` between builds so old hash-named bundles don't accumulate.

## Key Files

| File                       | Description                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`             | Scripts, deps, store config under `config.store`. Build = `pnpm run lint && pnpm run clean && vite build`.                                                     |
| `vite.config.js`           | Vite build with `vite-plugin-shopify`, Vue plugin, `shopifyClean` (stale-asset pruner), and the custom `syncThemePlugin` that copies theme layers into `dist`. |
| `sync-theme.js`            | The `syncThemePlugin` factory — chokidar-watches each pattern and mirrors files into `dist` during dev, copies once during build.                              |
| `widget-schema.json`       | Reference Shopify block schema for the legacy widget (preserved for store-side config copy/paste).                                                             |
| `README.md`                | Operator-oriented integration guide. Read this before you change the build pipeline or the layer order.                                                        |
| `.env.example`             | Template for the optional `VITE_SHOPIFY_TUNNEL` env var.                                                                                                       |
| `theme.code-workspace`     | VS Code workspace. Rename per-store on init.                                                                                                                   |
| `.shopify/metafields.json` | Local Shopify CLI metafield cache.                                                                                                                             |

## Subdirectories

| Directory         | Purpose                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `modules/`        | Library of Juo modules merchants can opt into by copying to `src/modules/` (see `modules/AGENTS.md`).                                |
| `src/`            | Active build inputs: enabled modules, shared utils, shared SCSS, ambient TS globals (see `src/AGENTS.md`).                           |
| `overrides/`      | Per-store Liquid overrides that beat `.theme/` but are beaten by module `theme/` dirs. Marked `.shopifyignore` to avoid double-push. |
| `.theme/`         | Merchant's live Shopify theme. Pulled by `pnpm theme:pull`. Never edit by hand.                                                      |
| `dist/`           | Vite output. Marked `.shopifyignore` for source pulls; this is what `pnpm push` ships.                                               |
| `.shopify/`       | Shopify CLI state (auth, metafield cache).                                                                                           |
| `.omc/`           | oh-my-claudecode session state and plans. Ignored via `.gitignore`. Safe to ignore unless debugging an OMC session.                  |
| `.claude/skills/` | Project-local Claude Code skills (see "Project skills" below).                                                                       |

## For AI Agents

### Working In This Directory

- **Don't push to live** without explicit operator confirmation. `pnpm push` ships `dist/` to whichever theme the operator picks; treat it as a release action.
- **Don't run `dev:pull` or `theme:pull` without permission.** They overwrite `.theme/` from the connected store. If the merchant has uncommitted overrides there, work is lost.
- **Don't edit `.theme/` files.** Put store-specific overrides in `overrides/`. Put module-owned files in the appropriate `modules/<name>/theme/` directory.
- The store identifier lives in `package.json` `config.store`. Scripts read it via `$npm_package_config_store`. Update it during repo init.
- `pnpm-lock.yaml` is present — use `pnpm`, not `npm`/`yarn`.
- Local tunnel: set `VITE_SHOPIFY_TUNNEL=<url>` in `.env` (see `.env.example`). `vite-plugin-shopify` picks it up and exposes the dev server through it. No automatic tunnel-spawn helper anymore — start your own (`cloudflared tunnel`, `ngrok`, etc.) and paste the URL in.

### Project skills

Project-local Claude Code skills live under `.claude/skills/<name>/SKILL.md` and load automatically. Invoke via the Skill tool by exact name. Read the skill body before acting — frontmatter `description` is the trigger summary, not the full procedure.

| Skill                        | Use when                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout-link-translations` | The user asks to translate, localize, or add i18n strings for the checkout-link / `<juo-checkout-link>` button. Manages the single key `sections.cart.checkout_local_payments` across chosen `overrides/locales/<code>.json` files via a two-commit workflow (copy locale files from `.theme/locales/`, commit; then insert the key, commit separately). |

When adding new project skills, register them here so other agents find them by reading AGENTS.md rather than only via the runtime skills listing.

### Testing Requirements

- No unit-test suite exists. Verification is manual + lint.
- Before claiming any change works, run `pnpm run lint` and `pnpm run build`. Both should be clean.
- For TS-only verification of `modules/checkout-link-wc/*.ts`, the project memory records a typecheck command — see project memory `build`.
- For UI changes: start `pnpm run dev` and verify the modified flow in the connected dev theme. State that explicitly when handing off.

### Common Patterns

- Modules live as flat directories under `modules/`. Each module is opt-in: an operator copies the module folder into `src/modules/` to enable it.
- Each module typically ships an `index.ts` entrypoint (Vite picks this up via `additionalEntrypoints: ["./src/modules/*/index.{ts,js,vue,ce.ts}"]`), an optional SCSS file, a `theme/` directory of Liquid fragments, and `types.ts` for Shopify cart typings.
- Liquid uses `{% render 'juo-tag' with '@/modules/<name>/index.ts' %}` to inject the right `<script>`/`<link>` tags for that module's bundle.

## Dependencies

### External

- `vite` 7.3 with `vite-plugin-shopify` 4.1 — theme entrypoint discovery + asset hash injection.
- `@vitejs/plugin-vue` 6 — for any module that uses Vue 3 SFCs (currently none, but the harness is wired).
- `@driver-digital/vite-plugin-shopify-clean` 1 — prunes stale `juo-*.{js,css}` from `dist/assets` so old hashed bundles don't pile up.
- `chokidar`, `minimatch`, `fs-extra` — used by `sync-theme.js` to mirror theme layers into `dist`.
- `@shopify/cli` 3.88 — pull/push/dev against the connected store.
- `@shopify/prettier-plugin-liquid` 1.10 + `prettier` 2.8 + `eslint` 8 — lint pipeline.
- `husky` + `lint-staged` — pre-commit lints `*.js` files only.
- `vue` 3.5, `zod` 3.22, `sass` 1.70 — available to modules.

<!-- MANUAL: Notes added below are preserved on regeneration. -->
