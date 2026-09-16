# CLAUDE.md — html5-audio-native

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"HTML5 Audio"**. A native `<audio>` element with the browser's own controls, wired to Vev interactions and events. 250 lines.

- Vev key: `PDxblTfYwIwoOKnZJ2bk`
- Entry: `src/HTML5Audio.tsx`

## Relationship to `html5-audio-custom`

The two packages are a near-verbatim fork. Diffing the two `HTML5Audio.tsx` files ignoring whitespace shows only four differences:

| | this package | `html5-audio-custom` |
|---|---|---|
| registered name | `HTML5 Audio` | `HTML5 Audio Custom` |
| `preload` | `none` | `metadata` |
| `<audio>` style | `width/height: 100%` (visible) | `display: none` |
| extra UI | — | `Button`, `Timeline`, `Timestamp` |

Everything else — the interaction handlers, the fade logic, the event dispatching, and the bugs below — is duplicated. **A fix here does not reach the other package.** Check both.

## Known bugs (shared with `html5-audio-custom`)

1. **`showControls` can never be false.** `const showControls = settings?.showControls || true;` — `false || true` is `true`. The editor toggle does nothing. The fix is `settings?.showControls ?? true`. In the `custom` package this is masked, because the element is hidden anyway.
2. **`console.log('playerState', playerState)` runs on every render.**
3. The same `||`-instead-of-`??` pattern is used for `loop` and `autoplay` (`:27-28`), but those default to `false`, so `false || false` happens to give the right answer. Only `showControls` is actually broken.

## Gotchas

- **The audio source can come from two mutually exclusive props.** `audioUrl` is an upload (an object with `.url`); `audioUrlLink` is a plain string. Each hides the other in the editor. `actualUrl` therefore mixes types and needs the `as string` cast at `:143`. The `Props` type declares `audioUrlLink` as `Audio`, which is wrong — it is a `string`.
- **The wrapper is keyed on autoplay** — `key={`autoplay-${shouldAutoPlay}`}` — forcing a remount when it changes, because `autoPlay` is only honoured at element creation.
- Interactions include `FADE_OUT` (and its counterpart), which ramp `volume` on a `setInterval` stored in `intervalRef`.

## Working on this

```bash
cd html5-audio-native
yarn install
vev start
```

Verify both source props, and remember that toggling "show controls" currently has no effect. Test any change against `../html5-audio-custom/` as well.
