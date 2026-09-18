# CLAUDE.md — google-maps

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Google Maps"**. 508 lines across three source files.

- Vev key: `UAZajTc6oWbgGppaaXfS`
- `src/GoogleMaps.tsx` — two separate map implementations behind one component
- `src/use-google-maps-api.ts` — loads the JS API once per page
- `src/parse-embed-url.ts` — URL parsing helpers

## Fix this first: `package.json` has no `dependencies`

`@vev/silke`, `@vev/react`, `react`, and `react-dom` are written as **top-level keys of the JSON object**, siblings of `devDependencies`, not inside a `dependencies` block:

```json
  "devDependencies": { ... },
  "@vev/silke": "^1.1.3",
  "@vev/react": "^0.3.1",
  "react": "18.3.1",
  "react-dom": "18.3.1"
```

CI deploys with `npm install --omit=dev && vev deploy`, which installs **none** of these. This is the highest-value one-line fix found while documenting the repo. Wrap those four keys in a `"dependencies": { … }` object.

## Two implementations, chosen by prop

`GoogleMaps` is a dispatcher (`GoogleMaps.tsx:21-48`). If `embedUrl` parses to something usable, it renders `EmbedMap`; otherwise `JsApiMap`. They share no code and behave differently.

**`EmbedMap`** — a plain `<iframe>` pointed at a `google.com/maps/embed` URL. No API usage, no JS library.

**`JsApiMap`** — the real Google Maps JS API, with geocoding and `AdvancedMarkerElement`. Uses `mapId: 'vev-google-maps'`, which is required for advanced markers.

Editor differences live only in `JsApiMap`: when `disabled` is true it sets `disableDefaultUI` and `gestureHandling: 'none'` so the map does not swallow canvas interactions (`:135-136`).

## The API key is hard-coded

`const API_KEY = 'AIzaSyAkQRDoMLeuxVyX1QvG_JIxo8P7rajLMxo'` at `GoogleMaps.tsx:8`, committed to the repository.

Google Maps browser keys are necessarily visible to clients, so this is not a leak in itself — but it means the key's security rests entirely on its HTTP-referrer restrictions in Google Cloud Console. Before reusing this key anywhere, confirm those restrictions exist. Rotating it requires a code change and a redeploy, not a config update.

## URL parsing

`extractEmbedSrc` accepts either a raw URL or a pasted `<iframe>` snippet, pulling `src` out of the latter, and requires the result to contain `google.com/maps` (`parse-embed-url.ts:5-23`).

`extractSearchQuery` digs the place name out of the opaque `pb=` parameter by matching `!2s([^!]+)` (`:74-98`). This depends on an undocumented Google encoding and will return `null` — not throw — if the format changes.

**`recenterEmbedSrc` is imported but never called** (`GoogleMaps.tsx:6`). It rewrites the `!2d`/`!3d` longitude/latitude fields inside `pb=`; the user-location path builds a fresh `/embed/v1/search` URL instead. Either wire it up or drop the import.

## User location

The two modes handle `userLocation` completely differently:

- `EmbedMap` calls `getCurrentPosition`, extracts the original search term, and swaps to a `maps/embed/v1/search` URL centred on the user — the comment at `:72` notes that `/v1/search` is used specifically to keep the place icons and sidebar, which `/v1/view` loses. Zoom is hard-coded to `14` here, ignoring the `zoom` prop.
- `JsApiMap` just calls `map.setCenter()`, and skips entirely if an `address` is set (`:165`).

A `console.log('query', query)` is left in the embed path (`:70`).

## Library loading

`loadGoogleMapsApi` guards three ways against double-loading: a module-level promise, a check for `window.google.maps.Map`, and a DOM query for an existing `maps.googleapis.com` script — the last because the editor's autocomplete field may have injected it already (`use-google-maps-api.ts:14-16`). The callback name is uniquified with `Date.now()` and deleted after firing.

## Working on this

```bash
cd google-maps
yarn install
vev start
```

Verify:

1. Both modes — paste an embed URL, then clear it and use an address. They are entirely separate code paths.
2. An `<iframe>` snippet pasted whole, not just a bare URL.
3. `userLocation` in each mode; the browser will prompt for permission, and denial must fall back cleanly.
4. The map inside the editor canvas — gestures must not be captured.
