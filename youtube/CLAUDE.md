# CLAUDE.md — youtube

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"YouTube player"**. Wraps `react-youtube` around the YouTube IFrame API. 339 lines in `src/Youtube.tsx`.

- Vev key: `KpvXldM9sZ4mhWaqwI5g`
- Dep: `react-youtube`

One of three parallel video components — see `../video/` (native `<video>`) and `../vimeo/`. All three expose the same seven interactions and four events. `youtube` and `video` use lowerCamel enum values (`play`, `onPlay`); `vimeo` uses SCREAMING_CASE. Interactions do not port between them.

## URL parsing

The `videoId` prop actually takes a full URL. `youTubeParseUrl` (`Youtube.tsx:26-33`) runs one regex that accepts `youtu.be/`, `/embed/`, `/v/`, `watch?v=`, and `watch?...&v=` forms, and extracts exactly 11 characters.

Anything else returns `undefined`, and the component renders the `<YouTube>` element with no id rather than failing visibly. A bare id pasted on its own does **not** match — the regex requires one of those path forms.

## Progress tracking is polled, not evented

The YouTube API has no per-second time event, so a 500ms `setInterval` reads `getCurrentTime()` and dispatches only when the floored second changes (`Youtube.tsx:158-181`). That drives both the `currentTime` Vev event and `VEV_VIDEO_PROGRESS`.

The interval's deps are `[dispatch, player, videoId]`, so it restarts whenever the player instance is replaced.

## Gotchas

- **Looping is forced in JS.** `playerVars.loop` is set, but the comment at `:105` records that it "doesn't always work", so the `ENDED` state handler calls `playVideo()` again. Both mechanisms are active; removing the JS one will make looping intermittent.
- **`getPlayer()` is a plain closure over state**, not a ref (`:113-115`). It returns whatever `player` was when that render's handler was created. It happens to work because `useVevEvent` re-registers each render, but it is not the ref pattern used elsewhere in the repo.
- **`handlePreview` awaits a non-promise.** `const player = await getPlayer()` (`:150`) — `getPlayer` is synchronous. Harmless, but it signals the author expected an async API.
- **`togglePlay` reads `playerState.current`**, a ref updated from `onPlayerStateChange`, rather than querying the player. If a state change is missed the toggle desyncs.
- **`lockAspectRatio` swaps between `aspectRatio: '16 / 9'` and `height: '100%'`** (`:187`) — there is no in-between, and non-16:9 videos letterbox.
- `percentagePlayed` is computed before the switch using `currentTimeRef.current`, which the poll updates on its own schedule, so the value attached to `PLAY`/`PAUSE` events can lag by up to 500ms.

## Working on this

```bash
cd youtube
yarn install
vev start
```

Verify:

1. Several URL shapes — `youtu.be`, `watch?v=`, and a URL with extra query params.
2. Looping, which involves both `playerVars` and the JS fallback.
3. All seven interactions, particularly `togglePlay` after seeking manually in the player's own controls.
4. Editor preview: the video must pause when `disabled` becomes true.
