# CLAUDE.md — object-3D

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

A three.js `.glb`/`.gltf` model viewer with orbit controls, HDRI lighting (presets or uploaded `.hdr`), clickable 3D hotspots, GLTF animation playback, scroll-driven animation and rotation, pointer tilt, and an optional ground shadow.

- Vev key: `trQ35DZLjAWC0nWJxVvB`
- Deps: `three` (pinned to 0.155.x by the caret), `@tweenjs/tween.js`, `@vev/silke`, `@vev/utils` (types only)
- Entry: `src/object-3d.tsx` — exports the shared `config: VevManifest`, which `legacy-support.tsx` reuses.

`react-dom` is pinned to `^18` in `package.json` only to satisfy `@vev/silke`'s peer dependency. Without it, `npm install` resolves `react-dom@19`, fails with `ERESOLVE`, and the CI deploy breaks.

## Two registered components from one package

`src/object-3d.tsx` registers **"Object3D"**. `src/legacy-support.tsx` separately registers **"Object3D legacy"** with `overrideKey: 'threeModel'`, wrapping the same viewer behind the pre-rename prop names (`modelURL`, `posterURL`, flat `hotspots`).

Nothing imports `legacy-support.tsx` — the Vev CLI discovers every `registerVevComponent` call under `src/`. Deleting the file silently unregisters the legacy widget for existing published pages, so do not treat it as dead code. `convertToLegacySchema` renames props by name; any rename in `config.props` must be mirrored there.

## Architecture

```
Object3d (src/object-3d.tsx)
  └─ Object3DContextProvider          # all state passes through context, not props
      └─ Object3dViewer               # owns the canvas, the render loop, loading UI
          ├─ useInView ×2                     loop gate (in view) + lazy-load gate (400px margin, latched)
          ├─ useSceneSetup(...)               renderer, scene, pivot, camera, controls, tween group
          ├─ useModel(url, renderer, near)    GLTF load (Draco/Meshopt/KTX2 via util/gltf-loader.ts)
          ├─ useSceneModel(pivot, gltf)       add/center/dispose model, mixer, playAnimation
          ├─ useCenterModel(...)              frame the camera, store the "home" camera for Reset
          ├─ useEnvironment(...)              HDRI → PMREM env map, optional background
          ├─ useGroundShadow(...)             ShadowMaterial floor + zero-intensity shadow light
          ├─ useHotspotListener(...)          editor: click to place a hotspot
          ├─ useHotspots(...)                 CSS2D hotspot <button>s, focus/zoom
          ├─ useScrollProgress / usePointerTilt   refs, no re-render
          └─ useAnimationFrame(cb, enabled)   the single render loop
```

The model and the hotspots are children of `pivot`, not of the scene. Scroll rotation and pointer tilt rotate the pivot, so hotspots stay attached to the model. New hotspot positions are stored in pivot-local space (`pivot.worldToLocal`).

Hotspots are **not** 3D objects. They are DOM `<button>`s positioned by three's `CSS2DRenderer`. Its element (`.labels`) is absolutely positioned on top of the canvas and is also the element `OrbitControls` binds to — not the canvas. Keep it above the canvas, or pointer input breaks. The poster and loading bar above it have `pointer-events: none`.

## The render loop

The scene renders **on demand**. `invalidate()` (created in the viewer, passed to every hook) marks the frame dirty. Each loop tick calls `controls.update()`, `tweens.update()`, and the mixer, and renders only if something changed: a controls `change` event, a running tween, a running animation, scroll/tilt pivot movement, or `invalidate()`.

The loop runs only while `(!disabled || schemaOpen) && inView`. When it is off (editor canvas with the panel closed, or off screen), `invalidate()` schedules a single rAF render instead, so the editor still shows a correct static frame.

`useAnimationFrame` is a local reimplementation (the viewer-provided hook is not available in the editor). It clamps `delta` to 0.1 s so a pause does not make animations jump.

## Camera, animation, and interactions

Vev interactions cannot call into the three.js scene directly, so the component uses an imperative callback registry. `object-3d.tsx` holds a `useRef` of five no-op functions; the hooks replace them via `eventCallbacks.*(cb)` on **every render** (effects without deps), so the callbacks never see stale state.

Interactions: `SELECT_HOTSPOT`, `START_ROTATION`, `STOP_ROTATION`, `RESET_CAMERA`, `PLAY_ANIMATION`. Events out: `HOTSPOT_CLICKED` (index), `MODEL_LOADED`, `ANIMATION_FINISHED` (clip name).

- Camera moves go through `util/animate-camera.ts`, which orbits around `controls.target` (shortest way round) instead of moving in a straight line through the model. Each instance has its own tween group.
- `RESET_CAMERA` returns to `home` — the saved initial camera, or the auto-framed position.
- Auto-rotate pauses while the user drags and resumes 2 s after release. It is off under `prefers-reduced-motion`.
- `playAnimation` (`use-scene-model.ts`) cross-fades over 0.2 s. A one-shot clip (`loop: false`) plays `repetitions` times at its real length, clamps, and fades back to the last looping clip. One `finished` listener per mixer handles this. "No animation" (or any unknown name) fades the current clip out.
- **Scroll-driven animation** replaces `mixer.update(delta)` with `mixer.setTime(...)`. The time is clamped to `duration - 0.001`: at exactly `duration`, a `LoopRepeat` action wraps back to frame 0.

`scrollTarget: 'section'` resolves via `host.closest('.__section')` (`use-scroll-progress.ts`) — a Vev runtime implementation detail that silently falls back to the host element if the platform renames it.

Camera framing uses `FRAMING_DISTANCE = 2.053` (`use-center-model.ts`). That number reproduces an old degrees/radians mix-up, so that published pages keep their framing. Do not "fix" it to the textbook formula.

## Loading

The model and HDRI load only when the widget is within 400px of the viewport. The poster shows until both are ready, and stays if the model fails to load. The loading bar appears only after 800ms and only while loading. `useEnvironment` latches `ready` after the first HDRI, so a lighting change does not bring the poster back.

`getAnimations` (editor dropdowns) reads only the glTF JSON. For `.glb` it uses two HTTP range requests, and falls back to a full fetch. Results are cached per URL.

Compressed models need the Draco/Basis decoders. They are loaded from jsDelivr at the installed three revision (`util/gltf-loader.ts`), and shared by all instances.

## Disposal

`useSceneSetup` disposes controls and renderer and calls `forceContextLoss()` on unmount. Browsers allow only ~16 live WebGL contexts, and the editor modals create a viewer each time they open. `useSceneModel` disposes a model's geometries, materials and textures when it is replaced or unmounted.

## Known issues

- three r155's `FileLoader` does not handle a stream error mid-download (`readData()` has no rejection handler). If the connection drops during a model download, `onError` never fires and the loading bar stays. A three upgrade (r158+) fixes it.
- The default model (`defaultModel.url`) is on `devcdn.vev.design`. It is not on the production CDN.
- Hotspot dimming is an angle test against the camera direction. It does not detect occlusion by geometry.

## Working on this

```bash
cd object-3D
npm install
vev start
```

Verify:

1. In the editor **with the properties panel open** — otherwise the loop is off and only invalidated frames render.
2. Model swap, HDRI preset swap, custom HDRI, exposure, background, ground shadow, and resize.
3. Hotspot placement in the editor (`useHotspotListener`), then hotspot clicks and keyboard Enter on a published page (`useHotspots`).
4. Scroll animation and scroll rotation at all three `scrollTarget` values, with non-default `scrollStart`/`scrollEnd`.
5. The legacy widget, if you touched `config.props` — its prop mapping is by name and fails silently.
