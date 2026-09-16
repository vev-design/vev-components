# CLAUDE.md — flourish

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Flourish"**. Embeds a Flourish visualisation or story, optionally driving story slides from scroll position. 280 lines in `src/Flourish.tsx`.

- Vev key: `qVW4PSCLnvfBAZUskwkM`

## Two embed modes, chosen by `scrollytelling`

**Off** — injects Flourish's own `embed.js` into `document.body` and lets it do the work (`Flourish.tsx:66-77`). The script element is given `id="vev-flourish"` and any previous one is removed first, so only one copy exists per page. `window.FlourishLoaded` is reset to `false` alongside it.

**On** — renders a controlled `<iframe>` instead, because slide position can only be driven through the URL hash. The script is not loaded at all in this mode — the comment at `:67` says so explicitly.

The iframe carries `sandbox="allow-scripts allow-popups"`, which the script-based path does not.

## Slide control

The embed URL is rebuilt as `...#slide-${slide}` on every change. Slides advance from one of three measurements, selected by `type` (`:105-121`):

| `type` | slide distance |
|---|---|
| `bottom` | `(scrollHeight - viewportHeight - globalOffsetTop) / numberOfSlides` — spread across the whole page |
| `distance` | the literal `distance` prop, in pixels |
| `element` | `(targetElementTop - ownTop) / numberOfSlides`, where the target is another widget by id |

`element` mode subtracts 1 from the computed slide (`:135`), an off-by-one correction specific to that mode.

`globalOffsetTop` comes from `View.rootNodeOffsetTop` — a Vev runtime value accounting for anything rendered above the page root.

Three interactions (`NEXT_SLIDE`, `PREVIOUS_SLIDE`, `SET_SLIDE`) also set `slide` directly. `SET_SLIDE` is 1-based and converted with `args.set_slide - 1` (`:95-97`). Note these are **not** mutually exclusive with scroll control — in scrollytelling mode the scroll effect will overwrite an interaction-set slide on the next scroll event.

## Gotchas

- **The iframe is force-reloaded on every visibility change** — `frameRef.current.src = frameRef.current.src` (`:80-83`). Self-assigning `src` is the standard reload trick; it looks like a no-op and is not. It also resets the visualisation's internal state each time the widget scrolls into view.
- **`getElementTopPosition` does not guard against a missing element** (`:33-36`). If `widgetKey` points at a widget that no longer exists, `document.getElementById` returns `null` and reading `.offsetTop` throws. This runs inside the slide-distance effect in `element` mode.
- **The URL effect depends on the state it sets.** `useEffect(..., [slide, url])` calls `setUrl` (`:141-144`), and `url` is in its own dependency array. It settles only because the computed string is identical on the second pass.
- **The id regexes are loose.** `/story\/(.*)(?=\/)/i` is greedy up to the last `/`, so a URL with extra path segments yields a longer id than intended. A `formUrl` that matches neither pattern falls back to the hardcoded id `'3165417'` (`:147`).
- `offsetTop` is captured once from `getBoundingClientRect().top` (`:106`) with `[hostRef]` as the dependency — that ref is stable, so the value is never recomputed after mount even though it feeds `element`-mode maths.

## Working on this

```bash
cd flourish
yarn install
vev start
```

Verify:

1. Both modes — they render completely different DOM and only one loads `embed.js`.
2. All three `type` values in scrollytelling mode, including `element` with a valid target widget.
3. Scrolling the widget out of view and back, which reloads the iframe.
4. A visualisation URL as well as a story URL — they use different regexes and different embed paths.
