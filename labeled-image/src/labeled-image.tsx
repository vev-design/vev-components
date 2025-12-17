import React, { useRef } from 'react';
import styles from './labeled-image.module.css';
import overlayStyles from './label-overlay.module.css';
import { registerVevComponent, useEditorState, useGlobalStore } from '@vev/react';
import { LabelEditorForm } from './form/label-editor-form';
import { LabelOverlay } from './label-overlay';
import { Label } from './types';
import { EventTypes } from './even-types';

type Props = {
  image: { key: string; url: string };
  labels: Label[];
  customHotspot: string;
};

const LabeledImage = ({ image, labels, customHotspot }: Props) => {
  const imageRef: React.RefObject<HTMLImageElement> = useRef<HTMLImageElement>(null);
  const { selected, disabled } = useEditorState();
  const interactionsOpen = useGlobalStore((state) => {
    return state.rightPanelTab === 'addons';
  }, []);

  const showNumbers = selected && interactionsOpen && disabled;

  if (!image) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <LabelOverlay
        customHotspot={customHotspot}
        labels={labels}
        imageRef={imageRef}
        showLabelIndex={showNumbers}
      />
      <img ref={imageRef} src={image.url} className={styles.image} />
    </div>
  );
};

registerVevComponent(LabeledImage, {
  name: 'LabeledImage',
  emptyState: {
    action: 'OPEN_PROPERTIES',
    linkText: 'Select',
    description: 'an image to start',
    checkProperty: 'image',
  },
  props: [
    {
      name: 'image',
      type: 'image',
      clearProps: ['labels'],
    },
    {
      name: 'labels',
      type: 'array',
      of: [
        {
          name: 'pos',
          type: 'string',
        },
      ],
      hidden: (context) => {
        return !context.value.image;
      },
      component: LabelEditorForm,
    },
    {
      name: 'customHotspot',
      type: 'mainComponent',
      description: 'Custom hotspots are main components that are used in the project',
      hidden: (context) => {
        return !context.value.image;
      },
    },
  ],
  events: [
    {
      type: EventTypes.LABEL_CLICKED,
      description: 'On label click',
      args: [
        {
          name: EventTypes.LABEL_CLICKED,
          description: 'Label number clicked',
          type: 'number',
        },
      ],
    },
    {
      type: EventTypes.LABEL_HOVER,
      description: 'On label hover',
      args: [
        {
          name: EventTypes.LABEL_HOVER,
          description: 'Label number hovered',
          type: 'number',
        },
      ],
    },
  ],
  editableCSS: [
    {
      title: 'Image',
      selector: styles.image,
      properties: ['object-fit'],
    },
    {
      title: 'Hotspot',
      selector: overlayStyles.label,
      properties: ['background', 'border', 'border-radius', 'box-shadow', 'color'],
    },
    {
      title: 'Label',
      selector: overlayStyles.captionWrapper,
      properties: [
        'padding',
        'margin',
        'background',
        'border',
        'border-radius',
        'box-shadow',
        'color',
        'margin',
        'transform',
        'font',
        'font-size',
        'font-family',
        'font-family',
        'font-size',
        'font-style',
        'letter-spacing',
        'word-spacing',
        'font-weight',
        'color',
        'text-align',
        'text-decoration',
        'line-height',
      ],
    },
  ],
  type: 'both',
});

export default LabeledImage;
