import React from 'react';
import styles from './Youtube.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  title: string;
};

const Youtube = ({ title = 'Vev' }: Props) => {
  return (
    <iframe
      className={styles.frame}
      src="https://www.youtube.com/embed/lJIrF4YjHfQ"
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    ></iframe>
  );
};

registerVevComponent(Youtube, {
  name: 'Youtube',
  props: [{ name: 'title', type: 'string', initialValue: 'Vev' }],
  type: 'both',
});

export default Youtube;
