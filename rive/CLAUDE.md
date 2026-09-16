# CLAUDE.md — rive

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Rive"**. Renders a `.riv` animation on a canvas, with state-machine input control exposed as Vev interactions. 475 lines.

- Vev key: `t9Le0A7rJGHr5eSELDQO`
- Dep: `@rive-app/canvas`
- `src/Rive.tsx` — component and registration; `src/util.ts` — file introspection and a debounce; `src/types.ts` — the shape of `RiveFileContents`

## Editor prop chaining

Three props form a dependency chain, each hidden until the previous one is set:

```
file  →  artboard  →  statemachine
```

`file` declares `clearProps: ['artboard', 'statemachine']` and `artboard` declares `clearProps: ['statemachine']`, so changing an upstream value wipes the downstream selections rather than leaving a stale, invalid name.

The dropdown options come from `getRiveContent` (`util.ts:4-22`), which **instantiates a whole throwaway Rive runtime on a detached canvas** just to read `riveCanvas.contents`, then cleans it up. This runs inside the `async items()` callbacks, so opening either dropdown downloads and parses the `.riv` file again — once per dropdown, uncached.

## State machine inputs

`FIRE_INPUT` is the interesting interaction (`Rive.tsx:104-134`). The `input` argument arrives as a **JSON string** that is parsed to `{ name, type }`, then matched against `stateMachineInputs(statemachine)`. The payload carries three differently typed value fields and the parsed `type` selects which applies:

- `Trigger` → `inputObj.fire()`
- `Number` → `inputObj.value = args.input_number`
- `Boolean` → `args.input_boolean`, or a toggle of the current value when `input_boolean_toggle` is set

There is no guard on `inputObj` being found, so an input name that no longer exists in the file throws.

## Teardown is three calls, twice

Rive requires `cleanup()`, `deleteRiveRenderer()`, and `cleanupInstances()` — all three. They appear both at the **top** of the setup effect (disposing the previous instance before building a new one, `Rive.tsx:32-38`) and in its cleanup function (`:75-85`). Both are needed: the effect re-runs on prop changes without unmounting.

When `file` is cleared the canvas is wiped manually with `clearRect(0, 0, 10000, 10000)` (`:42`) — a deliberately oversized rectangle rather than the canvas dimensions.

## Gotchas

- **Resize uses `debounce(fn, 0)`** (`:67`). A zero-delay debounce still defers to the next macrotask and collapses a burst of `ResizeObserver` callbacks into one — it is not a no-op, and removing it causes redundant surface resizes during drag.
- **`layout` is in the effect's dependency array** (`:86`) and is an object prop, so a new object identity from the editor rebuilds the entire Rive instance rather than just updating the layout.
- **`events.ts` declares `COMPLETE` and `LOADED`** in the `Events` enum, but the component never dispatches them and the registration has no `events` list.
- **`scrollEnabled` maps to Rive's `isTouchScrollEnabled`** — it controls whether touch gestures over the canvas scroll the page, not whether the animation responds to scroll.
- The `url` prop in the `Props` type is unused; only `file.url` is read.

## Working on this

```bash
cd rive
yarn install
vev start
```

Verify:

1. Swapping the file, then the artboard — the downstream dropdowns must clear, and the dropdowns re-download the file each time they open.
2. `FIRE_INPUT` with each of the three input types, including the boolean toggle.
3. Resizing the widget, which exercises the debounced surface resize.
4. Clearing the file in the editor, which takes the manual `clearRect` path.
