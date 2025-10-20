import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './Vimeo.module.css';
import {
  registerVevComponent,
  useEditorState,
  useVisible,
  useDispatchVevEvent,
  useVevEvent,
  useTracking,
} from '@vev/react';
import { SilkeTextField, SilkeBox } from '@vev/silke';

import Player from '@vimeo/player';
import { Events, Interaction } from './interactions';

const defaultVideoUrl = 'https://vimeo.com/571600783';
const defaultVideoId = '571600783';

type Props = {
  videoInfo: {
    videoUrl: string;
    videoId: string;
  };
  videoId: string;
  settings: {
    autoplay: boolean;
    lazy: boolean;
    mute: boolean;
    disableControls: boolean;
    loop: boolean;
    background: boolean;
    fill: boolean;
    autopause: boolean;
  };
  hostRef: React.RefObject<HTMLDivElement>;
};

function getVimeoUrl(videoId, autoplay, loop, mute, disableControls, background, disabled, autopause) {
  const params = ['byline=1'];

  if (autoplay && !disabled) params.push('autoplay=1', 'muted=1');
  else if (mute) params.push('muted=1');
  if (loop) params.push('loop=1');
  if (disableControls) params.push('controls=0');
  if (background) params.push('background=1');
  if (!autopause) params.push('autopause=0');

  return `https://player.vimeo.com/video/${videoId}?${params.join('&')}`;
}

function LazyLoad({ hostRef, children }) {
  const isVisible = useVisible(hostRef);
  return isVisible ? children : null;
}

const VimeoUrl = (props) => {
  const [error, setError] = useState<string | null>(null);
  const fullUrl = useMemo(() => {
    return props?.value?.fullUrl || props?.schema?.initialValue?.fullUrl;
  }, [props]);

  useEffect(() => {
    try {
      fetch('https://vimeo.com/api/oembed.json?url=' + fullUrl).then((raw) => {
        raw
          .json()
          .then((res) => {
            if (res.video_id) {
              setError(null);
              props.onChange({
                fullUrl,
                videoId: res.video_id,
              });
            }
          })
          .catch(() => {
            setError('Invalid Vimeo URL');
          });
      });
    } catch (e) {
      setError('Invalid Vimeo URL');
      props.onChange({
        fullUrl,
        videoId: defaultVideoId,
      });
    }
  }, [fullUrl]);

  return (
    <SilkeBox column gap="s" fill style={{ marginBottom: '16px' }}>
      <SilkeBox>
        <SilkeTextField
          label="Video URL"
          size="s"
          value={props.value?.fullUrl}
          onChange={(value) => {
            props.onChange({ fullUrl: value, videoId: props.value.videoId });
          }}
          error={error}
          multiline
        />
      </SilkeBox>
    </SilkeBox>
  );
};

