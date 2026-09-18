# CLAUDE.md — labeled-image

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"LabeledImage"** (one word). An image with clickable hotspots placed on it, each optionally showing a caption on hover and emitting Vev events. 739 lines.

- Vev key: `YLXsqsICfPkyhfnnrJA8`
- Entry: `src/labeled-image.tsx`; the runtime overlay is `src/label-overlay.tsx`; the editor UI is the three files under `src/form/`.

## The core problem: image space vs. container space

Labels are stored as **normalised coordinates in image space** — `{ pos: { x, y } }` where each is 0–1 (`src/types.ts`). They are rendered as absolutely positioned siblings of the `<img>`, so their pixel position depends on where the image actually paints inside its box.

`object-fit` is exposed through `editableCSS`, so the author can switch between `contain`, `cover`, and `fill` at will. `updateRect` (`label-overlay.tsx:35-91`) therefore reads the computed `object-fit` and recomputes the rendered image rectangle for each case:

- `contain` — letterboxed, so one axis gets an offset and the other fills.
- `cover` — cropped, so the rendered box is *larger* than the container and offsets go negative.
- everything else (`fill`, `none`, `scale-down`) is treated as fill.

Final position is `offset + normalised * renderedSize - labelWidth / 2`. **If you touch this math, test all three `object-fit` values against both a portrait and a landscape image** — the `imageAspect > containerAspect` branches invert between `contain` and `cover`.

## Two render branches

`LabelOverlay` returns one of two nearly identical trees: one for a `customHotspot` (a Vev main component rendered via `WidgetNode`) and one for the built-in `PlusIcon` (`label-overlay.tsx:104-186`). The ~45 lines of positioning, hover, and click handling are duplicated verbatim. A fix applied to one branch and not the other will be silently half-applied.

## Gotchas

- **Hotspot width is measured from the first label only.** `ref={index === 0 ? labelRef : null}` — that single measurement becomes `labelWidth` and is used to centre *every* hotspot. With a fixed-size `PlusIcon` this is fine; with a `customHotspot` whose size varies per instance, all but the first are mis-centred.
- **Event payloads are 1-based, storage is 0-based.** Both `LABEL_CLICKED` and `LABEL_HOVER` dispatch `label.index + 1`.
- **`clearProps: ['labels']` on the image prop** (`labeled-image.tsx:54`) — replacing the image deliberately wipes all labels, because the coordinates would no longer mean anything. Do not remove this thinking it is a bug.
- **Label numbers only appear under three simultaneous conditions**: `selected && interactionsOpen && disabled` (`labeled-image.tsx:23`). `interactionsOpen` is read from `useGlobalStore(state => state.rightPanelTab === 'addons')` — an editor internal that will break silently if the platform renames the tab.
- **The events file is `src/even-types.ts`**, not `event-types.ts`. The typo is in the filename and every import.

## Known bugs

1. **The initial measurement races image decode.** `updateRect` is first called from a bare `setTimeout(..., 50)` (`label-overlay.tsx:93`) with no `img.onload` handler. If the image has not decoded by then, `naturalWidth`/`naturalHeight` are 0, `imageAspect` falls back to `1`, and every hotspot is positioned against the wrong rectangle. The `ResizeObserver` only recovers this if the element's box subsequently changes — which, for a fixed-size container, it does not.
2. **Duplicated `editableCSS` properties.** The "Label" selector lists `margin`, `color`, `font-family`, and `font-size` twice each (`labeled-image.tsx:117-140`).

## Working on this

```bash
cd labeled-image
yarn install
vev start
```

Verify:

1. All three `object-fit` values, with both a portrait and a landscape source image.
2. Resize the container after placing labels — hotspots must track the image, not the box.
3. A custom hotspot component alongside the default `PlusIcon`, since they are separate render paths.
4. A slow-loading image (throttle the network) for bug 1.
5. Label numbering, which requires selecting the widget *and* opening the interactions panel.
