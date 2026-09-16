# CLAUDE.md — video

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Video"**. A native `<video>` element with Vev interactions, events, and analytics. 452 lines.

- Vev key: `MdjFG5yxHMKJGGaoMsfS` (plus `devKey`, and `"public": true`)
- `src/index.ts` holds the registration **and** the `VideoEvent` / `VideoInteraction` enums; `src/Video.tsx` is the component. The component imports its enums back from `'.'` — a circular import that works only because the enums are hoisted.

Two sibling components cover the same ground for hosted platforms: `../youtube/` and `../vimeo/`. All three expose the same seven interactions and four events, but **the enum casing differs** — `video` and `youtube` use `play`/`onPlay`, `vimeo` uses `PLAY`/`ON_PLAY`. Interactions authored against one are not portable to another.

## Cross-component coordination via a window event

`stopOnOtherPlay` is implemented with a global `CustomEvent` on `window`, not shared state:

```ts
const VIDEO_PLAYBACK_EVENT = '@@vev.video.playback';
```

Every video broadcasts on `play` with `detail.source` set to its own element (`Video.tsx:154-156`); listeners pause themselves if the source is not them (`:196-205`). This is how several unrelated video widgets on one page cooperate. `youtube` and `vimeo` do **not** participate — the event is specific to this component.

## Looping is manual, on purpose

The native `loop` attribute is explicitly disabled — `// if (loop) attributes.loop = true;` (`Video.tsx:238`). Instead the `ended` handler seeks to 0 and replays (`:180-183`).

The reason is analytics: a natively looping video never fires `ended`, so `VEV_VIDEO_END` and the `onEnd` Vev event would never be dispatched. Restoring the attribute silently breaks tracking on every looping video.

## Editor behaviour

When `disabled` flips true the component resets everything — clears `mutedRef`, `pausedRef`, `loopedAmount`, then calls `load()` and `pause()` (`Video.tsx:222-228`). `mutedRef.current === undefined` is the sentinel for "the author has not overridden mute via an interaction", which is why the muted attribute is computed as `(mutedRef.current === undefined && mute) || mutedRef.current` (`:239`).

Autoplay force-mutes on first play because browsers block unmuted autoplay (`:217`).

## Known bugs

1. **`maxProgress` is never updated.** `Video.tsx:151` reads `stateRef.current.maxProgress = stateRef.current.maxProgress;` — a self-assignment. The computed `update.maxProgress` is discarded, so the `current > maxProgress` guard always compares against 0 and `VEV_VIDEO_PROGRESS` fires on essentially every `timeupdate` instead of only on new maximum progress.
2. **The event effect re-subscribes on every render.** Its deps include `track`, and `track = createTracker(disableTracking)` returns a fresh function identity each render (`:60`). The `let fifth = 1` counter (`:115`) lives in the render body, so it resets alongside it — the 20/40/60/80/100% progress marks can re-fire.
3. **The source list is sorted in place.** `video.sources.sort(...)` (`:271`) mutates the prop array rather than copying it first.
4. **The source ordering ranks `video/quicktime` above `video/mp4`** (`:274-275`). `.mov` plays only in Safari, so browsers that support both are offered the less portable format first.
5. **`pausedRef` is typed `useRef<boolean>` but assigned `undefined`** (`:224`).

## Working on this

```bash
cd video
yarn install
vev start
```

Verify:

1. Two videos on one page with `stopOnOtherPlay` on — the window event is the only thing linking them.
2. A looping video, confirming `onEnd` still fires each cycle.
3. Autoplay, then an explicit `unMute` interaction — that exercises the `mutedRef` sentinel.
4. A video with multiple source formats, checking which one the browser actually picks.
