import React, { useEffect, useState } from 'react';
import styles from './SoundCloud.module.css';
import { registerVevComponent, useEditorState } from '@vev/react';
import TextFieldColumn from '../../shared-components/text-field-column';

type Props = {
  url: string;
  color: string;
  autoplay: boolean;
  classic: boolean;
};

const initialLink = 'https://soundcloud.com/trending-music-nord/sets/indie';

const SoundCloud = (playerParams: Props) => {
  const [url, setUrl] = useState<string>(null);
  const { disabled } = useEditorState();

  useEffect(() => {
    const { url, color, autoplay, classic } = playerParams;
    let tmpUrl = 'https://w.soundcloud.com/player/?url=' + url;
    if (autoplay && !disabled) tmpUrl += '&auto_play=true';
    if (color) tmpUrl += '&color=%23' + playerParams.color;
    if (!classic) tmpUrl += '&visual=true';
    setUrl(tmpUrl);
  }, [playerParams, disabled]);

  return (
    <iframe
      className={styles.frameStyle}
      width="100%"
      height="100%"
      scrolling="no"
      allow="autoplay"
      src={url}
    />
  );
};

registerVevComponent(SoundCloud, {
  name: 'SoundCloud',
  props: [
    {
      name: 'url',
      title: 'SoundCloud URL',
      type: 'string',
      initialValue: initialLink,
      component: (context) => {
        return (
          <TextFieldColumn
            name="url"
            title="SoundCloud URL"
            placeholder="https://soundcloud.com/example"
            value={context.value}
            onChange={context.onChange}
            type="text"
          />
        );
      },
    },
    {
      name: 'classic',
      title: 'Classic look',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'autoplay',
      title: 'Autoplay',
      type: 'boolean',
      initialValue: false,
    },
  ],
});

export default SoundCloud;
