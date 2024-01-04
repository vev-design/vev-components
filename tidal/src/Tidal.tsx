import React, { useState } from 'react';
import styles from './Tidal.module.css';
import { registerVevComponent } from '@vev/react';
import TextFieldColumn from '../../shared-components/text-field-column';

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
  description:
    'Embed a Tidal music player directly to your canvas. \n\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  props: [
    {
      title: 'Tidal URL',
      name: 'url',
      type: 'string',
      initialValue: initialLink,
      component: (context) => {
        return (
          <TextFieldColumn
            name="url"
            title="Tidal URL"
            placeholder="https://embed.tidal.com/example"
            value={context.value}
            onChange={context.onChange}
            type="text"
          />
        );
      },
    },
  ],
});

export default Tidal;
