# CLAUDE.md — scrolling-slides

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Scrollytelling"** (not "Scrolling Slides" — grep for the display name will miss it). It takes Vev child blocks and animates transitions between them as the page scrolls. 3,398 lines across 40 files, the largest component in the repo.

- Vev key: `d4C9FTH9nDHZcMZLFXpO`
- Entry: `src/components/scrolling-slides/ScrollingSlide.tsx`
- `transform: { height: 'auto' }` in the registration — the component sizes itself; scroll length comes from the section's height.

## The core mechanism: scroll-driven Web Animations

This component does **not** run a scroll listener to drive animation on the live site. It builds a native `ViewTimeline` and hands it to `element.animate()` with `rangeStart`/`rangeEnd`. The browser drives everything off the compositor.

```
ScrollingSlide
  └─ useViewTimeline(ref)            → new ViewTimeline({ axis: 'block', subject: el })
      └─ passed down to each slide
          └─ AnimatedSlide
              └─ useViewAnimation(ref, keyframes, timeline, ..., fromOffset, toOffset)
                  → el.animate(keyframes, { timeline, rangeStart, rangeEnd, duration: 'auto' })
```

**The `ViewTimeline` polyfill is loaded by the host app, not by this package.** `src/hooks/use-view-timeline.ts:24` notes this. The polyfill has a known Safari bug producing "non-finite" errors (flackr/scroll-timeline#205), which is why both `useViewTimeline` and `useViewAnimation` wrap their calls in `try`/`catch` and swallow failures. Those empty catch blocks are deliberate — do not "fix" them into throws.

Guards that must stay in `useViewAnimation` (`src/hooks/use-view-animation.ts:18-25`): `el.parentElement` exists, `el instanceof Element`, `el.isConnected`. The polyfill calls `getComputedStyle` on the subject and crashes on detached nodes.

## Offset math — the hard part

Each slide animates over a slice of the timeline. For slide `index` of `slideCount`, with `transitionCount = slideCount - 1`, the base window is `[(index-1)/transitionCount, index/transitionCount]`. `AnimatedSlide` (`slide/AnimatedSlide.tsx:32-90`) then rewrites that window based on whether the slide owns its in-transition, its out-transition, or both.

`ownsIn` / `ownsOut` come from `buildModel` in `ScrollingSlide.tsx:161-175`. When neighbouring gaps use *different* transition types, only one of the two adjacent slides can own the animation — the other sets `disableAnimation`. Get this wrong and you get double-animated or frozen slides at the boundary.

**Edge proximity re-mapping** (`use-view-animation.ts:34-99`) is the subtlest code here. The `contain` range can extend past the available scroll when the element sits near the top or bottom of the page. In that case the hook switches to the `cover` range and recomputes offsets through absolute scroll positions, so percentages stay inside 0–100%. `calculateScrollAnimationOffset` (`src/utils/calculations.ts`) handles the separate small-element (`height < windowHeight`) and large-element cases. Changing either function without testing a slide block at the very top and the very bottom of a page will break one of them.

## Transition system

A transition is a `TransitionValue`: `{ primary, effects }`. `resolveTransition` (`src/components/fields/Transition.tsx:308`) turns that into `{ type, settings }`, where `type` selects a React component from `SLIDE_COMPONENT` and `settings` are per-effect parameters.

Twelve slide components in `src/components/scrolling-slides/slide/`: `fade`, `reveal`, `scroll`, `stack`, `mask`, `custom`, `none`, `flip`, `cube`, `coverflow`, `swing`, `zoom`. Most extend `AnimatedSlide`, which extends `BaseSlide` (renders `<WidgetNode id={id} />`).

Two mappings that are not one-to-one:

- The editor's `3d` primary expands to `flip` or `cube` plus a direction setting (`Transition.tsx:316-327`). `flip-vertical` is *not* a component; it is `flip` + `settings.flipDirection = 'vertical'`.
- `blur` and `zoom` write to different setting keys for `scroll` than for everything else (`blurScroll` / `zoomScroll` vs `blur` / `zoom`, `Transition.tsx:340-348`).

`SLIDE_LAYOUT` maps every type to `'grid'` (`ScrollingSlide.tsx:55-68`). The `'row'`/`'column'` variants and the `|| 'row'` fallback at line 138 are currently unreachable.

## Editor mode

`useSlideEditMode` (`src/hooks/use-slide-edit-mode.ts`) only runs when `disabled && activeContentChild && children.length > 1` — that is, inside the editor with a slide selected. It scroll-snaps the page so the selected slide is the visible one, and reports scroll-driven slide changes back via `onRequestActiveContentChange`.

Editor-specific behaviour elsewhere:

- Easing is forced to `linear` in the editor (`ScrollingSlide.tsx:107`) so scroll position maps linearly to slide index.
- `onScrollAnimationFinished` nudges `element.style.width` by 0.1px and resets it 200ms later (`use-slide-edit-mode.ts:96-105`). This is a deliberate hack to force the editor to recompute the selection frame. It looks like dead code; it is not.
- Ancestors with `overflow: hidden` are rewritten to `overflow: clip` on mount (`ScrollingSlide.tsx:120-130`), because `hidden` creates a scroll container that breaks the view timeline. The walk starts from the shadow root host.
- The inner `<w>` element gets `z-index: 1` so slides do not paint over sibling children.

**Known dead branch:** `use-slide-edit-mode.ts:126-133` tests `!isPreviewingContentChildren` in the outer `if` and then branches on `isPreviewingContentChildren` inside it, so the `else` (preview-mount snap to the external active child) can never run. Preview mounts fall through to the plain `scrollToSlide()` path instead.

## Insufficient scroll

If `document.body.scrollHeight <= window.innerHeight` there is no scroll to animate against. The component then renders exactly one slide (`forceVisibleIndex`, `ScrollingSlide.tsx:110-114`) and, in the editor, overlays the warning "Greater scroll length is required." Note the overlay condition uses `<` while `insufficientScroll` uses `<=`, so at exactly one viewport height the component force-shows a single slide without showing the warning.

## Working on this

```bash
cd scrolling-slides
yarn install
vev start
```

Verify on a **published or preview page**, and always test:

1. A block at the top of the page, in the middle, and at the bottom — these take three different code paths in `useViewAnimation`.
2. Mixed transition types on adjacent gaps, to exercise `ownsIn` / `ownsOut`.
3. A page shorter than the viewport, for the `insufficientScroll` path.
4. Safari specifically — the polyfill fails differently there than in Chrome, which has native `ViewTimeline`.
5. In-editor slide selection and scroll snapping, which is a separate code path from the live site.
