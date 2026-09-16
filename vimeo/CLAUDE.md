# CLAUDE.md — vimeo

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Vimeo"**. Wraps `@vimeo/player` around a Vimeo iframe. 442 lines in `src/Vimeo.tsx`.

- Vev key: `VlpKqM5QaeMQClSIk3vr`
- Deps: `@vimeo/player`, `@vev/silke`

One of three parallel video components — see `../video/` and `../youtube/`. All three expose the same seven interactions and four events, but **this one uses SCREAMING_CASE enum values** (`PLAY`, `ON_PLAY`) while the other two use lowerCamel (`play`, `onPlay`). Interactions authored against one are not portable to another.

## `@vev/cli` is in `dependencies`

`package.json` lists `@vev/cli` under `dependencies`, not `devDependencies`. It is the build tool, not a runtime library. CI runs `npm install --omit=dev`, so this pulls the whole CLI into the production install for no reason. Worth moving.

## The URL field resolves the id via oEmbed

`videoInfo` is a custom `@vev/silke` field (`VimeoUrl`, `Vimeo.tsx:56-105`). On every change it calls Vimeo's public oEmbed endpoint:

```
https://vimeo.com/api/oembed.json?url=<fullUrl>
```

and writes back `{ fullUrl, videoId }`. This means **the editor requires network access to resolve a URL**, and an unreachable endpoint surfaces as "Invalid Vimeo URL" regardless of whether the URL was actually valid.

The effect runs on `[fullUrl]` and calls `props.onChange` from inside itself, which writes state that feeds back into `props` — safe only because `onChange` is called just when `res.video_id` is present.

## Player URL construction

`getVimeoUrl` (`Vimeo.tsx:38-49`) assembles query params by hand. Two behaviours worth knowing:

- **Autoplay forces `muted=1`** unconditionally (`:41`), because Vimeo honours browser autoplay policy. The `mute` prop is only consulted when autoplay is off.
- **`autopause` is inverted.** The param is only emitted when the prop is *false* (`if (!autopause) params.push('autopause=0')`), because Vimeo's default is already on. A prop named `autopause` that does nothing when true is confusing but correct.
- `byline=1` is always set and is not exposed as a prop.

## Lazy loading

`LazyLoad` (`:51-54`) gates the whole player on `useVisible(hostRef)` and returns `null` until then. Unlike the pattern used elsewhere in the repo, it does **not** latch — the player is unmounted again when it scrolls out of view, losing playback position.

## Working on this

```bash
cd vimeo
yarn install
vev start
```

Verify:

1. Paste a URL and watch the oEmbed round-trip resolve the id — this is editor-only and needs network.
2. Autoplay plus an `UNMUTE` interaction, given the forced `muted=1`.
3. `lazy` on, scrolling the player out of view and back.
4. `background` mode, which suppresses controls independently of `disableControls`.
