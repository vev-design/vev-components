import React, { useEffect, useState } from 'react';
import { Label } from '../types';
import { PlusIcon } from '../plus-icon';
import styles from './label-overlay-editor.module.css';

interface Props {
  labels: Label[];
  imageRef: React.RefObject<HTMLImageElement>;
  onHover: (index: number) => void;
  onClick: (index: number) => void;
  hoverIndex: number | null;
  editIndex: number | null;
}

export function LabelOverlayEditor({
  labels,
  imageRef,
  onHover,
  onClick,
  hoverIndex,
  editIndex,
}: Props) {
  const [rendered, setRendered] = useState<{
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

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
    <div style={{ position: 'absolute', top: 0, left: 0 }}>
      {rendered &&
        labels &&
        labels.map((label, index) => (
          <div
            onMouseEnter={() => {
              onHover(index);
            }}
            onClick={() => {
              onClick(index);
            }}
            className={hoverIndex === index ? `${styles.active} ${styles.label}` : styles.label}
            key={index}
            style={{
              transform: `translate(${rendered.offsetX + label.pos.x * rendered.width - 25}px, ${
                rendered.offsetY + label.pos.y * rendered.height - 25
              }px)`,
              color: 'black',
            }}
          >
            <PlusIcon />
          </div>
        ))}
    </div>
  );
}
