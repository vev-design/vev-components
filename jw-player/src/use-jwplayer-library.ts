import { useEffect, useMemo, useState } from 'react';

declare const System: any;

type LibraryStatus = 'idle' | 'loading' | 'loaded' | 'error';

type LibraryState = {
  status: LibraryStatus;
  error?: unknown;
};

const loadPromises = new Map<string, Promise<void>>();

function loadScriptOnce(src: string) {
  // If we already started loading this src, reuse it
  const existingPromise = loadPromises.get(src);
  if (existingPromise) return existingPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      // If it previously loaded, resolve immediately; otherwise hook into events.
      if ((existing as any).dataset?.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener(
      'load',
      () => {
        (script as any).dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
      once: true,
    });
    (document.head ?? document.documentElement).appendChild(script);
  });

  loadPromises.set(src, promise);
  return promise;
}

async function loadWithSystemImportOrScript(src: string) {
  const existingPromise = loadPromises.get(src);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    if (typeof System !== 'undefined' && typeof System.import === 'function') {
      try {
        await System.import(src);
        return;
      } catch {
        // If SystemJS is present but fails in this environment, fall back to <script>.
      }
    }
    await loadScriptOnce(src);
  })();

  loadPromises.set(src, promise);
  return promise;
}

export function useJwPlayerLibrary(playerId: string | null) {
  const src = useMemo(
    () => (playerId ? `https://cdn.jwplayer.com/libraries/${playerId}.js` : null),
    [playerId],
  );

  const [state, setState] = useState<LibraryState>({ status: src ? 'loading' : 'idle' });

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading' });

    loadWithSystemImportOrScript(src)
      .then(() => {
        if (cancelled) return;
        setState({ status: 'loaded' });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', error });
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return {
    src,
    status: state.status,
    error: state.error,
    ready: state.status === 'loaded',
  };
}

