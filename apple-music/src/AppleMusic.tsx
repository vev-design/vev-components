import React, { useEffect, useState } from 'react';
import styles from './AppleMusic.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  link: string;
};

const initialLink = 'https://embed.music.apple.com/us/album/thug-life-vol-1/1440793878?app=music';

const AppleMusic = ({ link = initialLink }: Props) => {
  const [src, setSrc] = useState<string>(null);

  useEffect(() => {
    if (!link) return;
    if (!link.includes('embed.music.apple.com')) {
      setSrc(link.replace(/music.apple.com/g, 'embed.music.apple.com'));
    } else setSrc(link);
  }, [link]);

  return (
    <iframe
      className={styles.frameStyle}
      allow="autoplay *; encrypted-media *;"
      height="450"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'url(https://tools.applemusic.com/en-us/lockup.svg?)',
      }}
      sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
      src={src}
    />
  );
};

registerVevComponent(AppleMusic, {
  name: 'Apple Music',
  description:
    'Embed an Apple music player directly to your canvas. \n\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  props: [
    {
      title: 'Apple Music URL',
      name: 'link',
      type: 'string',
      initialValue: initialLink,
      options: {
        multiline: true,
      },
    },
  ],
  icon: './apple-logo',
});

export default AppleMusic;
