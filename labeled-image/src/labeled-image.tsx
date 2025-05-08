import React, { useRef } from 'react';
import styles from './LabeledImage.module.css';
import overlayStyles from './label-overlay.module.css';
import { Image, registerVevComponent, useEditorState, useGlobalStore } from '@vev/react';
import { LabelEditorForm } from './form/label-editor-form';
import { LabelOverlay } from './label-overlay';
import { Label } from './types';
import { EventTypes } from './even-types';

type Props = {
  image: string;
  labels: Label[];
};

const LabeledImage = ({ image, labels }: Props) => {
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
      <LabelOverlay labels={labels} imageRef={imageRef} showLabelIndex={showNumbers} />
      <Image ref={imageRef} src={image} className={styles.image} />
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
      title: 'Container',
      selector: styles.wrapper,
      properties: ['background', 'border', 'border-radius', 'box-shadow'],
    },
    {
      title: 'Label',
      selector: overlayStyles.label,
      properties: ['background', 'border', 'border-radius', 'box-shadow', 'color'],
    },
    {
      title: 'Caption',
      selector: overlayStyles.captionWrapper,
      properties: [
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
      ],
    },
  ],
  type: 'both',
});

export default LabeledImage;
