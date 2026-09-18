# CLAUDE.md — jw-player

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"JW Player"**. Wraps the hosted JW Player library around a JW-hosted video. 715 lines across four files.

- Vev key: `5qgA7fPZMiPHCzTo24VU`
- `src/JWPlayer.tsx` — component and player setup
- `src/use-jwplayer-library.ts` — loads the remote library
- `src/use-jwplayer-styles.ts` — injects CSS, including into shadow roots
- `src/jw-player-tracking.ts` — builds the analytics event bindings

## Shadow DOM is the theme

Vev renders widgets inside a shadow root, and JW Player assumes it owns the document. Three separate workarounds exist for this; all of them are load-bearing.

**1. Autoplay.** JW's `autostart: 'viewable'` relies on document-level queries and silently fails inside a shadow root. `JWPlayer.tsx:98-100` detects `rootNode instanceof ShadowRoot` and sets `autostart: false`, then reimplements viewability with an `IntersectionObserver` that calls `playerInstance.play(true)` once the element is 25% visible (`:148-185`).

**2. Element lookup.** The player element is created and appended inside `videoRef`, never queried from the host. The comment at `:121-123` spells out why — querying from the light DOM host cannot find an element living in the shadow root.

**3. Styles.** `use-jwplayer-styles.ts` mirrors its CSS into whichever root the component lives in, with a **refcount stored in a DOM attribute** (`data-vev-jwplayer-style-refcount`) plus a `WeakMap<ShadowRoot, …>`. Several players on one page share a single `<style>` tag, and it is removed only when the last one unmounts. Do not simplify this to a plain append/remove.

## Library loading

The library URL is derived from the player id: `https://cdn.jwplayer.com/libraries/{playerId}.js`.

Both ids come from parsing the embed URL by string surgery (`getVideoUrl`, `JWPlayer.tsx:23-39`) — strip the protocol, strip `.html`/`.js`, split on `/`, take the last segment, split on `-`. So `.../players/rZGxHwOi-mBecVbzv.js` yields `mediaId = rZGxHwOi`, `playerId = mBecVbzv`. Any JW URL shape that does not end in `mediaId-playerId` produces two `null`s and the component renders nothing.

`loadWithSystemImportOrScript` tries `System.import` first and falls back to a `<script>` tag. A module-level `Map<string, Promise>` dedupes concurrent loads, and `loadScriptOnce` additionally checks for an existing matching `<script>` in the DOM — two layers, because the same library may already have been injected by another widget.

## Tracking

Two independent analytics paths fire from the same JW events (`jw-player-tracking.ts`):

- `Tracking.send('video', 'JW player', action, …)` — the legacy category/action form.
- `dispatchTrackingEvent('VEV_VIDEO_PLAY' | '_PROGRESS' | '_STOP' | '_END', …)` — the current Vev event form.

The `time` event is throttled to 500ms, then further deduped to one `VEV_VIDEO_PROGRESS` per whole second. `track('videoProgress', …)` additionally fires at each fifth: 20, 40, 60, 80, 100.

Tracking state (`fifth`, `passedTenSeconds`, `lastKnownDuration`) is closure-scoped per factory call, so it resets correctly when the player is rebuilt.

## Gotchas

- **`autoplay` forces mute.** `effectiveMute = Boolean(mute || autoplay)` (`JWPlayer.tsx:101`) — browser autoplay policy. The `mute` prop cannot be turned off while autoplay is on.
- **`trackingName` and `embedUrl` are not in the effect's dependency array** (`JWPlayer.tsx:212-223`), but `track` closes over both. Renaming the tracking label in the editor does not take effect until some other dependency changes and the player rebuilds.
- **Dead legacy config.** `flashplayer: '//ssl.p.jwpcdn.com/player/v/8.8.4/jwplayer.flash.swf'` (`:110`) — Flash has been removed from every browser. `cast: { appid: '00000000' }` (`:102-104`) is a sentinel that disables Chromecast.
- **A recommendations playlist id is hardcoded** into the playlist URL: `recommendations_playlist_id=irwrDqTZ` (`:114`).
- The JW licence key is read from a global `jwDefaults?.key` supplied by the host page, not from a prop.

## Working on this

```bash
cd jw-player
yarn install
vev start
```

Verify:

1. Two players on the same page — this exercises the style refcount and the library load dedupe.
2. Autoplay specifically, since the shadow-DOM path is completely different from the normal one.
3. Unmount (navigate away, or toggle the widget) and confirm `playerInstance.remove()` ran without console noise.
4. Analytics in the network panel — both tracking paths should fire.
