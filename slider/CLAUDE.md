# CLAUDE.md — slider

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Slider"**; the exported component is `Slideshow`. It holds Vev child blocks as slides and swaps between them with one of five animations. 1,103 lines.

- Vev key: `4m4woXHPJqnEyfmHuuf1`
- Entry: `src/Slider.tsx` — dispatch and state only; each animation is a self-contained renderer.

## State lives in Vev global state, not React state

```ts
const [state, setState] = useGlobalState();   // { index, length, action }
```

This is deliberate. Navigation widgets elsewhere on the page — arrows, dot indicators, counters — read `index` and `length` from the same global state. Moving this to `useState` would silently break every external control.

`action: 'NEXT' | 'PREV'` is part of the state because direction cannot be inferred from an index change when the slider wraps (index 4 → 0 is forward; 0 → 4 is backward). `isGoingForward` in `src/utils.ts:16-28` needs it for the two-slide case, where both directions produce the same index change.

## Animation renderers

`src/Slider.tsx:172-180` maps `animation` to a component: `slide` → `Slide/`, `fade` → `Fade/`, `zoom` → `Zoom/`, `3d` → `Carousel3d/`, `none` → `None/`. Each receives the full props plus `slides`, `index`, `speed`, `action`, `editMode`, `transitionEnd`.

Several editor props are renderer-specific and hidden otherwise: `gap` and `perspective` (3d only), `scaleFactor` (zoom only), `slidesToLoad` and `shrinkFactorBeforeAfter` (slide only).

## The `Slide` renderer is the complicated one

`Slide/Slide.tsx` implements the classic windowed carousel:

1. Build a window of `2 * slidesToLoad + 1` slide keys centred on the current index (`setSlides`, `:57-77`).
2. Lay them out side by side with `translateX(100i%)`, and offset the track so the centre slide is visible.
3. To advance, animate the track to `move: -200` (or `0` going back) with the configured duration.
4. On `transitionEnd`, set `transitionSpeed` to **0**, snap `move` back to `-100`, and rebuild the window (`:135-142`).

Step 4 is the whole trick — the snap-back is invisible only because the transition duration is zeroed first. If you change the transition or the `onTransitionEnd` guard (`e.propertyName === 'transform'`), the carousel will visibly jump on every slide change.

Two details that look like bugs but are not:

- `tempId()` (`:14`) generates a throwaway React key for window positions that have no slide, which happens at the edges when `infinite` is off (`setSlides` writes `-1` there).
- `checkIfKeyIsDuplicatedInArray` (`:149`) suffixes keys with the index. When `slidesToLoad` approaches the slide count, the same slide key legitimately appears more than once in the window.

## Transition guard

`transitionInProgress()` (`Slider.tsx:68-71`) blocks `handleNextSlide` / `handlePrevSlide` while a transition runs — but **only for `slide`, `zoom`, and `fade`**. The `3d` and `none` renderers are deliberately excluded and can be re-triggered mid-animation.

`isTransitioning` is set by the navigation handlers and cleared by the renderer calling `transitionEnd()`. A renderer that never calls it will wedge the slider permanently after one slide change.

## Editor behaviour

- Transition speed is forced to **1ms** in the editor (`currentSpeed`, `Slider.tsx:160-163`), so slide changes appear instant while authoring.
- `random` shuffling is skipped in the editor (`:103-110`), so the author sees a stable order.
- The active slide follows `editor.activeContentChild` (`:80-93`), which syncs canvas selection to the visible slide.

## Known gaps

- **Swipe is horizontal-only.** `use-touch.ts` reads only `e.touches[0].clientX` and compares against a 50px threshold. The `VERTICAL` and `VERTICAL_REVERSE` directions exist but have no touch support.
- **The touch effect re-subscribes on every render.** Its dependency array includes `cb` (`use-touch.ts:54`), and `Slider.tsx:140-143` passes a fresh object literal each render, so all three listeners are removed and re-added continuously.
- **`getNextSlideIndex` / `getPrevSlideIndex` return `1` when there are fewer than two slides** (`utils.ts:10-14`) — an index that does not exist. Callers guard with `slides.length <= 1` before reaching it, so it is currently unreachable, but the functions are not safe on their own.

## Working on this

```bash
cd slider
yarn install
vev start
```

Verify each change against **all five animations** — they share almost no code, so a fix in one renderer does not carry over. Also test:

1. Two slides specifically. `isGoingForward` has a dedicated branch for `total === 2`.
2. `infinite` off, at both the first and last slide.
3. `slidesToLoad` greater than the slide count, which exercises the duplicate-key path.
4. Touch swipe on a real device or emulator, horizontal directions only.
5. An external widget bound to `NEXT` / `PREV` / `SET`, plus the `SLIDE_CHANGED` event — note `currentSlide` is **1-based** while `state.index` is 0-based.
