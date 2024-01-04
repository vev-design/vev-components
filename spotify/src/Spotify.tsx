import React, { useEffect, useRef, useState } from 'react';
import { registerVevComponent, useVevEvent, useDispatchVevEvent } from '@vev/react';
import { EventTypes, InteractionTypes } from './event-types';
import { useSpotifyEmbed } from './use-spotify-embed';
import TextFieldColumn from '../../shared-components/text-field-column';

declare global {
  interface Window {
    onSpotifyIframeApiReady: (api) => void;
    IFrameAPI: any;
  }
}

type Props = {
  link: string;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

const initialLink = 'https://open.spotify.com/track/4udM5F0AyU3OKKyZdlMt7P?si=f2972e9517804a14';

const Spotify = ({ link = initialLink }: Props) => {
  const [uri, setUri] = useState('');
  const id = useRef<string>(Date.now() + '');
  const containerRef = useRef<HTMLDivElement>();
  const dispatch = useDispatchVevEvent();

  const [embeddedController, isPaused] = useSpotifyEmbed(containerRef.current, id.current, uri);

  useVevEvent(InteractionTypes.PLAY, () => {
    if (embeddedController) {
      embeddedController.play();
    }
  });

  useVevEvent(InteractionTypes.PAUSE, () => {
    if (embeddedController) {
      embeddedController.pause();
    }
  });

  useVevEvent(InteractionTypes.TOGGLE, () => {
    if (embeddedController) {
      embeddedController.togglePlay();
    }
  });

  useVevEvent(InteractionTypes.PLAY_FROM_START, () => {
    if (embeddedController) {
      embeddedController.playFromStart();
    }
  });

  useEffect(() => {
    const match = /spotify.com\/([\d\w\/]*)/gm.exec(link);
    if (match && match[1]) {
      setUri('spotify:' + match[1].replace('/', ':'));
    }
  }, [link]);

  useEffect(() => {
    if (isPaused) {
      dispatch(EventTypes.PAUSED);
    } else {
      dispatch(EventTypes.PLAYING);
    }
  }, [dispatch, isPaused]);

  return <div ref={containerRef} />;
};

registerVevComponent(Spotify, {
  name: 'Spotify',
  description:
    'Embed a Spotify music player directly to your canvas.\\n\\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  props: [
    {
      title: 'Spotify URL',
      name: 'link',
      type: 'string',
      initialValue: initialLink,
      component: (context) => {
        return (
          <TextFieldColumn
            name="link"
            title="Spotify URL"
            placeholder="https://open.spotify.com/example"
            value={context.value}
            onChange={context.onChange}
            type="text"
          />
        );
      },
    },
  ],
  interactions: [
    {
      type: InteractionTypes.PLAY,
      description: 'Play',
    },
    {
      type: InteractionTypes.PLAY_FROM_START,
      description: 'Play from start',
    },
    {
      type: InteractionTypes.PAUSE,
      description: 'Pause',
    },
    {
      type: InteractionTypes.TOGGLE,
      description: 'Toggle',
    },
  ],
});

export default Spotify;
