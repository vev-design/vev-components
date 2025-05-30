import React, { useEffect, useRef, useState } from 'react';
import { registerVevComponent, useDispatchVevEvent, useEditorState, useVevEvent } from '@vev/react';
import { Events, Interactions } from './events';
import { PlayIcon } from './icon/PlayIcon';
import { Button } from './button/Button';
import styles from './HTML5Audio.module.css';
import iconStyles from './icon/Icon.module.css';
import buttonStyles from './button/Button.module.css';
import timelineStyles from './timeline/Timeline.module.css';
import { PauseIcon } from './icon/PauseIcon';
import { Timeline } from './timeline/Timeline';
import { Timestamp } from './timestamp/Timestamp';

type Audio = {
  name: string;
  size: number;
  type: string;
  url: string;
};

type Props = {
  audioUrl?: Audio;
  audioUrlLink?: Audio;
  settings: {
    showControls: boolean;
    autoplay: boolean;
    loop: boolean;
  };
  design: {
    type: 'native' | 'custom';
  };
};

const HTML5Audio = (props: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { audioUrl, audioUrlLink, settings } = props;
  const showControls = settings?.showControls || true;
  const loop = settings?.loop || false;
  const autoplay = settings?.autoplay || false;
  const { disabled } = useEditorState();
  const shouldAutoPlay = !disabled && autoplay;
  const actualUrl = audioUrlLink ? audioUrlLink : audioUrl ? audioUrl.url : '';
  const dispatch = useDispatchVevEvent();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const type = props.design?.type || 'native';

  const [playerState, setPlayerState] = useState({
    playing: autoplay,
    volume: 100,
    playbackSpeed: 1,
  });

  console.log('playerState', playerState);

  useEffect(() => {
    if (disabled) audioRef.current?.pause();
  }, [disabled]);

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

  useVevEvent(Interactions.FADE_OUT, (args: { duration: number }) => {
    if (audioRef.current && !disabled) {
      // Fade out the audio over the given duration in 100 intervals
      const durationMs = (args?.duration || 1) * 1000;
      const intervalTime = durationMs / 100;

      const endVolume = 0;
      const step = audioRef.current.volume / 100;

      intervalRef.current = setInterval(() => {
        if (audioRef.current.volume > endVolume) {
          const newVolume = Math.max(audioRef.current.volume - step, 0);
          audioRef.current.volume = newVolume;
        } else {
          clearInterval(intervalRef.current);
          audioRef.current?.pause();
        }
      }, intervalTime);
    }
  });

  useVevEvent(Interactions.FADE_IN, (args: { duration: number }) => {
    if (audioRef.current && !disabled) {
      // Fade in the audio over the given duration in 100 intervals
      const durationMs = (args?.duration || 1) * 1000;
      const intervalTime = durationMs / 100;

      const endVolume = 1;
      const step = 1 / 100;

      // Set initial volume and play
      audioRef.current.volume = 0;
      audioRef.current.play();

      intervalRef.current = setInterval(() => {
        if (audioRef.current.volume < endVolume) {
          const newVolume = Math.min(audioRef.current.volume + step, 1);
          audioRef.current.volume = newVolume;
        } else {
          clearInterval(intervalRef.current);
        }
      }, intervalTime);
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
      audioRef.current.ontimeupdate = () => {
        dispatch(Events.CURRENT_TIME, {
          currentTime: audioRef.current.currentTime,
          percentage: (audioRef.current.currentTime / audioRef.current.duration) * 100,
        });
      };
    }
  }, [dispatch]);

  if (type === 'native') {
    return (
      <div className={styles.wrapper} key={`autoplay-${shouldAutoPlay}`}>
        <audio
          ref={audioRef}
          autoPlay={shouldAutoPlay}
          preload="none"
          controls={showControls}
          style={{ width: '100%', height: '100%' }}
          loop={loop}
          src={actualUrl as string}
        >
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} key={`autoplay-${shouldAutoPlay}`}>
      <audio
        ref={audioRef}
        autoPlay={shouldAutoPlay}
        preload="metadata"
        controls={showControls}
        style={{ display: 'none' }}
        loop={loop}
        src={actualUrl as string}
      >
        Your browser does not support the audio element.
      </audio>
      <div className={styles.customWrapper}>
        <Button
          onClick={() => {
            if (playerState.playing) {
              audioRef.current.pause();
              setPlayerState({ ...playerState, playing: false });
            } else {
              audioRef.current.play();
              setPlayerState({ ...playerState, playing: true });
            }
          }}
        >
          {playerState.playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Timeline audioElement={audioRef.current} />
        <Timestamp audioElement={audioRef.current} />
      </div>
    </div>
  );
};

registerVevComponent(HTML5Audio, {
  name: 'HTML5 Audio',
  description:
    'Embed a HTML5 audio player directly to your canvas.\n\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  editableCSS: [
    {
      title: 'Icon color',
      selector: iconStyles.icon,
      properties: ['color'],
    },
    {
      title: 'Play button color',
      selector: buttonStyles.button,
      properties: ['background'],
    },
    {
      title: 'Progress bar',
      selector: timelineStyles.barProgress,
      properties: ['background'],
    },
    {
      title: 'Progress bar background',
      selector: timelineStyles.bar,
      properties: ['background'],
    },
  ],
  props: [
    {
      name: 'audioUrlLink',
      title: 'Audio file URL',
      type: 'string',
      hidden: (context) => {
        return !!context.value.audioUrl;
      },
    },
    {
      name: 'audioUrl',
      title: 'Audio file upload',
      accept: 'audio/*',
      type: 'upload',
      maxSize: 75000,
      hidden: (context) => {
        return !!context.value.audioUrlLink;
      },
    },
    {
      name: 'design',
      title: 'Design',
      type: 'object',
      fields: [
        {
          name: 'type',
          type: 'select',
          initialValue: 'native',
          options: {
            display: 'dropdown',
            items: [
              { label: 'Native', value: 'native' },
              { label: 'Custom', value: 'custom' },
            ],
          },
        },
      ],
    },
    {
      name: 'settings',
      title: 'Settings',
      type: 'object',
      hidden: (context) => {
        console.log('context', context);
        return context.value?.design?.type === 'custom';
      },
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
    { type: Events.COMPLETE, description: 'On end' },
    { type: Events.CURRENT_TIME, description: 'On current time update' },
  ],
  interactions: [
    { type: Interactions.PLAY, description: 'Play' },
    { type: Interactions.PAUSE, description: 'Pause' },
    { type: Interactions.TOGGLE, description: 'Toggle play' },
    {
      type: Interactions.FADE_OUT,
      description: 'Fade out',
      args: [
        {
          name: 'duration',
          description: 'Duration of fade in seconds',
          type: 'number',
        },
      ],
    },
    {
      type: Interactions.FADE_IN,
      description: 'Fade in',
      args: [
        {
          name: 'duration',
          description: 'Duration of fade in seconds',
          type: 'number',
        },
      ],
    },
  ],
  type: 'standard',
});

export default HTML5Audio;
