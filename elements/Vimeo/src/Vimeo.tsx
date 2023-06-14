import React, { useEffect, useState } from 'react';
import styles from './Vimeo.module.css';
import { registerVevComponent, useEditorState, useVisible } from '@vev/react';
import { SilkeTextField } from '@vev/silke';

const defaultVideoUrl = 'https://vimeo.com/571600783';
const defaultVideoId = '571600783';

type Props = {
  autoplay: boolean;
  lazy: boolean;
  mute: boolean;
  disableControls: boolean;
  background: boolean;
  videoInfo: {
    videoUrl: string;
    videoId: string;
  };
  loop: boolean;
  videoId: string;
  hostRef: React.RefObject<HTMLDivElement>;
};

function getVimeoUrl(videoId, autoplay, loop, mute, disableControls, background, disabled) {
  const params = ['byline=1'];

  if (autoplay && !disabled) params.push('autoplay=1', 'muted=1');
  else if (mute) params.push('muted=1');
  if (loop) params.push('loop=1');
  if (disableControls) params.push('controls=0');
  if (background) params.push('background=1');

  return `https://player.vimeo.com/video/${videoId}?${params.join('&')}`;
}

function LazyLoad({ hostRef, children }) {
  const isVisible = useVisible(hostRef);
  return isVisible ? children : null;
}

const VimeoUrl = (props) => {
  const { fullUrl } = props.value;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      fetch('https://vimeo.com/api/oembed.json?url=' + fullUrl).then((raw) => {
        raw
          .json()
          .then((res) => {
            if (res.video_id) {
              setError(null);
              props.onChange({
                fullUrl,
                videoId: res.video_id,
              });
            }
          })
          .catch(() => {
            setError('Invalid Vimeo URL');
          });
      });
    } catch (e) {
      setError('Invalid Vimeo URL');
      props.onChange({
        fullUrl,
        videoId: defaultVideoId,
      });
    }
  }, [fullUrl]);

  return (
    <SilkeTextField
      label="Video URL"
      value={props.value.fullUrl}
      onChange={(value) => {
        props.onChange({ fullUrl: value, videoId: props.value.videoId });
      }}
      error={error}
    />
  );
};

const Vimeo = ({
  autoplay = false,
  lazy = false,
  mute = false,
  disableControls = false,
  background = false,
  videoInfo = {
    videoUrl: defaultVideoUrl,
    videoId: defaultVideoId,
  },
  loop = false,
  hostRef,
}: Props) => {
  const { disabled } = useEditorState();

  const iframe = (
    <iframe
      className={styles.frame}
      src={getVimeoUrl(
        videoInfo.videoId || defaultVideoId,
        autoplay,
        loop,
        mute,
        disableControls,
        background,
        disabled,
      )}
      id={`vimeo-${videoInfo.videoId}`}
      width="100%"
      height="100%"
      frameBorder="0"
      allowFullScreen
    />
  );
  return lazy && !disabled ? <LazyLoad hostRef={hostRef}>{iframe}</LazyLoad> : iframe;
};

registerVevComponent(Vimeo, {
  name: 'Vimeo',
  props: [
    {
      title: 'Vimeo video URL',
      name: 'videoInfo',
      type: 'object',
      fields: [
        {
          name: 'fullUrl',
          type: 'string',
        },
        {
          name: 'videoId',
          type: 'string',
        },
      ],
      initialValue: {
        fullUrl: defaultVideoUrl,
        videoId: defaultVideoId,
      },
      component: VimeoUrl,
    },
    { title: 'Autoplay', name: 'autoplay', type: 'boolean', initialValue: false },
    { title: 'Lazy load', name: 'lazy', type: 'boolean', initialValue: false },
    { title: 'Mute', name: 'mute', type: 'boolean', initialValue: false },
    { title: 'Disable controls', name: 'disableControls', type: 'boolean', initialValue: false },
    { title: 'Loop', name: 'loop', type: 'boolean', initialValue: false },
    { title: 'Background', name: 'background', type: 'boolean', initialValue: false },
  ],
  editableCSS: [
    {
      selector: styles.frame,
      properties: ['background'],
    },
  ],
  type: 'both',
});

export default Vimeo;
