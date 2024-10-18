import React, { useEffect, useRef } from 'react';
import styles from './JWPlayer.module.css';
import { registerVevComponent, Tracking } from '@vev/react';
import { SilkeNotification } from '@vev/silke';

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

  const { mediaId, playerId } = getVideoUrl(embedUrl);

  const track = (action: string, value?: any) => {
    Tracking.send('video', 'JW player', action, trackingName || embedUrl, value);
  };

  let passedTenSeconds = false;
  let fifth = 1;
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
        // Fire event at ten seconds
        if (currentTime > 10 && !passedTenSeconds) {
          passedTenSeconds = true;
          track('atTenSeconds');
        }

        // Fire events at every fifth of progress
        if (currentTime > (fifth * duration) / 5) {
          track('videoProgress', fifth * 20);
          fifth++;
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

  useEffect(() => {
    // Load account key from external resource
    System.import(`https://cdn.jwplayer.com/libraries/${playerId}.js`).then(() => {
      const { key } = jwDefaults;

      const jwConfig = {
        aspectratio: '16:9',
        autostart: autoplay ? 'viewable' : false,
        cast: {
          appid: '00000000',
        },
        controls: !!controls,
        displaydescription: displayDescription,
        displaytitle: displayTitle,
        flashplayer: '//ssl.p.jwpcdn.com/player/v/8.8.4/jwplayer.flash.swf',
        height: 360,
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
      jwplayer(jwElement).setup(jwConfig);
      for (const event of TRACKING) jwplayer().on(event.event, event.callback);
    });
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
  ]);

  if (!embedUrl) {
    return <div className="fill placeholder">Please add an embedURL</div>;
  }
  return <div className={styles.wrapper} ref={videoRef} dangerouslySetInnerHTML={{ __html: '' }} />;
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
          <SilkeNotification
            dark
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
