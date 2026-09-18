# CLAUDE.md — embed-anything

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

"Embed Anything" takes a raw HTML string from the editor and renders it on the page. It is the generic fallback for embed codes that have no dedicated Vev component (analytics snippets, third-party widgets, iframes, forms).

- Vev key: `eKg0lmd17iVQx2UQPl71` (`vev.json`)
- Entire implementation: `src/EmbedAnything.tsx` (331 lines, 3 sub-components + registration)
- Styles: `src/EmbedAnything.module.css` (`.wrapper`, `.instructions`)
- Deps: `@vev/react ^0.1.8`, `react ^18.2.0`. No tests.

## Input model

There is exactly one content prop: `html` (multiline string). The component does **no** parsing of that string — no URL detection, no `<iframe>`/`<script>` sniffing, no `DOMParser`, no sanitization. It is interpolated verbatim in every mode.

Consequence: a bare URL is rendered as literal text. To embed a page by URL the user must paste a full `<iframe src="...">` tag, or use the sibling `IFrame` component (`../IFrame/src/IFrame.tsx`, prop `pageUrl`, helper `getSrc` prefixes `https://` when the scheme is missing).

## Render modes

Dispatch order in `EmbedAnything` (`src/EmbedAnything.tsx:34-72`):

1. **Editor canvas** — `useEditorState().disabled === true` short-circuits everything and renders the grey instructions card. Embed code never executes in the editor; test with `vev start` preview or a published page.
2. **`encapsulate`** → `EmbedIframe` (`:74-193`). An `<iframe srcDoc>` holding a full generated document.
3. **`isStatic`** → `StaticHTML` (`:16-32`). `dangerouslySetInnerHTML` into a `.fill` div. Scripts inserted this way never execute (browser rule for `innerHTML`).
4. **default** → `EmbedScript` (`:195-249`). `dangerouslySetInnerHTML` into `styles.wrapper`, then an effect re-creates every `<script>` found in the host so it actually runs.

### Mode gotchas to know before changing anything

**Encapsulate is not a sandbox.** The `srcDoc` frame is same-origin with the host page, deliberately — `measureIframe` (`:88-91`) reads `contentDocument.body.scrollHeight`. There is no `sandbox`, `allow`, `allowfullscreen`, or `referrerpolicy` attribute on the generated iframe (`:176-192`). Adding `sandbox` without `allow-same-origin` breaks height measurement. Missing `allow` means a *nested* iframe inside the embed gets no fullscreen/gyroscope/xr delegation.

**Encapsulate + nested iframe collapses to 150px.** In auto-height mode the wrapper measures `body.scrollHeight`; a nested iframe with no intrinsic size resolves to the CSS default 150px. For iframe embeds prefer Static HTML mode, or turn on `fillContainer`.

**`fillContainer` is only read by `EmbedIframe`.** It is ignored in static and script modes (`:59`). Those modes get 100%×100% from `.wrapper` / the global `.fill` class instead.

**`editableCSS` targets `styles.wrapper`**, which in encapsulate mode *is* the iframe — but the inline `style` at `:183-189` hard-sets `background: transparent` and `border: none`, overriding those two editable properties. Static mode uses `.fill`, not `styles.wrapper`, so container styling does not apply there at all.

**`EmbedScript` appends scripts to `document.body`**, not back into the host (`:222`). Embeds that rely on `document.currentScript` or on inserting content next to their own tag will not find their insertion point. Only `integrity` and `crossorigin` carry over (`:217-220`); `type`, `async`, `defer`, `id`, and `data-*` are dropped — so `type="module"` runs as a classic script and `application/ld+json` blocks get executed as JS.

## Height in encapsulate auto mode

This is the fragile part of the component. `iframeHeight` starts at `'auto'` (`:85`), which on an `<iframe>` resolves to 150px, not to content height. Three redundant channels correct it:

1. In-iframe script baked into `autoSrcDoc` (`:149-171`): posts `{ iframeHeight, messageFrom }` on an initial `sendHeight()`, on `resize`, from a `ResizeObserver` on `document.body`, from a 500ms `setInterval`, and on a `requestHeight` message.
2. Parent `message` listener (`:96-102`), filtered by `messageFrom = useModel().key` so sibling embeds do not cross-set each other's heights (added in `5a38f00`).
3. Direct `measureIframe()` plus a `requestHeight` handshake on mount (`:110-111`), and again `onLoad` (`:118-121`).

**Why all three exist** (commit `b85214c`): the iframe is server-rendered with its `srcDoc` inline, so it often loads and posts its height *before* vev.js hydrates. Both the `load` event and that first message are lost, and because the embed only re-posted on *change*, the frame stayed at 150px nondeterministically per page load. The fix made the first post bypass the dedupe (`sendHeight()` not `postHeight()`, `:169`) and added the direct measurement + handshake recovery.

Do not remove any of the three paths without re-testing both orderings (parent-first and iframe-first).

Known residual quirks, left intentionally: the 500ms `setInterval` is never cleared; the parent's `message` listener does not check `event.origin` or `event.source`; the `requestHeight` post targets `'*'`.

## Registration quirks

- `renderOnVisible.hidden` reads `context.value.static` (`:283`) but the prop is named `isStatic` (`:288`). That half of the condition is always `undefined`, so the toggle stays visible in static mode.
- `type: 'both'` — available as section and widget.

## Working on this component

```bash
cd embed-anything
yarn install
vev start          # opens in the Vev editor; embeds only run in preview, not on canvas
vev deploy --token "$VEV_DEPLOY_TOKEN"
```

Verify height changes on a **preview or published** page, not the editor canvas, and with more than one Embed Anything instance on the page to exercise the `messageFrom` filtering. Reload several times — the hydration race that `b85214c` fixed was intermittent.
