import React from 'react';
import styles from './HTML5Audio.module.css';
import { registerVevComponent, useEditorState } from '@vev/react';

type Audio = {
  name: string;
  size: number;
  type: string;
  url: string;
};

type Props = {
  audioUrl?: Audio;
  showControls: boolean;
  autoplay: boolean;
  loop: boolean;
};

const HTML5Audio = (props: Props) => {
  const { showControls, audioUrl, loop, autoplay } = props;
  const { disabled } = useEditorState();
  const shouldAutoPlay = !disabled && autoplay;

  return (
    <div className={styles.wrapper} key={`autoplay-${shouldAutoPlay}`}>
      <audio
        autoPlay={shouldAutoPlay}
        preload="none"
        controls={showControls}
        style={{ width: '100%', height: '100%' }}
        loop={loop}
      >
        <source src={audioUrl && audioUrl.url} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

registerVevComponent(HTML5Audio, {
  name: 'HTML5 Audio',
  description:
    'Embed a HTML5 audio player directly to your canvas.\n\n[Read documentation](https://help.vev.design/design/elements/audio-widgets?ref=addmenu)',
  props: [
    { name: 'audioUrl', title: 'Upload audio file', type: 'upload' },
    { name: 'showControls', title: 'Show controls', type: 'boolean', initialValue: true },
    { name: 'autoplay', title: 'Autoplay', type: 'boolean', initialValue: false },
    { name: 'loop', title: 'Loop audio', type: 'boolean', initialValue: false },
  ],
  type: 'standard',
});

export default HTML5Audio;
