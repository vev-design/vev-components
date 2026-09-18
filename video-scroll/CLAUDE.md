# CLAUDE.md — video-scroll

Guidance for Claude Code when working in this component. See the repo root `CLAUDE.md` for monorepo-wide rules.

## What this component is

Registered as **"Video Scroll"**. Scrubs through a video as the page scrolls. 843 lines.

- Vev key: `fe6VP3Ge6fpBDVwrbJC6`
- Deps: `@vev/react`, `@vev/utils`, `@vev/silke`, `react-icons`, `web-vitals`
- Entry: `src/components/video-scroll/index.tsx` (registration) → `video-scroll.tsx` (runtime)

## There is no video at runtime

This is the single most important thing about the component. The live site never loads a video file. The `images` prop is an array of **pre-extracted frame URLs**, and the runtime draws one of them to a `<canvas>` per scroll position.

The video only exists in the editor. `src/video-unpack.tsx` takes an uploaded file, plays it invisibly, and screenshots it into an `OffscreenCanvas`:

- `FRAMES_PR_SECOND = 12`, `MAX_FRAMES = 1000` — a 90-second clip is truncated, not slowed.
- Each frame is uploaded individually, so a long video means a long editor-side upload.

Changing the frame rate or cap changes what gets uploaded, not how existing components play back.

## Frame loading: order matters

`src/image-load-worker.ts` runs in a worker and does **not** load frames in sequence. `heapIndexMap` (`:21-37`) emits first, last, then middle, then recurses into each half. The result is that scrubbing becomes progressively sharper across the whole timeline instead of only the beginning being ready. Ten loaders run in parallel (`:69`).

A frame that has not arrived yet is not a hole — `useFrame` searches outward from the desired index for the nearest loaded frame (`video-scroll.tsx:182-192`) and draws that instead.

**The worker rewrites CDN URLs by literal string replacement** (`image-load-worker.ts:58-61`):

```ts
url.replace('cdn-cgi/image/f=auto,q=82,w=1920', `cdn-cgi/image/f=auto,q=87,w=${width}`)
```

It matches that exact substring and nothing else. If the upload pipeline ever emits different Cloudflare parameters, the resize silently stops applying and full-size frames are fetched.

Relative URLs are resolved against `parentLocation`, built from `globalVevState.current.dir` (`use-video-image-worker.ts:34-36`) — needed because a worker's `self.location` is not the page's.

## Pinning is manual

The component does not use `position: sticky`. A scroll listener toggles `position: fixed` on the image holder between `pinStartPos` and `pinEndPos`, and manually restores `top`/`bottom`/`left`/`maxWidth` outside that range (`video-scroll.tsx:106-142`).

A `setInterval(calculateContainer, 3000)` runs as a safety net — the comment at `:146` says "Just for safety in case of some mis calculation". It is deliberate; removing it will surface layout drift that nothing else corrects.

## Looping

`loopCount` with `loopAlternate` ping-pongs through the frames; without it, the progress wraps (`video-scroll.tsx:164-176`). Note the two branches compute `desiredFrame` differently — the alternate path multiplies the frame index, the plain path multiplies the progress — so they do not degrade to the same thing at `loopCount = 1`.

## Known bugs

1. **Zoom is applied twice.** `scrollTop` is already multiplied by `zoom` at `video-scroll.tsx:109`, then `scaledScrollTop = zoom * scrollTop` at `:114` squares it. That value is compared against `pinStartPos`/`pinEndPos`, which were computed with a single `zoom` factor (`:73-76`). Pinning is therefore wrong whenever `useZoom()` returns anything other than 1.
2. **`preloadImage` and `imageCache` are dead code** (`video-scroll.tsx:26-38`). Nothing calls them; the worker path replaced them.
3. **`const el = imageRef.current || imageRef.current;`** (`video-scroll.tsx:107`) — the fallback is the same expression.

## Working on this

```bash
cd video-scroll
yarn install
vev start
```

Verify:

1. Upload a real video in the editor and watch the unpack progress — that path is editor-only and easy to break without noticing.
2. Scroll through on a published page with the network panel throttled, to see the out-of-order frame fill.
3. A section taller than the viewport (pinning active) and one shorter than it (`shouldPin` false).
4. Browser zoom at something other than 100%, given bug 1.
