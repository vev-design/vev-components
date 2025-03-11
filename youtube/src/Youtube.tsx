import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Youtube.module.css';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useEditorState,
  useVevEvent,
  useTracking,
} from '@vev/react';
import YouTube from 'react-youtube';
import OnStateChangeEvent = YT.OnStateChangeEvent;
import Player = YT.Player;

type Props = {
  videoId: string;
  settings: {
    autoplay: boolean;
    hideControls: boolean;
    hideFullScreen: boolean;
    loop: boolean;
    lockAspectRatio: boolean;
  };
  hostRef: React.RefObject<HTMLDivElement>;
};

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

const Youtube = ({ videoId, settings, hostRef }: Props) => {
  // Default values
  const autoplay = settings?.autoplay;
  const hideControls = settings?.hideControls;
  const hideFullScreen = settings?.hideFullScreen;
  const loop = settings?.loop;
  const lockAspectRatio = settings?.lockAspectRatio;
  const playerState = useRef<YT.PlayerState>(2);
  const [player, setPlayer] = useState<Player | null>(null);

  const { disabled } = useEditorState();
  const currentTimeRef = useRef<number>();
  const dispatch = useDispatchVevEvent();
  const dispatchTrackingEvent = useTracking();

  const cleanVideoId = useMemo(() => {
    return youTubeParseUrl(videoId);
  }, [videoId]);

  function onPlayerStateChange(event: OnStateChangeEvent) {
    if (typeof YT === 'undefined') return;
    playerState.current = event.data;

    const percentagePlayed = Math.floor((currentTimeRef.current / player?.getDuration()) * 100);

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        dispatchTrackingEvent('VEV_VIDEO_PLAY', {
          videoUrl: videoId,
          videoName: cleanVideoId,
          totalPlayTime: player?.getDuration(),
          percentagePlayed,
        });
        dispatch(YoutubeEvent.onPlay);
        break;
      case YT.PlayerState.PAUSED:
        dispatchTrackingEvent('VEV_VIDEO_STOP', {
          videoUrl: videoId,
          videoName: cleanVideoId,
          totalPlayTime: player?.getDuration(),
          percentagePlayed,
        });
        dispatch(YoutubeEvent.onPause);
        break;
      case YT.PlayerState.ENDED:
        dispatchTrackingEvent('VEV_VIDEO_END', {
          videoUrl: videoId,
          videoName: cleanVideoId,
          totalPlayTime: player?.getDuration(),
          percentagePlayed: 100,
        });
        dispatch(YoutubeEvent.onEnd);

        // playerVars doesn't always work so force loop here
        if (loop) {
          getPlayer().playVideo();
        }
        break;
    }
  }

  function getPlayer() {
    return player;
  }

  useVevEvent(YoutubeInteraction.play, () => {
    getPlayer()?.playVideo();
  });
  useVevEvent(YoutubeInteraction.togglePlay, () => {
    const player = getPlayer();
    switch (playerState.current) {
      case YT.PlayerState.PLAYING:
        player.pauseVideo();
        break;
      case YT.PlayerState.PAUSED:
        player.playVideo();
        break;
      case YT.PlayerState.CUED:
        player.playVideo();
        break;
      case YT.PlayerState.ENDED:
        player.seekTo(0, false);
        player.playVideo();
        break;
    }
  });
  useVevEvent(YoutubeInteraction.restart, () => getPlayer()?.seekTo(0, true));
  useVevEvent(YoutubeInteraction.pause, () => getPlayer()?.pauseVideo());

  useVevEvent(YoutubeInteraction.mute, () => getPlayer()?.mute());
  useVevEvent(YoutubeInteraction.unMute, () => getPlayer()?.unMute());
  useVevEvent(YoutubeInteraction.toggleSound, () => {
    const player = getPlayer();
    return player?.isMuted() ? player?.unMute() : player?.mute();
  });

  useEffect(() => {
    async function handlePreview() {
      const player = await getPlayer();
      if (!player) return;
      if (!player.pauseVideo) return;
      if (disabled) player.pauseVideo();
      else if (autoplay) player.playVideo();
    }
    handlePreview();
  }, [disabled]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && player.getCurrentTime) {
        const currentTime = Math.floor(player?.getCurrentTime());
        if (currentTime !== currentTimeRef.current) {
          currentTimeRef.current = currentTime;
          dispatch(YoutubeEvent.currentTime, {
            currentTime,
          });
          dispatchTrackingEvent('VEV_VIDEO_PROGRESS', {
            videoUrl: videoId,
            videoName: cleanVideoId,
            progress: currentTime,
            totalPlayTime: player?.getDuration(),
            percentagePlayed: Math.floor((currentTime / player?.getDuration()) * 100),
          });
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [dispatch, player, videoId]);

  if (!videoId) return null;

  return (
    <div
      className={styles.wrapper}
      style={lockAspectRatio ? { aspectRatio: '16 / 9' } : { height: '100%' }}
    >
      <YouTube
        videoId={cleanVideoId}
        className={styles.frame}
        iframeClassName={styles.frame}
        onReady={(event) => {
          setPlayer(event.target);
        }}
        opts={{
          playerVars: {
            enablejsapi: 1,
            loop: loop ? 1 : 0,
            controls: hideControls ? 0 : 1,
            autoplay: !disabled && autoplay ? 1 : 0,
            fs: hideFullScreen ? 0 : 1,
          },
        }}
        onStateChange={onPlayerStateChange}
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
        type: 'url',
      },
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
