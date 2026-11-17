# CLAUDE.md — labeled-image

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"LabeledImage"** (one word). An image with clickable hotspots placed on it, each optionally showing a caption on hover and emitting Vev events. Each hotspot can open its own popup frame.

- Vev key: `YLXsqsICfPkyhfnnrJA8`
- Entry: `src/labeled-image.tsx`; the runtime overlay is `src/label-overlay.tsx`; the editor UI is the three files under `src/form/`.

## The core problem: image space vs. container space

Labels are stored as **normalised coordinates in image space** — `{ pos: { x, y } }` where each is 0–1 (`src/types.ts`). They are rendered as absolutely positioned siblings of the `<img>`, so their pixel position depends on where the image actually paints inside its box.

`object-fit` is exposed through `editableCSS`, so the author can switch between `contain`, `cover`, and `fill` at will. `updateRect` in `label-overlay.tsx` therefore reads the computed `object-fit` and recomputes the rendered image rectangle for each case:

- `contain` — letterboxed, so one axis gets an offset and the other fills.
- `cover` — cropped, so the rendered box is *larger* than the container and offsets go negative.
- everything else (`fill`, `none`, `scale-down`) is treated as fill.

Final position is `offset + normalised * renderedSize`, then `translate(-50%, -50%)` centres each hotspot by its own size. **If you touch this math, test all three `object-fit` values against both a portrait and a landscape image** — the `imageAspect > containerAspect` branches invert between `contain` and `cover`.

## Popups

Each label can link to one child frame (`label.popup`, set with the editor's `childFrame` field). A click on a hotspot toggles its popup. In the editor, the frame open on the canvas (`activeContentChild`) is shown instead.

- **The popup is placed with padding on a layer at (0, 0), never with a transform.** The editor measures a child frame with `offsetLeft`/`offsetTop` against the component's top-left. With a transform, elements cannot be added to the frame on the canvas.
- **`placePopup` (`src/popup-placement.ts`) picks the side**: below, above, right, then left of the hotspot, and clamps the popup inside the component box. The popup must never cover its hotspot, or a second click lands on the popup and cannot close it. The popup and the hotspot are measured after render, since the popup size comes from the style panel.

## Gotchas

- **Do not centre hotspots by measuring them in `updateRect`.** It runs before the labels render, so a measured width stays at its default. This is why hotspots were once off by 12.5px and popups covered them. Use CSS (`translate(-50%, -50%)`).
- **Event payloads are 1-based, storage is 0-based.** Both `LABEL_CLICKED` and `LABEL_HOVER` dispatch `label.index + 1`.
- **`clearProps: ['labels']` on the image prop** (`labeled-image.tsx`) — replacing the image deliberately wipes all labels, because the coordinates would no longer mean anything. Do not remove this thinking it is a bug.
- **Label numbers only appear in the editor**: when the widget is selected with the Properties or Interactions tab open, or while a popup frame is edited (`showNumbers` in `labeled-image.tsx`). `interactionsOpen` is read from `useGlobalStore(state => state.rightPanelTab === 'addons')` — an editor internal that will break silently if the platform renames the tab.
- **The events file is `src/even-types.ts`**, not `event-types.ts`. The typo is in the filename and every import.

## Known bugs

1. **The initial measurement races image decode.** `updateRect` is first called from a bare `setTimeout(..., 50)` in `label-overlay.tsx` with no `img.onload` handler. If the image has not decoded by then, `naturalWidth`/`naturalHeight` are 0, `imageAspect` falls back to `1`, and every hotspot is positioned against the wrong rectangle. The `ResizeObserver` only recovers this if the element's box subsequently changes — which, for a fixed-size container, it does not.
2. **Duplicated `editableCSS` properties.** The "Caption" selector lists `margin`, `color`, `font-family`, and `font-size` twice each (`labeled-image.tsx`).

## Working on this

```bash
cd labeled-image
yarn install
vev start
```

Verify:

1. All three `object-fit` values, with both a portrait and a landscape source image.
2. Resize the container after placing labels — hotspots must track the image, not the box.
3. A custom hotspot component and the default `PlusIcon`. They share one render path but use different classes.
4. A slow-loading image (throttle the network) for bug 1.
5. Label numbering, which requires selecting the widget *and* opening the Properties or Interactions tab.
6. Popups: a hotspot near each edge, a second click closes the popup, and "Edit on canvas" lets you add elements to the frame.
