# CLAUDE.md — object-3D

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

A three.js `.glb`/`.gltf` model viewer with orbit controls, HDRI lighting presets, clickable 3D hotspots, GLTF animation playback, and optional scroll-driven animation. 1,970 lines across 23 files.

- Vev key: `trQ35DZLjAWC0nWJxVvB`
- Deps: `three`, `@tweenjs/tween.js`, `@vev/silke`, `@vev/utils`
- Entry: `src/object-3d.tsx` — exports the shared `config: VevManifest`, which `legacy-support.tsx` reuses.

## Two registered components from one package

`src/object-3d.tsx` registers **"Object3D"**. `src/legacy-support.tsx` separately registers **"Object3D legacy"** with `overrideKey: 'threeModel'`, wrapping the same viewer behind the pre-rename prop names (`modelURL`, `posterURL`, flat `hotspots`).

Nothing imports `legacy-support.tsx` — the Vev CLI discovers every `registerVevComponent` call under `src/`. Deleting the file silently unregisters the legacy widget for existing published pages, so do not treat it as dead code.

**Known bug in the legacy path:** `convertToLegacySchema` renames `posterUrl` → `posterURL`, but the prop in `config` is actually named `poster` (`src/object-3d.tsx:259`). The rename never matches, so the legacy editor writes to `poster` while `mapOldProps` reads `props.posterURL?.url` — the legacy poster image is always `undefined`. Any change to prop names in `config` must be mirrored in `convertToLegacySchema`.

## Architecture

```
Object3d (src/object-3d.tsx)
  └─ Object3DContextProvider          # all state passes through context, not props
      └─ Object3dViewer               # owns the canvas + the rAF loop
          ├─ useModel(url, onProgress)        GLTF load
          ├─ useSceneSetup(...)               renderer, scene, camera, controls, mixer
          ├─ useCenterModel(...)              frame the model
          ├─ useScrollProgress(hostRef, ...)  scroll → ref (no re-render)
          ├─ useHotspotListener(...)          editor: click to place a hotspot
          ├─ useHotspots(...)                 CSS2D hotspot elements
          └─ useAnimationFrame(cb, enabled)   the single render loop
```

Hotspots are **not** 3D objects. They are DOM nodes positioned by three's `CSS2DRenderer`, whose `domElement` is prepended next to the canvas (`use-scene-setup.ts:148-151`). That is also the element `OrbitControls` binds to — not the canvas. Changing the DOM order there breaks pointer input.

## The render loop

One `useAnimationFrame` in `object-3d-viewer.tsx:87-122` drives everything: `controls.update()`, both renderers, the animation mixer, and `TWEEN.update()`.

It is gated on `!disabled || schemaOpen` — so the scene renders live on the published page, and in the editor **only while the properties panel is open**. A static canvas in the editor with the panel closed is expected behaviour, not a bug.

`useAnimationFrame` is a local reimplementation. The comment at `hooks/use-animation-frame.ts:5` explains why: this component runs in both the editor and the viewer, and the viewer-provided hook is not available in the editor.

## Camera, animation, and interactions

Vev interactions cannot call into the three.js scene directly, so the component uses an imperative callback registry. `object-3d.tsx:98-110` holds a `useRef` of five no-op functions; `useSceneSetup` replaces them via `eventCallbacks.*(cb)` (`use-scene-setup.ts:95-118`); `useVevEvent` handlers then invoke whatever is currently registered.

Interactions: `SELECT_HOTSPOT`, `START_ROTATION`, `STOP_ROTATION`, `RESET_CAMERA`, `PLAY_ANIMATION`. One event out: `HOTSPOT_CLICKED` with the hotspot index.

`playAnimation` (`use-scene-setup.ts:57-93`) cross-fades over 0.2s. Non-looping clips get `setDuration(1.4)` — a hard-coded override that ignores the clip's real length — and register a `finished` listener that fades back to the previous clip. That listener is added on **every** non-looping call and never removed, so repeated `PLAY_ANIMATION` interactions accumulate listeners on the mixer.

**Scroll-driven animation** replaces `mixer.update(delta)` with `mixer.setTime(progress * clipDuration)` (`object-3d-viewer.tsx:94-117`). Progress is remapped through the `scrollStart`/`scrollEnd` percentages, then smoothed with a frame-rate-independent exponential lerp (`1 - Math.exp(-8 * delta)`). `useScrollProgress` returns a **ref**, deliberately, so scrolling never re-renders React.

`scrollTarget: 'section'` resolves via `host.closest('.__section')` (`use-scroll-progress.ts:26`) — that class is a Vev runtime implementation detail and will silently fall back to the host element if the platform renames it.

## Loading

Two independent progress sources — the HDRI (`RGBELoader`) and the model (`useModel`) — are combined as `Math.min(light, model)`. The loading bar appears only after an 800ms delay, so fast loads never flash it. The CSS variable is set to `min - 1` percent (`object-3d-viewer.tsx:45`), which keeps the bar from visually completing before `isLoaded` flips.

## Known issues

- **The WebGL renderer is never disposed.** The only `dispose()` calls in the package are for `scene.environment`, the HDRI texture, and the `PMREMGenerator`. `renderer.dispose()`, geometry, and material disposal are all missing, so unmounting leaks a GL context. Browsers cap live contexts (~16), so a page cycling several instances will start failing to create new ones.
- **`is-hotspot-visible.ts` does not do what its imports suggest.** It declares a module-level `Raycaster` and `resultArr` that are never used, and takes a `scene: Group` parameter it ignores. The actual test is an angle comparison against the camera's forward vector, which dims back-facing hotspots to `opacity: 0.1` but does **not** detect occlusion by geometry.
- Hotspot visibility is recomputed by a 100ms `setInterval` (`object-3d-viewer.tsx:75-85`), not inside the render loop.

## Working on this

```bash
cd object-3D
yarn install
vev start
```

Verify:

1. In the editor **with the properties panel open** — otherwise the render loop is off and the canvas looks frozen.
2. Model swap, HDRI preset swap, and resize, each of which runs a separate effect in `use-scene-setup.ts`.
3. Hotspot placement in the editor, then hotspot clicks on a published page (different code paths: `useHotspotListener` vs `useHotspots`).
4. Scroll animation at all three `scrollTarget` values, with non-default `scrollStart`/`scrollEnd`.
5. The legacy widget, if you touched `config.props` — its prop mapping is positional by name and fails silently.
