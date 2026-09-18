# CLAUDE.md — backgrounds/

Guidance for Claude Code when working on any of the 16 WebGL background components. See the repo root `CLAUDE.md` for monorepo-wide rules.

These components share one architecture, so they get one shared doc rather than 16 near-identical files. Everything below applies to all of them unless noted.

## The 16 components

`Iridescence` `Orb` `Particles` `Prism` `aurora` `color-bends` `faulty-terminal` `floating-lines` `galaxy` `gradient-blinds` `grid-distortion` `light-pillar` `light-rays` `liquid-ether` `prismatic-burst` `threads`

`backgrounds/MENU_IMAGES/` is editor thumbnails (`aurora.png`, `galaxy.jpg`, …), not a component.

## Deploy: manual only

**CI never deploys these.** The workflow reduces changed paths with `cut -d/ -f1`, which turns `backgrounds/aurora/src/Aurora.tsx` into `backgrounds` — a directory with no `vev.json`. The job logs `Skipping backgrounds` and exits successfully, so a merge looks green while nothing shipped.

After merging a change here, deploy by hand:

```bash
cd backgrounds/aurora
npm install --omit=dev
vev deploy --token "$VEV_DEPLOY_TOKEN"
```

Note that these components' `package.json` files define `login`, `init`, and `start` scripts but **no `deploy` script** — call the `vev` CLI directly.

## Shared architecture

```
backgrounds/<name>/src/
  <Name>.tsx            # React shell: canvas, observers, prop plumbing
  <name>-worker.ts      # WebGL renderer, runs off the main thread
  <Name>.module.css     # .wrapper / .canvas
  declarations.d.ts
```

The shell creates a `<canvas>` imperatively, hands it to a worker via `transferControlToOffscreen()`, and thereafter only sends messages. All GLSL, all rendering, and the entire rAF loop live in the worker. The React tree renders a single empty `<div ref={containerRef} className={styles.wrapper} />`.

The worker is imported with Vite's suffix:

```ts
import AuroraWorker from './aurora-worker?worker';
```

Every component guards on capability before doing any of this:

```ts
const supportsOffscreen =
  typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';
```

**There is no main-thread fallback.** When `supportsOffscreen` is false the component renders an empty div — no worker, no canvas content. That is the intended behaviour; do not add a fallback without discussing it.

### Message protocol

Parent → worker, as `{ type, data }`. The common set:

| type | when |
|---|---|
| `init` | once, with the transferred `OffscreenCanvas` in the transfer list |
| `props` | on every editor prop change |
| `resize` | from a `ResizeObserver` on the container |
| `start` / `stop` | run-loop control |
| `cleanup` | on unmount, immediately before `worker.terminate()` |
| `visibility` | from an `IntersectionObserver` — **only 7 of 16 honour it, see below** |

Pointer input has no shared name. Different components send `mouse`, `pointer`, `hover`, `pointerLeave`, `mouseLeave`, `pointerInside`, `left`, `right`. Check the specific worker's `self.onmessage` switch before adding a handler.

Worker → parent is a single `{ type: 'ready' }`. The shell waits for it before sending the first `props`/`resize`/`start`, because the GL context is not built until `init` completes.

A few components add their own: `grid-distortion` takes `image`, `liquid-ether` takes `palette`, `Particles` takes `rebuild`.

### Resolution capping

Most shells cap the backing-store size and force `dpr = 1`:

```ts
const MAX_WIDTH = 1440;
const MAX_HEIGHT = 900;
```

This is a deliberate performance trade — these are full-bleed backgrounds, so fragment cost dominates. Do not raise the cap or restore device pixel ratio without profiling on a retina laptop.

## Visibility pausing — inconsistent, know the state before you touch it

An offscreen background that keeps rendering burns GPU for nothing. Support is uneven:

| Component | Shell observes | Shell sends `visibility` | Worker handles it | Effective |
|---|---|---|---|---|
| aurora | yes | yes | yes | ✅ |
| color-bends | yes | yes | yes | ✅ |
| faulty-terminal | yes | yes | yes | ✅ |
| galaxy | yes | yes | yes | ✅ |
| grid-distortion | yes | yes | yes | ✅ |
| light-pillar | yes | yes | yes | ✅ |
| liquid-ether | yes | yes | yes | ✅ |
| light-rays | yes | no | n/a | ✅ (different strategy) |
| **Prism** | yes | **yes** | **no** | ❌ message ignored |
| **prismatic-burst** | yes | **yes** | **no** | ❌ message ignored |
| Iridescence | no | no | no | ❌ always renders |
| Orb | no | no | no | ❌ always renders |
| Particles | no | no | no | ❌ always renders |
| floating-lines | no | no | no | ❌ always renders |
| gradient-blinds | no | no | no | ❌ always renders |
| threads | no | no | no | ❌ always renders |

**`Prism` and `prismatic-burst` look correct from the shell but are not.** Both post `{ type: 'visibility' }`, and neither worker has a `case 'visibility'` — the message falls through the switch and is dropped silently. Fixing either one means adding the worker case, not touching the shell.

Two distinct strategies are in use, and they are not interchangeable:

- **Pause the draw** (aurora and most others) — the worker keeps its rAF loop alive and skips the GL work:
  ```ts
  function animate(ts: number) {
    if (!running) return;
    requestAnimationFrame(animate);
    if (!gl || !visible) return;   // still ticking, but no draw
    ...
  }
  ```
  State survives, resume is instant, a small per-frame cost remains.
- **Cancel the loop** (`grid-distortion`) — the worker tracks `rafId` and calls `cancelAnimationFrame`. Cheaper, but needs care that time deltas do not jump on resume.
- **Tear down entirely** (`light-rays`) — the shell gates worker *creation* on `isVisible` and its effect cleanup terminates the worker when the component scrolls out (`src/lightrays.tsx:100-194`). Cheapest when offscreen, but every re-entry recompiles shaders and loses all animation state.

When adding pausing to one of the six unsupported components, follow the aurora pattern unless the effect is expensive enough to justify `grid-distortion`'s.

## Editor integration

Props use `@vev/silke` for anything beyond a plain input. The recurring case is a multi-colour picker passed as `props[].component` — `aurora` builds one from `SilkeBox` + `SilkeColorPickerButton` + `SilkeTextSmall` (`aurora/src/Aurora.tsx:173-205`). Copy that rather than writing a new one.

Colours reach the worker as a `Float32Array` of normalised RGB triples, not hex strings — see `hexToRGB` / `flattenColorStops` (`aurora/src/Aurora.tsx:30-42`).

`editableCSS` typically exposes only `background` on `styles.wrapper`, since everything else is drawn in GL.

## Working on these

```bash
cd backgrounds/<name>
yarn install
vev start
```

Verify:

1. **Resize** the container — the `ResizeObserver` path and the resolution cap.
2. **Scroll it out of view and back** — check the pause actually takes effect, and that resuming does not jump or flash.
3. **Two instances on one page** — each must get its own worker and terminate cleanly.
4. **Unmount** — confirm `cleanup` is posted and `terminate()` runs; a leaked worker keeps a GL context alive, and browsers cap the number of live contexts.
5. Deploy manually. CI will not do it.
