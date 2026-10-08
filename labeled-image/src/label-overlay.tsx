import React, { useEffect, useRef, useState } from 'react';
import { Label } from './types';
import { PlusIcon } from './plus-icon';
import styles from './label-overlay.module.css';
import { useDispatchVevEvent, WidgetNode } from '@vev/react';
import { EventTypes } from './even-types';

interface Props {
  labels: Label[];
  imageRef: React.RefObject<HTMLImageElement>;
  showLabelIndex: boolean;
  customHotspot?: {
    mainComponent: string;
    variant?: string;
  };
  /** Child frame keys of the component. A label popup only renders if its frame is still a child. */
  popups: string[];
  /** The child frame open on the editor canvas */
  activePopup?: string;
}

export function LabelOverlay({
  labels,
  imageRef,
  showLabelIndex,
  customHotspot,
  popups,
  activePopup,
}: Props) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const [openIndex, setOpenIndex] = useState<number>(-1);

  const openLabel = labels?.find((label) => {
    if (!label.popup || !popups.includes(label.popup)) return false;
    return activePopup ? activePopup === label.popup : openIndex === label.index;
  });

  // The editor measures a child frame with offsetLeft/offsetTop and expects its offset parent at
  // the component's top-left. So the layer sits at (0, 0) and places the popup with padding, not
  // with a transform or a positioned box.
  const renderPopup = () => {
    if (!openLabel || !rendered) return null;
    const x = rendered.offsetX + openLabel.pos.x * rendered.width - labelWidth / 2;
    const y = rendered.offsetY + openLabel.pos.y * rendered.height + labelWidth / 2;
    return (
      <div className={styles.popupLayer} style={{ paddingLeft: x, paddingTop: y }}>
        <div className={styles.popup}>
          <WidgetNode id={openLabel.popup} />
        </div>
      </div>
    );
  };
  const [rendered, setRendered] = useState<{
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [labelWidth, setLabelWidth] = useState(25);

  const dispatchVevEvent = useDispatchVevEvent();

  useEffect(() => {
    if (!imageRef?.current) return;
    const el = imageRef.current;

    const updateRect = () => {
      if (!imageRef?.current) return;

      // Find hotspot width
      if (labelRef.current) {
        setLabelWidth(labelRef.current.getBoundingClientRect().width);
      }

      const el = imageRef.current;
      const objectFit = getComputedStyle(el).objectFit ?? 'fill';

      const containerRect = el.getBoundingClientRect();
      const { naturalWidth, naturalHeight } = el;

      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      const imageAspect = naturalWidth / naturalHeight || 1;
      const containerAspect = containerWidth / containerHeight || 1;

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

  if (customHotspot) {
    let customHotspotElem = (
      <WidgetNode id={customHotspot.mainComponent} externalVariant={customHotspot.variant} />
    );

    return (
      <div className={styles.wrapper}>
        {rendered &&
          labels &&
          labels.map((label, index) => {
            return (
              <div
                ref={index === 0 ? labelRef : null}
                className={styles.mainComponentLabel}
                onMouseEnter={() => {
                  setHoverIndex(label.index);
                  dispatchVevEvent(EventTypes.LABEL_HOVER, {
                    [EventTypes.LABEL_HOVER]: label.index + 1,
                  });
                }}
                onMouseLeave={() => {
                  setHoverIndex(-1);
                }}
                key={label.index}
                onClick={() => {
                  setOpenIndex(openIndex === label.index ? -1 : label.index);
                  dispatchVevEvent(EventTypes.LABEL_CLICKED, {
                    [EventTypes.LABEL_CLICKED]: label.index + 1,
                  });
                }}
                style={{
                  transform: `translate(${
                    rendered.offsetX + label.pos.x * rendered.width - labelWidth / 2
                  }px, ${rendered.offsetY + label.pos.y * rendered.height - labelWidth / 2}px)`,
                }}
              >
                {customHotspotElem}
                {showLabelIndex && <span className={styles.indexBadge}>{label.index + 1}</span>}
                {label.caption && hoverIndex === label.index && (
                  <div className={styles.captionWrapper}>{label.caption}</div>
                )}
              </div>
            );
          })}
        {renderPopup()}
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {rendered &&
        labels &&
        labels.map((label, index) => {
          return (
            <div
              ref={index === 0 ? labelRef : null}
              className={styles.label}
              onMouseEnter={() => {
                setHoverIndex(label.index);
                dispatchVevEvent(EventTypes.LABEL_HOVER, {
                  [EventTypes.LABEL_HOVER]: label.index + 1,
                });
              }}
              onMouseLeave={() => {
                setHoverIndex(-1);
              }}
              key={label.index}
              onClick={() => {
                setOpenIndex(openIndex === label.index ? -1 : label.index);
                dispatchVevEvent(EventTypes.LABEL_CLICKED, {
                  [EventTypes.LABEL_CLICKED]: label.index + 1,
                });
              }}
              style={{
                transform: `translate(${
                  rendered.offsetX + label.pos.x * rendered.width - labelWidth / 2
                }px, ${rendered.offsetY + label.pos.y * rendered.height - labelWidth / 2}px)`,
              }}
            >
              {showLabelIndex ? <p>{label.index + 1}</p> : <PlusIcon />}
              {label.caption && hoverIndex === label.index && (
                <div className={styles.captionWrapper}>{label.caption}</div>
              )}
            </div>
          );
        })}
      {renderPopup()}
    </div>
  );
}
