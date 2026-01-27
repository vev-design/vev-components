import { useEffect } from 'react';

const JWPLAYER_STYLE_ATTR = 'data-vev-jwplayer-style';
const JWPLAYER_STYLE_REFCOUNT_ATTR = 'data-vev-jwplayer-style-refcount';
const JWPLAYER_MIRRORED_ATTR = 'data-vev-jwplayer-mirrored';

const JWPLAYER_CSS = `
.jw-wrapper { height: 100%; width: 100%; }
.jw-wrapper .jwplayer.jw-flag-aspect-mode { height: 100% !important; }
`.trim();

const shadowMirrorState = new WeakMap<
  ShadowRoot,
  {
    refCount: number;
    cleanup: () => void;
  }
>();

function installStyles(root: Document | ShadowRoot) {
  const container: ShadowRoot | HTMLElement =
    root instanceof Document ? root.head ?? root.documentElement : root;

  // Reuse a single style tag per root (document or shadow root)
  let styleEl = container.querySelector<HTMLStyleElement>(`style[${JWPLAYER_STYLE_ATTR}]`);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.setAttribute(JWPLAYER_STYLE_ATTR, '');
    styleEl.setAttribute(JWPLAYER_STYLE_REFCOUNT_ATTR, '0');
    styleEl.textContent = JWPLAYER_CSS;
    container.appendChild(styleEl);
  }

  const current = Number(styleEl.getAttribute(JWPLAYER_STYLE_REFCOUNT_ATTR) ?? '0');
  styleEl.setAttribute(JWPLAYER_STYLE_REFCOUNT_ATTR, String(current + 1));

  return () => {
    const next = Number(styleEl.getAttribute(JWPLAYER_STYLE_REFCOUNT_ATTR) ?? '1') - 1;
    if (next <= 0) {
      styleEl.remove();
      return;
    }
    styleEl.setAttribute(JWPLAYER_STYLE_REFCOUNT_ATTR, String(next));
  };
}

function installJwHeadStyleMirroring(shadowRoot: ShadowRoot) {
  const existing = shadowMirrorState.get(shadowRoot);
  if (existing) {
    existing.refCount += 1;
    return () => {
      existing.refCount -= 1;
      if (existing.refCount <= 0) {
        existing.cleanup();
        shadowMirrorState.delete(shadowRoot);
      }
    };
  }

  const head = document.head;
  if (!head) {
    return () => {};
  }

  const isJwStyle = (el: Element) => {
    if (el.tagName === 'LINK') {
      const link = el as HTMLLinkElement;
      return link.rel === 'stylesheet' && /jwplayer|jwpcdn/i.test(link.href || '');
    }
    if (el.tagName === 'STYLE') {
      const style = el as HTMLStyleElement;
      return /(\.jwplayer\b|jwplayer)/i.test(style.textContent || '');
    }
    return false;
  };

  const mirrorLink = (link: HTMLLinkElement) => {
    const href = link.href;
    if (!href) return;
    const selector = `link[rel="stylesheet"][href="${CSS.escape(href)}"]`;
    if (shadowRoot.querySelector(selector)) return;
    const clone = link.cloneNode(true) as HTMLLinkElement;
    clone.setAttribute(JWPLAYER_MIRRORED_ATTR, '');
    shadowRoot.appendChild(clone);
  };

  const mirrorStyle = (style: HTMLStyleElement) => {
    const text = style.textContent || '';
    if (!text) return;
    const already = Array.from(shadowRoot.querySelectorAll('style')).some(
      (s) => (s.textContent || '') === text,
    );
    if (already) return;
    const clone = document.createElement('style');
    clone.textContent = text;
    clone.setAttribute(JWPLAYER_MIRRORED_ATTR, '');
    shadowRoot.appendChild(clone);
  };

  const mirrorOne = (el: Element) => {
    if (!isJwStyle(el)) return;
    if (el.tagName === 'LINK') mirrorLink(el as HTMLLinkElement);
    if (el.tagName === 'STYLE') mirrorStyle(el as HTMLStyleElement);
  };

  // Mirror anything already injected
  for (const el of Array.from(head.children)) mirrorOne(el);

  // Mirror future injected styles (JW can inject after script load)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (!(node instanceof Element)) continue;
        mirrorOne(node);
      }
    }
  });

  observer.observe(head, { childList: true });

  const cleanup = () => {
    observer.disconnect();
    // Remove mirrored nodes when last instance unmounts
    for (const el of Array.from(shadowRoot.querySelectorAll(`[${JWPLAYER_MIRRORED_ATTR}]`))) {
      el.remove();
    }
  };

  shadowMirrorState.set(shadowRoot, { refCount: 1, cleanup });
  return () => {
    const state = shadowMirrorState.get(shadowRoot);
    if (!state) return;
    state.refCount -= 1;
    if (state.refCount <= 0) {
      state.cleanup();
      shadowMirrorState.delete(shadowRoot);
    }
  };
}

export function useJwPlayerStyles(elementRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const root = el.getRootNode() as Document | ShadowRoot;
    const removeLocalStyles = installStyles(root);
    const removeMirroring = root instanceof ShadowRoot ? installJwHeadStyleMirroring(root) : undefined;

    return () => {
      removeMirroring?.();
      removeLocalStyles();
    };
  }, [elementRef]);
}
