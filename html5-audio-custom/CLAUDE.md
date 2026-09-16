# CLAUDE.md — html5-audio-custom

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"HTML5 Audio Custom"**. A hidden native `<audio>` element driven by a bespoke UI — play/pause button, scrubber, and timestamp. 461 lines.

- Vev key: `ggbqwTch2afNUenCjyA7`
- `src/HTML5Audio.tsx` plus four UI folders: `button/`, `icon/`, `timeline/`, `timestamp/`, `playbackrate/`

## Relationship to `html5-audio-native`

A near-verbatim fork of `../html5-audio-native/`. A whitespace-insensitive diff of the two `HTML5Audio.tsx` files shows only the custom UI imports, `preload: 'metadata'` instead of `'none'`, `display: none` on the `<audio>`, and the extra JSX. Every handler and every bug is duplicated. **Fixes do not propagate between the two packages.**

## The audio element is hidden

`style={{ display: 'none' }}` on the `<audio>` (`HTML5Audio.tsx:150`). All visible controls are the components in `src/button/`, `src/timeline/`, and `src/timestamp/`. Consequently the `showControls` prop is meaningless here — the native controls are never visible regardless of its value.

`preload="metadata"` rather than `none`, because the timeline needs `duration` before playback starts.

## Gotchas

- **`Timeline` and `Timestamp` receive `audioRef.current` as a prop** (`:169-170`). Refs do not trigger re-renders, so on first render both get `null`. They only receive the real element once something else re-renders the parent — in practice the first play, which calls `setPlayerState`. Any change that removes that state update will leave the scrubber permanently dead.
- **Play state is mirrored in React state** (`playerState.playing`), updated only by the custom button's `onClick` (`:157-166`). Playback started any other way — an interaction, or `autoplay` — does not update it, so the button icon can disagree with what is actually playing.
- **`playbackrate/` exists but is not rendered** by `HTML5Audio.tsx`. Confirm before assuming the speed control is wired up.

## Known bugs (shared with `html5-audio-native`)

1. **`showControls` can never be false** — `settings?.showControls || true`. Harmless here only because the element is hidden.
2. **Two `console.log` calls ship to production**: `console.log('playerState', playerState)` on every render (`:49`), and `console.log('context', context)` inside the registration (`:225`).

## Working on this

```bash
cd html5-audio-custom
yarn install
vev start
```

Verify:

1. The scrubber on first load, before pressing play — that is the `audioRef.current` timing issue.
2. Starting playback via a Vev interaction rather than the button, then checking the icon.
3. Both source props (`audioUrl` upload vs. `audioUrlLink` string).
4. Any fix here against `../html5-audio-native/` too.
