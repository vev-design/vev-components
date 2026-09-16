# CLAUDE.md — lottie

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Lottie Animation"**. Plays a Lottie/dotLottie file with optional runtime recolouring and four scroll-driven playback modes. 671 lines.

- Vev key: `amSNXqljPxnkz8hIZIh3`
- Deps: `@dotlottie/react-player`, `lottie-colorify`, `@vev/silke`
- Entry: `src/Lottie.tsx` (399 lines)

## `src/dotlottie-player.css` is a vendored file — do not delete it

It is a copy of `@dotlottie/react-player/dist/index.css` **with the bundled Karla `@font-face` removed**, because the Vev CLI build fails trying to resolve that font. The reason is recorded at `Lottie.tsx:21-22`. Importing the package's own CSS instead will break the build.

## Recolouring

Only applies to `application/json` files (`isJSON`, `Lottie.tsx:65`) — `.lottie` binaries are passed through untouched.

The flow (`Lottie.tsx:168-194`): fetch the JSON → `getColors()` enumerates every colour in the animation → each is matched against the `colors` prop → `colorify()` rewrites them → the result is passed to the player as an object rather than a URL.

`ColorPicker` (`src/components/ColorPicker/`) is the editor UI that enumerates the source colours so the author can map them.

**The fetch does not run at all when no colours are configured.** The guard is `colorsChanged && isJSON && fetchJson()`, where `colorsChanged = JSON.stringify(colors)` — and `JSON.stringify(undefined)` is `undefined`, which is falsy. That is the intended fast path; the player just loads the URL directly.

## Scroll modes

`scrollType` selects one of four progress calculations in `src/utils/scrollProgress.ts`, and the resulting 0–1 value drives `goToAndStop`:

| mode | source element | maths |
|---|---|---|
| `enterView` | this widget | `computeInViewProgress` — 0 as the top enters the viewport bottom, 1 as the bottom leaves the top |
| `timeline` | another widget by id | also `computeInViewProgress` — same maths, different element |
| `widget` | another widget by id | `computeWidgetProgress` — uses `offsetTop`, not `getBoundingClientRect` |
| `offset` | the page | `computeOffsetProgress` — absolute scroll between two pixel offsets |

Two things to know before changing these:

- **`computeWidgetProgress` is the odd one out.** It reads `element.offsetTop`, which is relative to the nearest positioned ancestor, while the other three work from `getBoundingClientRect() + scrollTop`, which is relative to the document. Inside a positioned Vev container the two disagree.
- **The playhead is deliberately capped at 99%** — `Math.min(totalFrames * progress, totalFrames * 0.99)` (`Lottie.tsx:97`). Landing on the exact final frame fires `complete`/`loop` events that would be spurious for scroll-driven playback.

When `scroll` is on, `autoplay` and `loop` are both forced off on the player (`:200-201`).

## Interactions: why `startPlayback` seeks first

A non-looping animation parks its playhead on the last frame when it finishes, and calling `play()` from there does nothing — which made the Play interaction appear to work only once. `startPlayback` (`Lottie.tsx:120-127`) therefore always seeks to the start frame for the given direction before playing. The `TOGGLE` handler has the same logic inline (`:153-161`), checking whether the frame is parked at either end.

The comment block at `:114-119` records this; keep it if you refactor.

## Gotchas

- **The player is remounted via `key`.** `<div key={`id-${scroll}-${autoplay}-${disabled}`}>` (`Lottie.tsx:198`) forces a full teardown when any of those three change, because `DotLottiePlayer` does not react to them as props. Removing the key makes toggling autoplay in the editor appear to do nothing.
- **`Events.LOADED` is declared but never used.** It is in the enum (`src/events.ts:6`), not in the registration's `events` list, and never dispatched.
- **`setJson(json)` in the no-override branch** (`Lottie.tsx:183`) sets state to its own current value — a no-op that was presumably meant to be `setJson(result)`. Harmless, because `src` falls back to the URL, but it means the fetch was wasted work.
- **`console.log('error', e)`** in the fetch catch (`:187`).

## Working on this

```bash
cd lottie
yarn install
vev start
```

Verify:

1. Both a `.json` and a `.lottie` file — recolouring only applies to the former.
2. All four scroll modes, and `widget`/`timeline` with the target inside a positioned container.
3. The Play interaction triggered **twice in a row** on a non-looping animation — that is the regression `startPlayback` exists to prevent.
4. Toggling autoplay and scroll in the editor, which relies on the remount key.
