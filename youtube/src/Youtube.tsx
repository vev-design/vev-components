import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import styles from './Youtube.module.css';
import { registerVevComponent, useDispatchVevEvent, useEditorState, useVevEvent } from '@vev/react';
import getManager from './video-manager';
import OnStateChangeEvent = YT.OnStateChangeEvent;

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

  // Add a random number to the ID in case the page contains the same video multiple times
  const playerId = useRef(Math.floor(Math.random() * 2000));

  const { disabled } = useEditorState();
  const currentTimeRef = useRef<number>();
  const dispatch = useDispatchVevEvent();

  const cleanVideoId = useMemo(() => {
    return youTubeParseUrl(videoId);
  }, [videoId]);

  const managedId = `${cleanVideoId}_${playerId.current}`;

  const onRefChange = useCallback(
    (node: HTMLIFrameElement) => {
      // iframe is mounted
      if (node) {
        const manager = getManager();
        manager.registerPlayer({
          videoId: managedId,
          el: node,
          onPlayerStateChange,
        });
      }
    },
    [managedId],
  );

  function onPlayerStateChange(event: OnStateChangeEvent) {
    if (typeof YT === 'undefined') return;
    playerState.current = event.data;
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

  async function getPlayer() {
    return await getManager().getPlayer(managedId);
  }

  useVevEvent(YoutubeInteraction.play, async () => {
    (await getPlayer())?.playVideo();
  });
  useVevEvent(YoutubeInteraction.togglePlay, async () => {
    const player = await getPlayer();
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
  useVevEvent(YoutubeInteraction.restart, async () => (await getPlayer())?.seekTo(0, true));
  useVevEvent(YoutubeInteraction.pause, async () => (await getPlayer())?.pauseVideo());

  useVevEvent(YoutubeInteraction.mute, async () => (await getPlayer())?.mute());
  useVevEvent(YoutubeInteraction.unMute, async () => (await getPlayer())?.unMute());
  useVevEvent(YoutubeInteraction.toggleSound, async () => {
    const player = await getPlayer();
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
    const interval = setInterval(async () => {
      const player = await getPlayer();
      if (player && player.getCurrentTime) {
        const currentTime = Math.floor(player.getCurrentTime());
        if (currentTime !== currentTimeRef.current) {
          currentTimeRef.current = currentTime;
          dispatch(YoutubeEvent.currentTime, {
            currentTime,
          });
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [dispatch]);

  let src = 'https://www.youtube.com/embed/';

  if (videoId) src += youTubeParseUrl(videoId) + '?';

  if (!disabled && autoplay) src += '&autoplay=1&mute=1';

  if (hideControls) src += '&controls=0';

  if (hideFullScreen) src += '&fs=0';

  if (loop) src += '&loop=1&playlist=' + cleanVideoId;

  /** Need to enable js api */
  src += '&enablejsapi=1';

  if (!videoId) return null;
  return (
    <div className={styles.wrapper}>
      <iframe
        id={managedId}
        className={styles.frame}
        style={lockAspectRatio ? { aspectRatio: '16 / 9' } : { height: '100%' }}
        ref={onRefChange}
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
