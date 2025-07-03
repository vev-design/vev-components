import React, { useMemo, useRef, useState } from 'react';
import {
  SilkeBox,
  SilkeButton,
  SilkeDivider,
  SilkeIcon,
  SilkeText,
  SilkeTextField,
} from '@vev/silke';
import { Label } from '../types';
import { LabelOverlayEditor } from './label-overlay-editor';
import style from './label-overlay-editor.module.css';

interface Props {
  url: string;
  onAdd: (label: Label) => void;
  onChange: (index: number, label: Label) => void;
  onRemove: (index: number) => void;
  labels: Label[];
}

export function LabelEditor({ url, onAdd, labels, onRemove, onChange }: Props) {
  const imageRef: React.RefObject<HTMLImageElement> = useRef<HTMLImageElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number>(-1);

  const currentIndex = useMemo(() => {
    if (!labels || labels.length === 0) return -1;
    return labels
      .map((l) => l.index)
      .sort((a, b) => {
        return a - b;
      })
      .reverse()[0];
  }, [labels]);

  return (
    <SilkeBox style={{ minHeight: '80vh', maxHeight: '80vh' }}>
      <SilkeBox>
        <SilkeBox>
          <LabelOverlayEditor
            labels={labels}
            imageRef={imageRef}
            editIndex={editIndex}
            hoverIndex={hoverIndex}
            onClick={(index) => {
              setEditIndex(index);
            }}
            onHover={(index) => {
              setHoverIndex(index);
            }}
          />
          <img
            draggable={false}
            className={style.image}
            ref={imageRef}
            src={url}
            onClick={(e) => {
              const imageEl = e.currentTarget;
              const rect = imageEl.getBoundingClientRect();

              const { naturalWidth } = imageEl;
              const { naturalHeight } = imageEl;
              const containerWidth = rect.width;
              const containerHeight = rect.height;

              const imageAspect = naturalWidth / naturalHeight;
              const containerAspect = containerWidth / containerHeight;

              let renderedWidth, renderedHeight, offsetX, offsetY;

              if (imageAspect > containerAspect) {
                // image fits width
                renderedWidth = containerWidth;
                renderedHeight = containerWidth / imageAspect;
                offsetX = 0;
                offsetY = (containerHeight - renderedHeight) / 2;
              } else {
                // image fits height
                renderedHeight = containerHeight;
                renderedWidth = containerHeight * imageAspect;
                offsetY = 0;
                offsetX = (containerWidth - renderedWidth) / 2;
              }

              const clickX = e.clientX - rect.left - offsetX;
              const clickY = e.clientY - rect.top - offsetY;

              // Make sure click is inside the image
              if (clickX < 0 || clickY < 0 || clickX > renderedWidth || clickY > renderedHeight)
                return;

              const normX = clickX / renderedWidth;
              const normY = clickY / renderedHeight;

              onAdd({ pos: { x: normX, y: normY }, index: currentIndex + 1 });
            }}
          />
        </SilkeBox>
      </SilkeBox>
      <SilkeBox
        column
        hPad="m"
        gap="s"
        style={{ minWidth: '256px', maxWidth: '256px' }}
        hAlign="center"
      >
        <SilkeBox style={{ width: '100%' }}>
          <SilkeText weight="strong">Labels</SilkeText>
        </SilkeBox>
        {!labels.length && (
          <SilkeBox pad="m" rounded="small" bg="neutral-10" style={{ width: '100%' }}>
            <SilkeBox pad="l" style={{ width: '100%', textAlign: 'center' }} column vAlign hAlign>
              <SilkeIcon icon="hand.pointer" />
              <SilkeText size="small" color="neutral-70">
                Click anywhere on the image to add labels
              </SilkeText>
            </SilkeBox>
          </SilkeBox>
        )}
        {labels.length !== 0 && (
          <SilkeBox style={{ width: '100%' }}>
            <SilkeText size="small" color="neutral-70">
              Click on the image to add labels
            </SilkeText>
          </SilkeBox>
        )}
        {labels.map((label) => {
          return (
            <SilkeBox
              key={label.index}
              bg="neutral-10"
              column
              rounded="tiny"
              style={{ width: '100%' }}
            >
              <SilkeBox vPad="xs" hPad="s" vAlign="center" hAlign="spread">
                <SilkeText size="small">{`Label ${label.index + 1}`}</SilkeText>
                <SilkeButton
                  icon="delete"
                  size="s"
                  kind="ghost"
                  onClick={() => {
                    onRemove(label.index);
                  }}
                />
              </SilkeBox>
              <SilkeDivider dark />
              <SilkeBox vPad="s" hPad="s" vAlign="center" hAlign="spread">
                <SilkeTextField
                  size="s"
                  label="Caption"
                  value={label.caption}
                  onChange={(change) => {
                    onChange(label.index, { ...label, caption: change });
                  }}
                />
              </SilkeBox>
            </SilkeBox>
          );
        })}
      </SilkeBox>
    </SilkeBox>
  );
}
