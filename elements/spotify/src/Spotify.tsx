import React from 'react';
import styles from './Spotify.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  link: string;
};

const initialLink = 'https://open.spotify.com/track/4udM5F0AyU3OKKyZdlMt7P?si=f2972e9517804a14';

const Spotify = ({ link = initialLink }: Props) => {
  const url = link.replace('open.spotify.com/', 'open.spotify.com/embed/');
  const validUrl = url.indexOf('open.spotify.com/embed') !== -1;
  const spotifyEmbed = validUrl ? (
    <iframe
      src={url}
      className={styles.frameStyle}
      width="100%"
      height="100%"
      allowTransparency={true}
      allow="encrypted-media"
    />
  ) : (
    <h3>{'Invalid Spotify link'}</h3>
  );

  return (
    <div className={validUrl ? styles.wrapperStyleValid : styles.wrapperStyleInvalid}>
      {spotifyEmbed}
    </div>
  );
};

registerVevComponent(Spotify, {
  name: 'Spotify',
  description:
    'Embed a Spotify music player directly to your canvas.\\n\\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  props: [
    {
      title: 'Spotify link',
      name: 'link',
      type: 'string',
      initialValue: initialLink,
    },
  ],
});

export default Spotify;
