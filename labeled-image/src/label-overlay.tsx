import React, { useEffect, useState } from 'react';
import { Label } from './types';
import { PlusIcon } from './plus-icon';
import styles from './label-overlay.module.css';
import { useDispatchVevEvent } from '@vev/react';
import { EventTypes } from './even-types';

interface Props {
  labels: Label[];
  imageRef: React.RefObject<HTMLImageElement>;
  showLabelIndex: boolean;
}

export function LabelOverlay({ labels, imageRef, showLabelIndex }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const [rendered, setRendered] = useState<{
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const dispatchVevEvent = useDispatchVevEvent();

  useEffect(() => {
    if (!imageRef?.current) return;
    const el = imageRef.current;

    const updateRect = () => {
      if (!imageRef?.current) return;

      const el = imageRef.current;
      const styleMap = el.computedStyleMap();
      const objectFit = styleMap.get('object-fit')?.toString() ?? 'fill';

      const containerRect = el.getBoundingClientRect();
      const { naturalWidth, naturalHeight } = el;

      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      const imageAspect = naturalWidth / naturalHeight;
      const containerAspect = containerWidth / containerHeight;

      let renderedWidth, renderedHeight, offsetX, offsetY;

      if (objectFit === 'contain') {
        if (imageAspect > containerAspect) {
          renderedWidth = containerWidth;
          renderedHeight = containerWidth / imageAspect;
          offsetX = 0;
          offsetY = (containerHeight - renderedHeight) / 2;
        } else {
          renderedHeight = containerHeight;
          renderedWidth = containerHeight * imageAspect;
          offsetY = 0;
          offsetX = (containerWidth - renderedWidth) / 2;
        }
      } else if (objectFit === 'cover') {
        if (imageAspect > containerAspect) {
          // image is wider — cropped horizontally
          renderedHeight = containerHeight;
          renderedWidth = containerHeight * imageAspect;
          offsetY = 0;
          offsetX = (containerWidth - renderedWidth) / 2;
        } else {
          // image is taller — cropped vertically
          renderedWidth = containerWidth;
          renderedHeight = containerWidth / imageAspect;
          offsetX = 0;
          offsetY = (containerHeight - renderedHeight) / 2;
        }
      } else {
        // fill, none, scale-down (treat as fill)
        renderedWidth = containerWidth;
        renderedHeight = containerHeight;
        offsetX = 0;
        offsetY = 0;
      }

      setRendered({ width: renderedWidth, height: renderedHeight, offsetX, offsetY });
    };

    setTimeout(updateRect, 50);

    const observer = new ResizeObserver(updateRect);
    observer.observe(el);
    window.addEventListener('resize', updateRect);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
    };
  }, [imageRef]);

  return (
    <div className={styles.wrapper}>
      {rendered &&
        labels &&
        labels.map((label, index) => (
          <div
            className={styles.label}
            onMouseEnter={() => {
              setHoverIndex(index);
              dispatchVevEvent(EventTypes.LABEL_HOVER, {
                [EventTypes.LABEL_HOVER]: index,
              });
            }}
            onMouseLeave={() => {
              setHoverIndex(-1);
            }}
            key={index}
            onClick={() => {
              console.log(`Clicked ${index}`);
              dispatchVevEvent(EventTypes.LABEL_CLICKED, {
                [EventTypes.LABEL_CLICKED]: index,
              });
            }}
            style={{
              transform: `translate(${rendered.offsetX + label.pos.x * rendered.width - 25}px, ${
                rendered.offsetY + label.pos.y * rendered.height - 25
              }px)`,
            }}
          >
            {showLabelIndex ? <p>{index}</p> : <PlusIcon />}
            {label.caption && hoverIndex === index && (
              <div className={styles.captionWrapper}>{label.caption}</div>
            )}
          </div>
        ))}
    </div>
  );
}
