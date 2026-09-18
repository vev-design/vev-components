# CLAUDE.md — image-compare

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

A before/after image slider with a draggable divider, optional auto-animation, and per-image focal-point control. 1,340 lines, of which 781 are a vendored copy of a third-party library.

- Vev key: `GU0zc8M8kKaWPnYZgcFq`
- Registered name: `ImageCompare` (no space)
- Entry: `src/ImageCompare.tsx` — only 311 lines; most of the package is vendored code and the editor UI.

## `src/react-compare-slider/` is vendored, not a dependency

Eight files copied wholesale from the `react-compare-slider` package in commit `4b13345` ("copy react-image-copare to source"). It is **not** in `package.json` — the only runtime deps are `@vev/react`, `@vev/silke`, and `react`.

Treat it as third-party code:

- Do not refactor it to match repo style.
- Do not add Vev-specific logic inside it — keep that in `ImageCompare.tsx`.
- Upstream fixes must be ported by hand; there is no version pin recording which release this came from.

The parts that matter to the wrapper: `position` (percentage, controlled), `transition` (CSS shorthand applied to handle movement), `portrait` (orientation), `handle` (a custom node), `itemOne`/`itemTwo`.

## Orientation naming is inverted

The editor prop is `horizontal`, and it is passed straight through as `portrait`:

```tsx
portrait={horizontal}
```

In the vendored library, `portrait: true` means a **vertical** divider split — top/bottom. So enabling the prop named "horizontal" produces a top/bottom comparison. The names disagree at every layer; check which one you are looking at before changing behaviour.

## Animation

When `animation.animate` is on, a `setInterval` moves the divider every `interval` seconds (`ImageCompare.tsx:103-119`):

- `endToEnd` alternates between 10% and 90% via `cycleRef`.
- `random` picks `Math.random() * 25 + 40`, so 40–65% — a much narrower swing than the name suggests.

`animation.speed` is not a rate; it becomes the CSS transition duration (`${speed}s ease-in-out`). Without animation the transition is a fixed `.3s ease-in-out`.

**Animation stops permanently on first interaction.** Both `onClick` and `onMouseEnter` on the wrapper call `disableAnimationHandler`, which sets `disableAnimation` and resets the divider to `initialPosition` (`ImageCompare.tsx:121-131`). There is no path that re-enables it — a single mouse-over kills the animation for the lifetime of the component. That is intentional (hand control to the user), but note it also fires on an incidental hover.

## Focal points

Images are not plain `image` props. Each uses a custom `ObjectFitEditor` (`src/object-fit-editor.tsx`) built from `@vev/silke`, which opens the Vev image library via `context.actions.imageLibraryOpen` and stores `{ key, url, xPercent, yPercent }`. The percentages become CSS `object-position` on the `<img>`.

`src/background-editor/background-editor.tsx` is the draggable focal-point picker used inside that popover.

## Known bugs

1. **A debug `console.log('yoooo')` runs on every render** (`ImageCompare.tsx:101`).
2. **The right image's editor is passed `name="left"`** (`ImageCompare.tsx:199`), a copy-paste slip from the left field above it. `ObjectFitEditor` currently destructures only `title`, `context`, `onChange`, `value` and ignores `name`, so it is harmless today — but it will bite the moment `name` is used.

## Working on this

```bash
cd image-compare
yarn install
vev start
```

Verify:

1. Drag the divider in both orientations — remember `horizontal` gives you the portrait split.
2. Both animation types, and confirm the divider snaps back to `initialPosition` on first hover.
3. Focal point adjustment on each image, which is editor-only UI.
4. Safari specifically — commit `b2e815d` was a Safari-only arrow rendering fix.
