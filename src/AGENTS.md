<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-28 | Updated: 2026-05-28 -->

# src

## Purpose

Active build input. Vite's Shopify plugin discovers entrypoints under `src/modules/*/index.{ts,js,vue,ce.ts,scss}`, bundles them, and emits `juo-<module>.js` + matching CSS into `dist/assets/`. Anything outside `src/` is either theme content (copied verbatim by `syncThemePlugin`) or build tooling.

## Key Files

| File           | Description                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `globals.d.ts` | Ambient TS declaration for `window.Shopify.routes.root`. Picked up by every module's TS without per-module redeclaration. |

## Subdirectories

| Directory  | Purpose                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/` | Enabled modules. Empty by default (contains only `.gitkeep`) — operators populate it by copying from the top-level `modules/` library. |
| `utils/`   | Small shared utilities consumable by any module (see `utils/AGENTS.md`).                                                               |
| `assets/`  | Shared SCSS partials (currently `_reset.scss`). Importable from any module's SCSS.                                                     |

## For AI Agents

### Working In This Directory

- **`src/modules/` is the build allowlist.** A module under `modules/` will not ship unless it has been copied here.
- When asked to "enable module X", `cp -r modules/X src/modules/X` (or instruct the operator to do so), then restart `pnpm run dev`.
- When fixing a bug in an installed module, decide whether the fix belongs in `src/modules/<X>/` (this store only) or `modules/<X>/` (the library, so future stores get it). Default is to fix in `modules/` and re-copy.
- Do not commit large binary assets to `src/assets/`. Module-owned static assets (logos etc.) belong in `modules/<X>/theme/assets/`.
- **Add new ambient globals to `globals.d.ts`, not to per-module `types.ts`.** Some modules still inline a `declare global` block from before `globals.d.ts` existed — when you touch one, prefer relying on the shared declaration.

### Common Patterns

- Module SCSS imports `src/assets/_reset.scss` when it needs a baseline reset.
- Utilities in `utils/` are framework-free TS — they should run inside any module bundle without extra deps.
- Vite's `rollupOptions.output.entryFileNames` renames bundles to `juo-<module>.js` based on the `src/modules/<name>/` segment.

## Dependencies

### Internal

- Consumes module sources from [[modules]] indirectly (operators copy them in).

### External

- `vite-plugin-shopify` watches `additionalEntrypoints` and emits `juo-tag.liquid` snippet that module Liquid uses to mount the bundle.

<!-- MANUAL: -->
