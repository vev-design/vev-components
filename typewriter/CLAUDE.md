# CLAUDE.md — typewriter

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Typewriter"**. Cycles through a list of phrases, typing and erasing each one. 271 lines across `src/Typewriter.tsx` (animation) and `src/index.ts` (registration + the `TypewriterInteraction` enum).

- Vev key: `NoqU9R49JamvnZvP68v0`, with `"public": true` and `"shareWithAccount": true`
- `type: 'standard'` — not a section.

## The state machine

Four states, cycled by `resetAndNextState` as `(state + 1) % 4` (`Typewriter.tsx:27`, `:139-142`):

| state | value | behaviour |
|---|---|---|
| `WRITE` | 0 | reveals one more character every 5th tick |
| `SHOW` | 1 | holds for 50 ticks |
| `ERASE` | 2 | removes two characters every 3rd tick; **returns immediately if `loop` is off** |
| `WAIT` | 3 | advances `row` on tick 1, restarts on tick 50 if looping |

A `setInterval` at `timer` ms calls the latest `update` through a ref (`:78-96`), so the closure always sees current state without restarting the timer.

**`WAIT` has two jobs — advancing the row and restarting the cycle.** That coupling is why the old "Pause on start" implementation was broken, and it is the thing to keep in mind before reusing any state as an idle state.

## Read commit `d7d149c` before changing pause or start behaviour

That commit rewrote both. The reasoning, preserved here so it is not rediscovered:

- **"Pause on start" used to start the machine in `WAIT`.** With `loop` on, `WAIT`'s own 50-tick escape fired after ~1s and the animation started by itself, skipping the first word. With `loop` off, the escape never fired and the element stayed blank forever.
- **Pause is now a separate `paused` flag that stops the interval**, leaving the state machine untouched. The start state is always `WRITE`.
- **"Start when in view"** gates on `useVisible`, the same hook `number-counter` uses. The clock does not tick off-screen, so no state is lost — this replaced a lazy-load add-on workaround.
- **The editor canvas deliberately ignores the view gate** (`waitForView = startOnView && !disabled`, `:37`) so designers always see the animation.
- **`play` and `restart` override the gate** by setting `hasEnteredView` directly (`:51`, `:65`) — an explicit trigger always wins.
- `words[row] || ''` (`:100`) guards against a stale `row` after the author shortens the list.

This commit also bumped `@vev/react` to `^0.3.5`; `useVisible` is not present in the `^0.2.0` range.

**Behaviour change recorded there:** "Pause on start" with loop on used to be a one-second delay. It is now a real pause that requires a Play or Restart interaction.

## Gotchas

- **`hasEnteredView` latches.** Once true it never resets, so scrolling away and back does not replay. That is intentional — contrast with `number-counter`, which resets on exit.
- **`timer` is the tick interval, not the per-character speed.** Characters appear every 5th tick in `WRITE` and disappear two-at-a-time every 3rd tick in `ERASE`, so typing and erasing run at different rates by design.
- **`play` restarts rather than resumes when the animation has finished with `loop` off** (`:53-56`) — otherwise it would resume into a terminal state and do nothing.
- Both source files use double quotes, against the repo's `singleQuote` Prettier setting. One `editableCSS` entry in `index.ts` uses single quotes, so the file is already inconsistent with itself.

## Working on this

```bash
cd typewriter
yarn install
vev start
```

Verify the four combinations that the `d7d149c` fix was about:

1. `pauseOnStart` on, `loop` on — must stay paused, not self-start after a second.
2. `pauseOnStart` on, `loop` off — must stay paused, not blank forever.
3. `startOnView` on — must hold off-screen, start on entry, and still animate on the editor canvas.
4. Play and Restart while off-screen, which must override the gate.
