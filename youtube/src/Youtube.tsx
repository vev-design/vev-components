import React, { useEffect, useRef } from 'react';
import styles from './Youtube.module.css';
import { registerVevComponent, useDispatchVevEvent, useEditorState, useVevEvent } from '@vev/react';

type Props = {
  videoId: string;
  settings: {
    autoplay: boolean;
    hideControls: boolean;
    hideFullScreen: boolean;
    loop: boolean;
    lockAspectRatio: boolean;
  };
};

declare global {
  const YT: any;
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

function youTubeParseUrl(url = ''): string {
  const regexp =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  const matches = url.match(regexp);

  if (matches) return matches[1];
  return undefined;
}

enum YoutubeInteraction {
  play = 'play',
  restart = 'restart',
  togglePlay = 'togglePlay',
  pause = 'pause',
  mute = 'mute',
  unMute = 'unMute',
  toggleSound = 'toggleSound',
}

enum YoutubeEvent {
  onPlay = 'onPlay',
  onPause = 'onPause',
  onEnd = 'onEnd',
  currentTime = 'currentTime',
}

const Youtube = ({ videoId, settings }: Props) => {
  // Default values
  const autoplay = settings?.autoplay;
  const hideControls = settings?.hideControls;
  const hideFullScreen = settings?.hideFullScreen;
  const loop = settings?.loop;
  const lockAspectRatio = settings?.lockAspectRatio;

  const { disabled } = useEditorState();
  const ref = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(-1);
  const currentTimeRef = useRef<number>();
  const dispatch = useDispatchVevEvent();

  useVevEvent(YoutubeInteraction.play, () => playerRef.current?.playVideo());
  useVevEvent(YoutubeInteraction.togglePlay, () => {
    const player = playerRef.current;
    if (player) {
      switch (player.getPlayerState()) {
        case YT.PlayerState.PLAYING:
          player.pauseVideo();
          break;
        case YT.PlayerState.PAUSED:
          player.playVideo();
          break;
        case YT.PlayerState.ENDED:
          player.seekTo(0);
          player.playVideo();
          break;
      }
    }
  });
  useVevEvent(YoutubeInteraction.restart, () => playerRef.current?.seekTo());
  useVevEvent(YoutubeInteraction.pause, () => playerRef.current?.pauseVideo());

  useVevEvent(YoutubeInteraction.mute, () => playerRef.current?.mute());
  useVevEvent(YoutubeInteraction.unMute, () => playerRef.current?.unMute());
  useVevEvent(YoutubeInteraction.toggleSound, () =>
    playerRef.current?.isMuted() ? playerRef.current?.unMute() : playerRef.current?.mute(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());

        if (currentTime !== currentTimeRef.current) {
          currentTimeRef.current = currentTime;
          dispatch(YoutubeEvent.currentTime, {
            currentTime,
          });
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [dispatch]);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    if (typeof YT === 'undefined') {
      const tag = document.createElement('script');

      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new YT.Player(ref.current, {
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    }

    function onPlayerReady(event) {}

    function onPlayerStateChange(event) {
      console.log('event', event);
      switch (event.data) {
        case YT.PlayerState.PLAYING:
          dispatch(YoutubeEvent.onPlay);
          break;
        case YT.PlayerState.PAUSED:
          dispatch(YoutubeEvent.onPause);
          break;
        case YT.PlayerState.ENDED:
          dispatch(YoutubeEvent.onEnd);
          break;
      }
    }
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!player.pauseVideo) return;
    if (disabled) player.pauseVideo();
    else if (autoplay) player.playVideo();
  }, [disabled]);

  let src = 'https://www.youtube.com/embed/';

  if (videoId) src += youTubeParseUrl(videoId) + '?';

  if (!disabled && autoplay) src += '&autoplay=1&mute=1';

  if (hideControls) src += '&controls=0';

  if (hideFullScreen) src += '&fs=0';

  if (loop) src += '&loop=1&playlist=' + youTubeParseUrl(videoId);

  /** Need to enable js api */
  src += '&enablejsapi=1';

  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.frame}
        style={lockAspectRatio ? { aspectRatio: '16 / 9' } : { height: '100%' }}
        ref={ref}
        src={src}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};

registerVevComponent(Youtube, {
  name: 'YouTube player',
  description:
    'Provide a Youtube URL (ex. https://www.youtube.com/watch?v=K_OiQguFo94&t=12s) to play a video inside a Youtube player.',
  icon: 'https://cdn.vev.design/assets/youtube.svg',
  emptyState: {
    linkText: 'Add URL',
    description: ' to your YouTube component',
    checkProperty: 'videoId',
    action: 'OPEN_PROPERTIES',
  },
  size: {
    width: 512,
    height: 500,
  },
  props: [
    {
      name: 'videoId',
      title: 'YouTube URL',
      type: 'string',
      options: {
        multiline: true,
      }
    },
    {
      title: 'Settings',
      name: 'settings',
      type: 'object',
      fields: [
        {
          name: 'autoplay',
          title: 'Autoplay',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'hideControls',
          title: 'Hide controls',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'hideFullScreen',
          title: 'Hide fullscreen',
          type: 'boolean',
          initialValue: false,
        },
        { name: 'loop', title: 'Loop video', type: 'boolean', initialValue: false },
        {
          name: 'lockAspectRatio',
          title: 'Lock aspect ratio',
          type: 'boolean',
          initialValue: true,
        },
      ],
    },
  ],
  type: 'both',
  events: [
    {
      type: YoutubeEvent.onPlay,
      description: 'On play',
    },
    {
      type: YoutubeEvent.onPause,
      description: 'On pause',
    },
    {
      type: YoutubeEvent.onEnd,
      description: 'On end',
    },
    {
      type: YoutubeEvent.currentTime,
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
      type: YoutubeInteraction.play,
      description: 'Play',
    },
    {
      type: YoutubeInteraction.restart,
      description: 'Restart',
    },
    {
      type: YoutubeInteraction.togglePlay,
      description: 'Toggle play',
    },
    {
      type: YoutubeInteraction.pause,
      description: 'Pause',
    },
    {
      type: YoutubeInteraction.mute,
      description: 'Mute',
    },
    {
      type: YoutubeInteraction.unMute,
      description: 'Unmute',
    },
    {
      type: YoutubeInteraction.toggleSound,
      description: 'Toggle sound',
    },
  ],
  editableCSS: [
    {
      title: 'Border',
      selector: styles.frame,
      properties: ['border', 'border-radius'],
    },
  ],
});

export default Youtube;
