# CLAUDE.md — 3d-parallax

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Layered Parallax"** — the directory name `3d-parallax` and the exported `Parallax3D` both differ from what authors see. Vev child blocks become stacked layers that move at different rates in response to scroll or mouse. 659 lines.

- Vev key: `c0Nw2YodHK3` — note this is 11 characters, not the 20 used everywhere else in the repo.
- `src/3DParallax.tsx` — runtime; `src/LayerField.tsx` — the per-layer editor UI.
- `transform: { height: 'auto' }` in the registration.

**This file uses double quotes.** The repo's Prettier config sets `singleQuote: true`, so the whole file is out of style. Leave it or reformat it wholesale — do not mix.

## How layers move

Each child renders into a positioned `<div>` whose `zIndex` is its index. Transforms are written **directly to `el.style.transform`**, never through React state (`renderTransform`, `3DParallax.tsx:87-119`). Layer speed comes from `layerSettings[index].speed`, falling back to `defaultSpeedForLayer(index, count)` from `LayerField.tsx:37`.

`MAX_DISPLACEMENT_PX = 50` is the full-deflection travel. In `scroll` mode only Y moves; in `mouse` mode both axes do.

`autoScale` compensates for the gap a moving layer would expose at its edges — `calculateAutoScale` (`:47-60`) scales the layer up by enough to cover twice the maximum displacement on the larger axis. Turning it off will reveal background at the extremes of travel.

## Smoothing, and a ref with two jobs

`smoothing` selects a per-frame lerp factor (`SMOOTHING_FACTORS`, `:25-30`); `none` means apply immediately with no loop at all.

**`smoothRafRef` is reused for two unrelated purposes**, and this is the easiest thing to break here:

- When `smoothing !== 'none'`, it holds the handle of the lerp loop, and `startSmoothLoop` early-returns if it is non-null so only one loop ever runs (`:131`).
- When `smoothing === 'none'`, `handleScroll` uses the same ref as a **throttle token** — set it, do the work in a rAF, then null it (`:273-278`).

The two never overlap because the `smoothing` check gates them, but any refactor that makes them coexist will deadlock the lerp loop or drop scroll updates. Consider splitting the ref if you touch this.

`LERP_EPSILON = 0.001` stops the loop by snapping to the target, so it does not spin forever on sub-pixel differences.

## Editor behaviour

Live input is disabled entirely in the editor (`:281-282`). Instead:

- **A preview animation plays automatically.** After a 150ms debounce, a 2000ms cycle runs once: a full circle in `mouse` mode, a sine-eased 0→1→0 sweep in `scroll` mode (`:196-227`). It re-triggers whenever `layerSettings` or `mode` changes, so the author sees the effect of an edit immediately. The preview writes transforms directly and **bypasses smoothing** on purpose — the comment at `:210` says so.
- **Non-selected layers dim to 20% opacity** while a child is selected (`INACTIVE_LAYER_OPACITY`, `:322-327`), and the selected layer's transform is cleared so it sits at rest while being edited (`:92-99`).

## Working on this

```bash
cd 3d-parallax
yarn install
vev start
```

Verify:

1. Both modes, at all four smoothing levels — `none` takes a different code path from the other three.
2. `autoScale` on and off, with a layer whose speed is high enough to expose an edge.
3. In the editor: select a child and confirm the others dim and the preview replays after each speed change.
4. On a published page, confirm no rAF loop keeps running once motion settles — the epsilon snap should end it.
