import { useState, useEffect } from 'react';

const loadPromise: { current: Promise<void> | null } = { current: null };

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (loadPromise.current) return loadPromise.current;

  if (window.google?.maps?.Map) {
    loadPromise.current = Promise.resolve();
    return loadPromise.current;
  }

  loadPromise.current = new Promise<void>((resolve, reject) => {
    // Check for script already added (e.g. by editor autocomplete)
    const existing = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      if (window.google?.maps?.Map) return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps API')), {
        once: true,
      });
      return;
    }

    const callbackName = '__initGoogleMaps_' + Date.now();
    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&callback=${callbackName}`;
    script.async = true;
    script.addEventListener(
      'error',
      () => reject(new Error('Failed to load Google Maps API')),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return loadPromise.current;
}

export function useGoogleMapsApi(apiKey: string): {
  ready: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<{ ready: boolean; error: Error | null }>({
    ready: !!window.google?.maps?.Map,
    error: null,
  });

  useEffect(() => {
    if (state.ready) return;
    let cancelled = false;
    loadGoogleMapsApi(apiKey)
      .then(() => {
        if (!cancelled) setState({ ready: true, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ ready: false, error });
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return state;
}
