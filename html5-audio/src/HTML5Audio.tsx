import React, { useEffect, useRef } from 'react';
import styles from './HTML5Audio.module.css';
import { registerVevComponent, useDispatchVevEvent, useEditorState, useVevEvent } from '@vev/react';
import { Events, Interactions } from './events';

type Audio = {
  name: string;
  size: number;
  type: string;
  url: string;
};

type Props = {
  audioUrl?: Audio;
  settings: {
    showControls: boolean;
    autoplay: boolean;
    loop: boolean;
  };
};

const HTML5Audio = (props: Props) => {
  const audioRef = useRef<HTMLAudioElement>();
  const { audioUrl, settings } = props;
  const showControls = settings?.showControls || true;
  const loop = settings?.loop || false;
  const autoplay = settings?.autoplay || false;
  const { disabled } = useEditorState();
  const shouldAutoPlay = !disabled && autoplay;
  const actualUrl = audioUrl ? audioUrl.url : '';
  const dispatch = useDispatchVevEvent();

  useVevEvent(Interactions.PLAY, () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  });

  useVevEvent(Interactions.PAUSE, () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  });

  useVevEvent(Interactions.TOGGLE, () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onplay = () => {
        dispatch(Events.PLAY);
      };
      audioRef.current.onpause = () => {
        dispatch(Events.PAUSE);
      };
      audioRef.current.onended = () => {
        dispatch(Events.COMPLETE);
      };
    }
  }, [dispatch]);

  return (
    <div className={styles.wrapper} key={`autoplay-${shouldAutoPlay}`}>
      <audio
        ref={audioRef}
        autoPlay={shouldAutoPlay}
        preload="none"
        controls={showControls}
        style={{ width: '100%', height: '100%' }}
        loop={loop}
      >
        <source src={actualUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

registerVevComponent(HTML5Audio, {
  name: 'HTML5 Audio',
  description:
    'Embed a HTML5 audio player directly to your canvas.\n\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  props: [
    {
      name: 'audioUrl',
      title: 'Audio file',
      type: 'upload',
      hidden: (context) => {
        return !!context.value.audioUrlLink;
      },
    },
    {
      name: 'settings',
      title: 'Settings',
      type: 'object',
      fields: [
        {
          name: 'showControls',
          title: 'Controls',
          type: 'boolean',
          initialValue: true,
        },
        {
          name: 'autoplay',
          title: 'Auto play',
          type: 'boolean',
          initialValue: false,
        },
        { name: 'loop', title: 'Loop', type: 'boolean', initialValue: false },
      ],
    },
  ],
  events: [
    { type: Events.PLAY, description: 'On play' },
    { type: Events.PAUSE, description: 'On pause' },
    { type: Events.COMPLETE, description: 'On complete' },
  ],
  interactions: [
    { type: Interactions.PLAY, description: 'Play' },
    { type: Interactions.PAUSE, description: 'Pause' },
    { type: Interactions.TOGGLE, description: 'Toggle playback' },
  ],
  type: 'standard',
});

export default HTML5Audio;
