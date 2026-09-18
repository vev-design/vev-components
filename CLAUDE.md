# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A monorepo of React components ("widgets") for the Vev design platform. Each component is an independent package with its own `package.json`, `vev.json`, and `src/`. There is no root `package.json`, no workspace tool, and no shared build — components never import from each other.

**53 components in two tiers:**

- **37 top-level directories** — `video`, `forms`, `slider`, `lottie`, `embed-anything`, … Each has a `vev.json`.
- **16 under `backgrounds/`** — the WebGL background family. See `backgrounds/CLAUDE.md`; their deploy path differs (below).

`backgrounds/` itself is a grouping folder, not a component — it has no `vev.json`. `backgrounds/MENU_IMAGES/` holds editor thumbnails, not code.

## Commands

All commands run **from a component directory**, never from the root:

```bash
cd video
yarn install
vev start                              # dev server + opens the component in the Vev editor
vev deploy --token "$VEV_DEPLOY_TOKEN"
```

**Node:** v22.14.0 (`.nvmrc`).

**There is no root lint command.** The root has no `package.json`, and no component defines a `lint` script. ESLint and Prettier configs live at the root (`.eslintrc.json`, `.prettierrc`) and are applied by editors and by `npx eslint` run manually. Any instruction to run `yarn run lint` from the root is stale — it will fail.

**Lockfiles are gitignored** (`**/yarn.lock`, `**/package-lock.json` in `.gitignore`), and 34 of 53 components pin `@vev/react` as `"latest"`. Installs are therefore not reproducible across time. If a component suddenly breaks without a source change, suspect a transitive `@vev/react` bump before anything else.

## Deploy / CI

`.github/workflows/deploy-to-merge-to-main.yml` runs on push to `main`:

```bash
folders=$(git diff --name-only HEAD^ HEAD | cut -d/ -f1 | sort -u)
# for each folder with a vev.json: npm install --omit=dev && vev deploy
```

**`backgrounds/*` never auto-deploys.** `cut -d/ -f1` collapses `backgrounds/aurora/src/Aurora.tsx` to `backgrounds`, and `backgrounds/vev.json` does not exist, so the job logs `Skipping backgrounds (no vev.json)` and moves on. All 16 background components must be deployed by hand:

```bash
cd backgrounds/aurora && vev deploy --token "$VEV_DEPLOY_TOKEN"
```

Note also that CI uses `npm install --omit=dev` while local development uses `yarn install`.

## Component anatomy

```
<component>/
  package.json        # deps; scripts are thin `vev` CLI wrappers
  vev.json            # { "key": "<20-char id>" } — the platform identity. Never change an existing key.
  tsconfig.json       # es2020, jsx: react, typescript-plugin-css-modules
  src/
    Component.tsx
    Component.module.css
    declarations.d.ts # declare module '*.css' / '*.scss'
```

`vev.json` is usually just `key`. A few carry extra flags: `public`, `admin`, `shareWithAccount`, `devKey`.

**Dependencies actually in use:** `@vev/react` (all 53), `@vev/silke` (26 — editor-side UI for custom prop controls), `@vev/utils` (3 — `forms`, `forms-native`, `video-scroll`), `three` (3), `ogl` (2).

## Vev component pattern

```typescript
import { registerVevComponent, useEditorState, useVevEvent, useDispatchVevEvent } from '@vev/react';

registerVevComponent(MyComponent, {
  name: 'Component Name',
  props: [...],        // editor-configurable properties
  events: [...],       // events this component emits
  interactions: [...], // actions other components can trigger on it
  editableCSS: [...],  // CSS properties exposed to the style panel
  type: 'both',        // 'both' | 'section' | 'standard' | 'action'
});
```

### Conventions that recur across the repo

- **`hostRef`** is injected by the runtime, not declared as an editor prop. It points at the Vev host element. It can be `null` on the first render — several components poll it with `requestAnimationFrame` (see `backgrounds/aurora/src/Aurora.tsx:90-100`).
- **`useEditorState().disabled`** is `true` on the editor canvas. Components that run third-party code or heavy animation short-circuit here and render a placeholder instead. Anything gated this way must be verified in **preview or on a published page** — the editor canvas will not exercise it.
- **`useModel().key`** gives a per-instance id. Use it to scope `postMessage` traffic so two instances of the same component on one page do not cross-talk (`embed-anything/src/EmbedAnything.tsx:83`).
- **`editableCSS.selector`** must be a class the component actually renders. An inline `style` on the same element silently wins over the editable property.
- **`props[].hidden`** receives `context.value` — the other prop values. Typos here fail silently, since a missing key is `undefined` and therefore falsy.
- **Custom prop controls** are React components passed as `props[].component`, built from `@vev/silke` primitives (`SilkeBox`, `SilkeColorPickerButton`, `SilkeTextSmall`).

### Key hooks

| Hook | Purpose |
|---|---|
| `useEditorState()` | `{ disabled }` — editor canvas vs. live |
| `useVisible(ref)` | viewport visibility, for lazy/deferred rendering |
| `useModel()` | component model, incl. the per-instance `key` |
| `useVevEvent(type, handler)` | receive an interaction trigger |
| `useDispatchVevEvent()` | emit an event to other components |
| `useTracking()` | analytics |

## Component-level CLAUDE.md files

Components with non-obvious behaviour carry their own `CLAUDE.md`. Read it before editing that component:

- `embed-anything/CLAUDE.md` — three render modes, the iframe height race, script re-execution rules
- `backgrounds/CLAUDE.md` — the shared worker/OffscreenCanvas architecture for all 16 backgrounds

Thin wrappers deliberately have none. `typeform` is 39 lines around a single `<iframe src={url}>`; `scrollbar` is 33 lines around a div with `overflow: auto`. For those the source is shorter and clearer than any summary of it would be. Add a `CLAUDE.md` when a component has behaviour you cannot infer by reading it — a race condition, a platform quirk, a deliberate workaround — not as routine coverage.

## Code style

- ESLint + Prettier, config at repo root. Single quotes, trailing commas, 100-char width, unix line endings.
- CSS Modules (`*.module.css`). `typescript-plugin-css-modules` types them.
- `@typescript-eslint/no-explicit-any` is **off**; `no-unused-vars` is a warning with `^_` ignored.
- `eqeqeq`, `no-var`, `dot-notation`, `brace-style`, `padded-blocks: never` are errors.
- Blank line required after the import block.
