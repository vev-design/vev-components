import React, { useRef, useState } from 'react';
import { SilkeBox, SilkeButton, SilkeTextField } from '@vev/silke';
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
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;

              const normX = clickX / rect.width;
              const normY = clickY / rect.height;
              onAdd({ pos: { x: normX, y: normY } });
            }}
          />
        </SilkeBox>
      </SilkeBox>
      <SilkeBox column hPad="m" gap="s" style={{ minWidth: '180px' }} overflow="scroll-y">
        {labels &&
          labels.map((label, index) => {
            return (
              <SilkeBox key={index} column rounded="tiny">
                <SilkeBox
                  align
                  hPad="s"
                  gap="s"
                  onMouseEnter={() => {
                    setHoverIndex(index);
                  }}
                  bg={hoverIndex === index ? 'surface-3' : undefined}
                  rounded="tiny"
                >
                  {`Label ${index + 1}`}
                  <SilkeBox>
                    <SilkeButton
                      kind="ghost"
                      size="s"
                      icon="edit"
                      title="Edit caption"
                      onClick={() => {
                        if (editIndex === index) setEditIndex(-1);
                        else setEditIndex(index);
                      }}
                    />
                    <SilkeButton
                      kind="ghost"
                      size="s"
                      icon="delete"
                      title="Remove"
                      onClick={() => {
                        onRemove(index);
                      }}
                    />
                  </SilkeBox>
                </SilkeBox>
                {editIndex === index && (
                  <SilkeBox hPad="m">
                    <SilkeTextField
                      label="Caption"
                      value={label.caption}
                      onChange={(change) => {
                        onChange(index, { ...label, caption: change });
                      }}
                    />
                  </SilkeBox>
                )}
              </SilkeBox>
            );
          })}
      </SilkeBox>
    </SilkeBox>
  );
}
