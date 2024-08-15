import { registerVevComponent } from '@vev/react';
import { VideoScroll } from './video-scroll';
import { VideoScrollForm } from './video-scroll-form';
import styles from './video-scroll.module.scss';

registerVevComponent(VideoScroll, {
  name: 'Video Scroll',
  type: 'both',
  icon: 'https://cdn.vev.design/icons/video-scroll.png',
  description:
    'Adding an eye-catching video that plays while the user scrolls can lift your project and create a truly memorable experience. Video scroll is available as an element or an entire section.',
  props: [
    { name: 'images', type: 'array', of: 'string', component: VideoScrollForm },
    {
      name: 'offsetVideoStart',
      type: 'number',
      title: 'Offset video start',
      description: 'Move the video start position with % of viewport',
      initialValue: 0,
      options: {
        scale: 100,
        format: '%',
      },
    },
    {
      name: 'offsetVideoEnd',
      type: 'number',
      title: 'Offset video end',
      description: 'Move the video end position with % of viewport',
      initialValue: 0,
      options: {
        scale: 100,
        format: '%',
      },
    },
    {
      name: 'loopCount',
      type: 'number',
      title: 'Loop count',
      description: 'Loop the video for a set number of times',
      initialValue: 1,
    },
    {
      name: 'loopAlternate',
      type: 'boolean',
      title: 'Loop alternate direction',
      initialValue: false,
    },
  ],

  editableCSS: [
    {
      title: 'Container',
      selector: styles.imageHolder,
      properties: ['background', 'border', 'filter'],
    },
  ],
});

export default VideoScroll;
