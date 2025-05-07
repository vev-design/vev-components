import React, { useRef } from 'react';
import styles from './LabeledImage.module.css';
import { registerVevComponent, Image } from '@vev/react';
import { LabelEditorForm } from './form/label-editor-form';
import { SilkeBox } from '@vev/silke';
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

function getImageOffsetCoords(img: HTMLImageElement, naturalX: number, naturalY: number) {
  const container = img.parentElement;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;
  const renderedWidth = img.clientWidth;
  const renderedHeight = img.clientHeight;

  const { objectFit } = getComputedStyle(img);

  let scaleX = renderedWidth / imgWidth;
  let scaleY = renderedHeight / imgHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (objectFit === 'contain') {
    const ratio = Math.min(containerWidth / imgWidth, containerHeight / imgHeight);
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    offsetX = (containerWidth - finalWidth) / 2;
    offsetY = (containerHeight - finalHeight) / 2;
    scaleX = scaleY = ratio;
  }

  if (objectFit === 'cover') {
    const ratio = Math.max(containerWidth / imgWidth, containerHeight / imgHeight);
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    offsetX = (containerWidth - finalWidth) / 2;
    offsetY = (containerHeight - finalHeight) / 2;
    scaleX = scaleY = ratio;
  }

  return {
    x: offsetX + naturalX * scaleX,
    y: offsetY + naturalY * scaleY,
  };
}

export default LabeledImage;
