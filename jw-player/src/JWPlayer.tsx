import React, { useEffect, useRef } from 'react';
import { registerVevComponent, Tracking } from '@vev/react';
import { SilkeToastNotification } from '@vev/silke';
import './global.css';

type Props = {
  embedUrl: string;
  mute: boolean;
  autoplay: boolean;
  loop: boolean;
  controls: boolean;
  displayTitle: boolean;
  displayDescription: boolean;
  trackingName: string;
  stretch: 'uniform' | 'exactfit' | 'fill' | 'none';
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

declare const jwplayer, jwDefaults;
declare const System;

function getVideoUrl(embedUrl: string) {
  let playerElements: string[];
  const url =
    embedUrl &&
    embedUrl
      .replace(/(^\w+:|^)\/\//, '')
      .replace(/(\.html|\.js)/, '')
      .split('/');

  const last = url && url[url.length - 1];
  if (last && last.indexOf('-')) {
    playerElements = last.split('-');
  }

  const mediaId = playerElements ? playerElements[0] : null;
  const playerId = playerElements ? playerElements[1] : null;
  return { mediaId, playerId };
}

// https://cdn.jwplayer.com/players/ZqE14ayi-31Qc2eWV.js
// https://cdn.jwplayer.com/players/NIEAVfZc-31Qc2eWV.js

const JWPlayer = ({
  embedUrl = 'https://cdn.jwplayer.com/players/rZGxHwOi-mBecVbzv.js',
  mute = false,
  autoplay = false,
  loop = false,
  controls = true,
  displayTitle = false,
  displayDescription = false,
  trackingName = '',
  stretch = 'uniform',
  hostRef,
}: Props) => {
  const videoRef = useRef<HTMLDivElement>(null);
  console.log('embedUrl', embedUrl);

  const { mediaId, playerId } = getVideoUrl(embedUrl);

  const track = (action: string, value?: any) => {
    Tracking.send('video', 'JW player', action, trackingName || embedUrl, value);
  };

  useEffect(() => {
    // Tracking state - scoped to this effect instance
    let passedTenSeconds = false;
    let fifth = 1;
    let lastTrackedTime = 0;
    let playerInstance: any = null;
    let isMounted = true;

    // Throttle time event to reduce CPU usage
    // Only check every 0.5 seconds instead of every frame
    const THROTTLE_INTERVAL = 500; // milliseconds
    let lastTimeCheck = 0;

    const TRACKING = [
      {
        event: 'setupError',
        callback: ({ message }) => track('setupError', message),
      },
      {
        event: 'autostartNotAllowed',
        callback: () => track('autostartNotAllowed'),
      },
      {
        event: 'firstFrame',
        callback: () => track('Play'),
      },
      {
        event: 'time',
        callback: ({ currentTime, duration }) => {
          const now = Date.now();
          // Throttle: only process every THROTTLE_INTERVAL ms
          if (now - lastTimeCheck < THROTTLE_INTERVAL) {
            return;
          }
          lastTimeCheck = now;

          // Fire event at ten seconds
          if (currentTime > 10 && !passedTenSeconds) {
            passedTenSeconds = true;
            track('atTenSeconds');
          }

          // Fire events at every fifth of progress
          // Only check if we've moved forward significantly to avoid repeated checks
          if (currentTime > lastTrackedTime + 0.5 && currentTime > (fifth * duration) / 5) {
            track('videoProgress', fifth * 20);
            fifth++;
            lastTrackedTime = currentTime;
          }
        },
      },
      {
        event: 'pause',
        callback: () => track('Pause'),
      },
      {
        event: 'complete',
        callback: () => track('Finished'),
      },
    ];
    // End of tracking

    // Load account key from external resource
    System.import(`https://cdn.jwplayer.com/libraries/${playerId}.js`).then(() => {
      // Don't set up player if component unmounted
      if (!isMounted || !videoRef.current) {
        return;
      }

      const { key } = jwDefaults;

      const jwConfig = {
        autostart: autoplay ? 'viewable' : false,
        cast: {
          appid: '00000000',
        },
        controls: !!controls,
        displaydescription: displayDescription,
        displaytitle: displayTitle,
        flashplayer: '//ssl.p.jwpcdn.com/player/v/8.8.4/jwplayer.flash.swf',
        key,
        mute: true,
        ph: 3,
        pid: playerId,
        playbackRateControls: false,
        playlist: `//cdn.jwplayer.com/v2/media/${mediaId}?recommendations_playlist_id=irwrDqTZ`,
        preload: 'metadata',
        repeat: loop,
        stagevideo: false,
        stretching: stretch,
        width: '100%',
      };

      videoRef.current.innerHTML = '';
      const jwcontainer = document.createElement('div');
      jwcontainer.className = 'jwcontainer fill';
      videoRef.current.appendChild(jwcontainer);
      const jwElement = hostRef.current.querySelector('.jwcontainer');
      playerInstance = jwplayer(jwElement).setup(jwConfig);
      for (const event of TRACKING) playerInstance.on(event.event, event.callback);
    });

    // Cleanup function to prevent memory leaks and multiple instances
    return () => {
      isMounted = false;
      if (playerInstance) {
        try {
          // Remove all event listeners
          for (const event of TRACKING) {
            playerInstance.off(event.event, event.callback);
          }
          // Destroy the player instance
          playerInstance.remove();
        } catch (e) {
          // Ignore errors during cleanup
          console.warn('Error cleaning up JW Player:', e);
        }
        playerInstance = null;
      }
    };
  }, [
    playerId,
    mediaId,
    stretch,
    mute,
    autoplay,
    controls,
    loop,
    displayTitle,
    displayDescription,
    trackingName,
    embedUrl,
  ]);

  if (!embedUrl) {
    return <div className="fill placeholder">Please add an embedURL</div>;
  }
  return <div className="jw-wrapper" ref={videoRef} dangerouslySetInnerHTML={{ __html: '' }} />;
};

registerVevComponent(JWPlayer, {
  name: 'JW Player',
  icon: 'https://cdn.vev.design/private/pK53XiUzGnRFw1uPeFta7gdedx22/290xQI59a7_jwplayer.png.png',
  props: [
    {
      name: 'embedUrl',
      title: 'Enter Embed URL',
      description: 'Embed URL, i.e https://cdn.jwplayer.com/players/rZGxHwOi-mBecVbzv.js',
      type: 'string',
      initialValue: 'https://cdn.jwplayer.com/players/rZGxHwOi-mBecVbzv.js',
    },
    { name: 'mute', title: 'Mute', type: 'boolean', initialValue: false },
    {
      name: 'autoplay',
      title: 'Autoplay',
      description: 'Requires video to be muted',
      type: 'boolean',
      initialValue: false,
    },
    { name: 'loop', title: 'Loop', type: 'boolean', initialValue: false },
    {
      name: 'controls',
      title: 'Show controls',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'displayTitle',
      title: 'Display title',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'displayDescription',
      title: 'Display description',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'trackingName',
      title: 'Video tracking name',
      description: 'Only used for tracking. Defaults to Embed URL',
      type: 'string',
    },
    {
      name: 'stretch',
      title: 'Stretching',
      type: 'select',
      options: {
        items: [
          {
            label: 'Uniform - Fits JW Player, maintain aspect ratio',
            value: 'uniform',
          },
          {
            label: 'Exact Fit - Fits JW Player, stretch aspect ratio',
            value: 'exactfit',
          },
          { label: 'Fill - Zoom & Crop video to fill widget', value: 'fill' },
          { label: 'None - Actual size, with black borders', value: 'none' },
        ],
        display: 'dropdown',
      },
      initialValue: 'uniform',
    },
    {
      name: 'address',
      type: 'string',
      component: (props) => {
        return (
          <SilkeToastNotification
            dark
            fluid
            inline
            kind="information"
            subtitle="JW Player is a custom video player. These settings might differ from your player configuration"
          />
        );
      },
    },
  ],
  type: 'both',
});

export default JWPlayer;
