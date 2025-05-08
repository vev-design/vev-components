import React, { useRef } from 'react';
import styles from './LabeledImage.module.css';
import { Image, registerVevComponent } from '@vev/react';
import { LabelEditorForm } from './form/label-editor-form';
import { LabelOverlay } from './label-overlay';
import { Label } from './types';

type Props = {
  image: string;
  labels: Label[];
};

const LabeledImage = ({ image, labels }: Props) => {
  const imageRef: React.RefObject<HTMLImageElement> = useRef<HTMLImageElement>(null);
  if (!image) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <LabelOverlay labels={labels} imageRef={imageRef} />
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
  editableCSS: [
    {
      selector: styles.image,
      properties: ['object-fit'],
    },
  ],
  type: 'both',
});

export default LabeledImage;
