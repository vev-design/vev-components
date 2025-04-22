import React from 'react';
import styles from './Tidal.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  url: string;
};

const initialLink = 'https://embed.tidal.com/albums/75413011';

const Tidal = ({ url = initialLink }: Props) => {
  const validateId = (id: string) => {
    let url = id;
    if (url.match(/\/browse/g)) url = url.replace(/\/browse/g, '');
    if (url.match(/album/g) && !url.match(/albums/g)) url = url.replace(/album/g, 'albums');
    if (url.match(/track/g) && !url.match(/tracks/g)) url = url.replace(/track/g, 'tracks');
    if (url.match(/video/g) && !url.match(/videos/g)) url = url.replace(/video/g, 'videos');
    if (url.match(/playlist/g) && !url.match(/playlists/g))
      url = url.replace(/playlist/g, 'playlists');
    if (!url.match(/embed.tidal.com/g)) url = url.replace(/tidal.com/g, 'embed.tidal.com');
    return url;
  };

  return (
    <iframe
      className={styles.frameStyle}
      src={validateId(url)}
      allowFullScreen
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};

registerVevComponent(Tidal, {
  name: 'Tidal',
  emptyState: {
    linkText: 'Add URL',
    description: 'for Tidal player',
    checkProperty: 'url',
    action: 'OPEN_PROPERTIES',
  },
  description:
    'Embed a Tidal music player directly to your canvas. \n\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  props: [
    {
      title: 'Tidal URL',
      name: 'url',
      type: 'string',
      initialValue: initialLink,
      options: {
        multiline: true,
      },
    },
  ],
});

export default Tidal;
