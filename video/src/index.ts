import { registerVevComponent } from '@vev/react';
import Video from './Video';
import styles from './Video.module.css';
import { VideoEvent, VideoInteraction } from './interactions';


registerVevComponent(Video, {
  name: 'Video',
  type: 'both',
  props: [
    { name: 'video', type: 'video' },
    { name: 'mute', type: 'boolean' },
    { name: 'controls', type: 'boolean', initialValue: true },
    { name: 'autoplay', type: 'boolean', initialValue: true },
    { name: 'loop', type: 'boolean' },
    { name: 'fill', type: 'boolean', initialValue: true },
    { name: 'disableTracking', type: 'boolean' },
    {
      name: 'preload',
      type: 'select',
      options: {
        display: 'dropdown',
        items: ['auto', 'metadata', 'none'].map((v) => ({
          value: v,
          label: v,
        })),
      },
      initialValue: 'auto',
    },
    { name: 'thumbnail', type: 'image' },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background', 'border', 'border-radius', 'box-shadow'],
    },
  ],
  events: [
    {
      type: VideoEvent.onPlay,
      description: 'On play',
    },
    {
      type: VideoEvent.onPause,
      description: 'On pause',
    },
    {
      type: VideoEvent.onEnd,
      description: 'On end',
    },
    {
      type: VideoEvent.currentTime,
      description: 'On play time',
      args: [
        {
          name: 'currentTime',
          description: 'currentTime',
          type: 'number',
        },
      ],
    },
  ],

  interactions: [
    {
      type: VideoInteraction.play,
      description: 'Play',
    },
    {
      type: VideoInteraction.restart,
      description: 'Restart',
    },
    {
      type: VideoInteraction.togglePlay,
      description: 'Toggle play',
    },
    {
      type: VideoInteraction.pause,
      description: 'Pause',
    },
    {
      type: VideoInteraction.mute,
      description: 'Mute',
    },
    {
      type: VideoInteraction.unMute,
      description: 'Unmute',
    },
    {
      type: VideoInteraction.toggleSound,
      description: 'Toggle sound',
    },
  ],
});

export default Video;
