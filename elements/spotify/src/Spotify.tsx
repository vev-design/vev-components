import React from 'react';
import styles from './Spotify.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  link: string;
};

const initialValue = 'https://open.spotify.com/track/4udM5F0AyU3OKKyZdlMt7P?si=f2972e9517804a14';

const Spotify = ({ link = initialValue }: Props) => {
  const url = link.replace('open.spotify.com/', 'open.spotify.com/embed/');
  const spotifyEmbed =
    url.indexOf('open.spotify.com/embed') !== -1 ? (
      <iframe
        className={styles.iframe}
        src={url}
        width="100%"
        height="100%"
        allowTransparency={true}
        allow="encrypted-media"
      />
    ) : (
      <h3
        style={{
          textAlign: 'center',
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
        }}
      >
        {'Invalid Spotify link'}
      </h3>
    );

  return <div className={styles.wrapper}>{spotifyEmbed}</div>;
};

registerVevComponent(Spotify, {
  name: 'Spotify',
  description: 'Embed a Spotify music player directly to your canvas.',
  props: [
    {
      title: 'Spotify link',
      name: 'link',
      type: 'string',
      initialValue,
    },
  ],
  editableCSS: [],
});

export default Spotify;
