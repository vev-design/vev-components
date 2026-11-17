import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Label } from './types';
import { PlusIcon } from './plus-icon';
import styles from './label-overlay.module.css';
import { useDispatchVevEvent, WidgetNode } from '@vev/react';
import { EventTypes } from './even-types';
import { placePopup } from './popup-placement';

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
  const labelRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const popupRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const [openIndex, setOpenIndex] = useState<number>(-1);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [rendered, setRendered] = useState<{
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const dispatchVevEvent = useDispatchVevEvent();

  const openLabel = labels?.find((label) => {
    if (!label.popup || !popups.includes(label.popup)) return false;
    return activePopup ? activePopup === label.popup : openIndex === label.index;
  });
  // A frame opened in the editor that no label links to still has to be on the canvas, or the
  // editor has nowhere to add elements. It is shown at the top-left corner.
  const popup =
    openLabel?.popup || (activePopup && popups.includes(activePopup) ? activePopup : undefined);

  const getAnchor = (label: Label) => ({
    x: rendered ? rendered.offsetX + label.pos.x * rendered.width : 0,
    y: rendered ? rendered.offsetY + label.pos.y * rendered.height : 0,
  });

  useEffect(() => {
    if (!imageRef?.current) return;
    const el = imageRef.current;

    const updateRect = () => {
      if (!imageRef?.current) return;

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

  // Place the popup next to its hotspot, inside the component. It is measured after it renders,
  // since its size comes from the style panel and its content, and it is re-placed when it resizes.
  useLayoutEffect(() => {
    const popupEl = popupRef.current;
    const box = imageRef.current;
    if (!popupEl || !box || !rendered) return;

    const place = () => {
      if (!openLabel) {
        setPopupPos({ x: 0, y: 0 });
        return;
      }
      const hotspotEl = labelRefs.current[openLabel.index];
      setPopupPos(
        placePopup({
          anchor: getAnchor(openLabel),
          hotspot: { width: hotspotEl?.offsetWidth || 0, height: hotspotEl?.offsetHeight || 0 },
          popup: { width: popupEl.offsetWidth, height: popupEl.offsetHeight },
          box: { width: box.clientWidth, height: box.clientHeight },
        }),
      );
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(popupEl);
    return () => observer.disconnect();
  }, [popup, openLabel, rendered, imageRef]);

  return (
    <div className={styles.wrapper}>
      {rendered &&
        labels &&
        labels.map((label) => {
          const anchor = getAnchor(label);
          return (
            <div
              ref={(el) => {
                labelRefs.current[label.index] = el;
              }}
              className={customHotspot ? styles.mainComponentLabel : styles.label}
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
                // Centre each hotspot on its point by its own size
                transform: `translate(${anchor.x}px, ${anchor.y}px) translate(-50%, -50%)`,
              }}
            >
              {customHotspot ? (
                <>
                  <WidgetNode
                    id={customHotspot.mainComponent}
                    externalVariant={customHotspot.variant}
                  />
                  {showLabelIndex && <span className={styles.indexBadge}>{label.index + 1}</span>}
                </>
              ) : showLabelIndex ? (
                <p>{label.index + 1}</p>
              ) : (
                <PlusIcon />
              )}
              {label.caption && hoverIndex === label.index && (
                <div className={styles.captionWrapper}>{label.caption}</div>
              )}
            </div>
          );
        })}
      {popup && rendered && (
        // The editor measures a child frame with offsetLeft/offsetTop and expects its offset parent
        // at the component's top-left. So the layer sits at (0, 0) and places the popup with
        // padding, not with a transform or a positioned box.
        <div
          className={styles.popupLayer}
          style={{ paddingLeft: popupPos.x, paddingTop: popupPos.y }}
        >
          <div ref={popupRef} className={styles.popup}>
            <WidgetNode id={popup} />
          </div>
        </div>
      )}
    </div>
  );
}
