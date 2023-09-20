import React from 'react';
import styles from './Youtube.module.css';
import { Icon, registerVevComponent, useEditorState } from '@vev/react';

type Props = {
  videoId: string;
  autoplay: boolean;
  hideControls: boolean;
  hideFullScreen: boolean;
  muted: boolean;
  loop: boolean;
};

function youTubeParseUrl(url = ''): string {
  const regexp =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  const matches = url.match(regexp);

  if (matches) return matches[1];
  return undefined;
}

const Youtube = ({
  videoId,
  autoplay = false,
  hideControls = false,
  hideFullScreen = false,
  loop = false,
  muted = false,
}: Props) => {
  const { disabled } = useEditorState();

  /** Video is not set. return */
  if (!videoId)
    return (
      <div className="no-video">
        <Icon className="icon" d="logo" />
      </div>
    );

  let src = 'https://www.youtube.com/embed/';

  if (videoId) src += youTubeParseUrl(videoId) + '?';

  if (!disabled && autoplay) src += '&autoplay=1';

  if (muted) src += '&mute=1';

  if (hideControls) src += '&controls=0';

  if (hideFullScreen) src += '&fs=0';

  if (loop) src += '&loop=1&playlist=' + youTubeParseUrl(videoId);

  /** Need to enable js api */
  src += '&enablejsapi=1';

  return (
    <iframe
      className={styles.frame}
      src={src}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    ></iframe>
  );
};

registerVevComponent(Youtube, {
  name: 'Youtube',
  description:
    'Provide a Youtube URL (ex. https://www.youtube.com/watch?v=K_OiQguFo94&t=12s) to play a video inside a Youtube player.',
  props: [
    { name: 'videoId', title: 'Video URL', type: 'string' },
    { name: 'autoplay', title: 'Autoplay', type: 'boolean', initialValue: false },
    { name: 'hideControls', title: 'Hide controls', type: 'boolean', initialValue: false },
    { name: 'hideFullScreen', title: 'Hide fullscreen', type: 'boolean', initialValue: false },
    { name: 'loop', title: 'Loop video', type: 'boolean', initialValue: false },
    { name: 'muted', title: 'Mute by default', type: 'boolean', initialValue: false },
  ],
  type: 'both',
});

export default Youtube;
