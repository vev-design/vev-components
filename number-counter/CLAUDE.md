# CLAUDE.md — number-counter

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Number Counter"**. Animates a number from `start` to `end` when it scrolls into view or when an interaction fires. 499 lines, essentially all in `src/NumberCounter.tsx`.

- Vev key: `meZ0cWu9f8303wkBQhom`
- `src/math-utils.ts` — three easing functions plus `round`/`normalize`
- `src/events.ts` — one event (`COMPLETE`), four interactions (`START`, `STOP`, `RESET`, `STOP_AND_RESET`)

## The animation loop

`useFrame` drives it (`NumberCounter.tsx:118-172`), with `[hasStarted, startedTimestamp]` as its dependency array. The first frame after start records `startedTimestamp`; subsequent frames compute `normalize(now - started, 0, animationLength * 1000)` and pass that through the selected easing.

Completion is tested against **`oneIsh = 0.999999`**, not `1` (`:39`, `:147`). The comment calls it a "floating point hack" — `easeOut` never returns exactly 1 for inputs below 1, so an exact comparison would overshoot the animation by a frame or never fire. `round()` in `math-utils.ts` similarly fixes everything to 6 decimal places.

Looping does not restart the timeline cleanly — it calls `resetCounter()` then immediately `setHasStarted(true)` (`:152-155`), and dispatches `COMPLETE` on every cycle, not just the last.

## Four effects all call `resetCounter()`

This is the fragile part. `NumberCounter.tsx:174-233` contains four `useEffect` blocks that each reset the counter under overlapping conditions:

1. `[settings, animation, disabled]` — resets when `start` or `end` changes, comparing against a `previousSettings` ref. This exists so switching Vev **variants** re-runs the count.
2. `[isVisible, disabled]` — the scroll trigger; resets on both entering *and* leaving the viewport.
3. `[actualDelay, isVisible, disabled, actualSchemaOpen, disabled]` — clears `finished` when the editor is idle. Note `disabled` appears **twice** in this array.
4. An eleven-entry array covering every visual prop — restarts the preview when anything is edited. `actualDelay` appears **twice** here too.

They interact. Before changing any one of them, work out which others also fire for the same trigger — several combinations reset the counter two or three times in a row. Each also schedules a bare `setTimeout` with no cleanup, so editing props quickly queues multiple pending starts.

## Known bug: the delay prop's unit is wrong

The editor prop declares `options: { format: 'ms' }` (`NumberCounter.tsx:345-350`), so the author enters and sees **milliseconds**. The component then computes:

```ts
const actualDelay = 1000 * delay;
```

— treating the value as **seconds**. With the default `initialValue: 5` the editor reads "5 ms" while the counter actually waits 5000 ms before starting.

Either the `format` should be `'s'` (matching `animationLength` directly above it, which correctly declares `format: 's'` and is multiplied by 1000 in the loop) or the multiplication should go. Changing the multiplication will alter the behaviour of every existing published counter; changing the label will not.

## Gotchas

- **`once` only suppresses the visibility trigger.** Effect 2 returns early when `once && finished` (`:187`), but interactions and the prop-change effects still reset and replay.
- **`START` applies the delay; `RESET` does not.** `START` wraps `setHasStarted` in `setTimeout(…, actualDelay)` (`:100-106`), while `RESET` sets it synchronously (`:114-117`).
- **In the editor, the counter only animates while the properties panel is open** — `actualSchemaOpen = disabled && schemaOpen` gates effect 4. With the panel closed, effect 3 resets it and leaves it at `start`.
- **`useVisible` resets on exit as well as entry**, so scrolling past and back replays the count unless `once` is set.

## Number formatting

`styleNumber` handles `separator`, `decimalSeparator`, and `precision`, or defers entirely to `toLocaleString` when `localeFormat` is on. `prefix`/`postfix` are concatenated as plain strings, so they are not affected by locale formatting.

## Working on this

```bash
cd number-counter
yarn install
vev start
```

Verify:

1. A descending counter (`end < start`) — it takes a separate branch (`:161-169`).
2. Each easing mode; `easeOut` is the one that motivates the `oneIsh` threshold.
3. Scroll out of view and back, with `once` both on and off.
4. All four interactions, especially `START` twice in a row.
5. Editing props with the panel open, then closing it — different effects own each case.