const Vimeo = ({
  videoInfo = {
    videoUrl: defaultVideoUrl,
    videoId: defaultVideoId,
  },
  settings = {
    autoplay: false,
    lazy: false,
    mute: false,
    disableControls: false,
    loop: false,
    background: false,
    fill: false,
    autopause: false
  },
  hostRef,
}: Props) => {
  const { disabled } = useEditorState();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player>(null);
  const currentTime = useRef<number>(0);
  const dispatch = useDispatchVevEvent();
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const totalPlayTimeRef = useRef<number>(0);
  const dispatchTrackingEvent = useTracking();

  const autoplay = settings.autoplay || false;
  const lazy = settings.lazy || false;
  const mute = settings.mute || false;
  const disableControls = settings.disableControls || false;
  const autopause = settings.autopause || false;
  const background = settings.background || false;
  const loop = settings.loop || false;
  const fill = settings.fill || false;

  useVevEvent(Interaction.PLAY, async () => {
    await playerRef.current.play();
  });

  useVevEvent(Interaction.PAUSE, () => {
    playerRef.current.pause();
  });

  useVevEvent(Interaction.TOGGLE_PLAY, async () => {
    if (await playerRef.current.getPaused()) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  });

  useVevEvent(Interaction.MUTE, () => {
    playerRef.current.setMuted(true);
  });

  useVevEvent(Interaction.UNMUTE, () => {
    playerRef.current.setMuted(false);
  });

  useVevEvent(Interaction.TOGGLE_SOUND, async () => {
    if (await playerRef.current.getMuted()) {
      playerRef.current.setMuted(false);
    } else {
      playerRef.current.setMuted(true);
    }
  });

  const dispatchTracking = useCallback(async (eventName: string, currentSec?: number) => {
    const duration = Math.round(totalPlayTimeRef.current || await playerRef.current.getDuration().then((duration) => duration || 0));
    const percentagePlayed = Math.round((currentSec / duration) * 100);

    const trackingEvent = {
      videoUrl: defaultVideoUrl,
      videoName: defaultVideoId,
      totalPlayTime: duration,
      progress: currentSec,
      percentagePlayed,
    };

    dispatchTrackingEvent(eventName, trackingEvent);
  }, [dispatchTrackingEvent]);

  useEffect(() => {
    try {
      if (iframeRef.current) {
        const iframe = document.querySelector('iframe');
        const player = new Player(iframe);

        if (fill) {
          Promise.all([player.getVideoWidth(), player.getVideoHeight()]).then(([width, height]) => {
            setAspectRatio(width / height);
          });
        }
        playerRef.current = player;

        player.on('play', (event) => {
          dispatch(Events.ON_PLAY);
          const currentSec = Math.round(event.seconds);
          dispatchTracking('VEV_VIDEO_PLAY', currentSec);
        });

        player.on('pause', (event) => {
          dispatch(Events.ON_PAUSE);
          const currentSec = Math.round(event.seconds);
          dispatchTracking('VEV_VIDEO_STOP', currentSec);
        });

        player.on('ended', (event) => {
          dispatch(Events.ON_END);
          const currentSec = Math.round(event.seconds);
          dispatchTracking('VEV_VIDEO_END', currentSec);
        });

        player.on('timeupdate', (event) => {
          const currentSec = Math.round(event.seconds);
          if (currentSec !== currentTime.current) {
            currentTime.current = currentSec;
            dispatch(Events.CURRENT_TIME, {
              currentTime: currentSec,
            });
            dispatchTracking('VEV_VIDEO_PROGRESS', currentSec);
          }
        });
      }
    } catch (e) { }
  }, [iframeRef, fill]);

  let cl = styles.wrapper;
  if (fill) cl += ' ' + styles.fill;

  const iframe = (
    <iframe
      ref={iframeRef}
      className={styles.frame}
      style={
        fill && aspectRatio
          ? {
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            aspectRatio,
          }
          : null
      }
      src={getVimeoUrl(
        videoInfo.videoId || defaultVideoId,
        autoplay,
        loop,
        mute,
        disableControls,
        background,
        disabled,
        autopause,
      )}
      id={`vimeo-${videoInfo.videoId}`}
      width="100%"
      allow="autoplay"
      height="100%"
      frameBorder="0"
      allowFullScreen
    />
  );
  return (
    <div className={cl}>
      {lazy && !disabled ? <LazyLoad hostRef={hostRef}>{iframe}</LazyLoad> : iframe}
    </div>
  );
};

registerVevComponent(Vimeo, {
  name: 'Vimeo',
  props: [
    {
      title: 'Vimeo Link',
      name: 'videoInfo',
      type: 'object',
      fields: [
        {
          name: 'fullUrl',
          type: 'string',
        },
        {
          name: 'videoId',
          type: 'string',
        },
      ],
      initialValue: {
        fullUrl: defaultVideoUrl,
        videoId: defaultVideoId,
      },
      component: VimeoUrl,
    },
    {
      title: 'Settings',
      name: 'settings',
      type: 'object',
      fields: [
        {
          title: 'Autoplay',
          name: 'autoplay',
          type: 'boolean',
          initialValue: false,
        },
        {
          title: 'Auto pause',
          name: 'autopause',
          type: 'boolean',
          description: 'Whether to pause the video when another video starts playing',
          initialValue: false,
        },
        {
          title: 'Lazy load',
          name: 'lazy',
          type: 'boolean',
          initialValue: false,
        },
        { title: 'Mute', name: 'mute', type: 'boolean', initialValue: false },
        {
          title: 'Hide controls',
          name: 'disableControls',
          type: 'boolean',
          initialValue: false,
        },
        { title: 'Loop', name: 'loop', type: 'boolean', initialValue: false },
        {
          title: 'Use as background',
          name: 'background',
          type: 'boolean',
          initialValue: false,
          description: 'Will mute, autoplay and hide all elements in the player'
        },
        {
          title: 'Fill container',
          name: 'fill',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
  ],
  events: [
    {
      type: Events.ON_PLAY,
      description: 'On play',
    },
    {
      type: Events.ON_PAUSE,
      description: 'On pause',
    },
    {
      type: Events.ON_END,
      description: 'On end',
    },
    {
      type: Events.CURRENT_TIME,
      description: 'On play time',
      args: [
        {
          name: 'currentTime',
          description: 'currentTime',
          type: 'number',
        },
      ],
    },
  ],

  interactions: [
    {
      type: Interaction.PLAY,
      description: 'Play',
    },
    {
      type: Interaction.RESTART,
      description: 'Restart',
    },
    {
      type: Interaction.TOGGLE_PLAY,
      description: 'Toggle play',
    },
    {
      type: Interaction.PAUSE,
      description: 'Pause',
    },
    {
      type: Interaction.MUTE,
      description: 'Mute',
    },
    {
      type: Interaction.UNMUTE,
      description: 'Unmute',
    },
    {
      type: Interaction.TOGGLE_SOUND,
      description: 'Toggle sound',
    },
  ],
  editableCSS: [
    {
      selector: styles.frame,
      properties: ['background', 'border-radius', 'border', 'filter'],
    },
  ],
  type: 'both',
});

export default Vimeo;
