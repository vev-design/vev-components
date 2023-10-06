import { useEffect, useState } from 'react';

function getEmbeddedController(parent: HTMLDivElement, uri: string): Promise<any> {
  return new Promise((resolve) => {
    const spotifyDiv = document.createElement('div');
    parent.appendChild(spotifyDiv);

    if (!window.IFrameAPI) {
      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed-podcast/iframe-api/v1';
      document.body.appendChild(script);
      window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
        window.IFrameAPI = IFrameAPI;
        window.IFrameAPI.createController(
          spotifyDiv,
          {
            uri,
          },
          (embeddedController) => {
            resolve(embeddedController);
          },
        );
      };
    } else {
      window.IFrameAPI.createController(
        spotifyDiv,
        {
          uri,
        },
        (embeddedController) => {
          resolve(embeddedController);
        },
      );
    }
  });
}

export function useSpotifyEmbed(parent: HTMLDivElement, id: string, uri: string) {
  const [isPaused, setIsPaused] = useState(false);
  const [embeddedController, setEmbeddedController] = useState<any>();

  useEffect(() => {
    async function initSpotify() {
      const controller = await getEmbeddedController(parent, uri);
      controller.iframeElement.style.position = 'absolute';
      setEmbeddedController(controller);
    }

    if (!embeddedController && uri !== '' && parent) {
      initSpotify();
    }

    return () => {
      if (embeddedController) {
        embeddedController.destroy();
      }
    };
  }, [embeddedController, id, parent, uri]);

  useEffect(() => {
    if (embeddedController) {
      embeddedController.loadUri(uri);
    }
  }, [embeddedController, uri]);

  useEffect(() => {
    if (embeddedController) {
      embeddedController.addListener(
        'playback_update',
        (update: { data: { isPaused: boolean } }) => {
          setIsPaused(update.data.isPaused);
        },
      );
    }
  }, [embeddedController]);

  return [embeddedController, isPaused];
}
