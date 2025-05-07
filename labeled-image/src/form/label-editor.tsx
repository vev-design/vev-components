import React, { useRef } from 'react';
import { SilkeBox } from '@vev/silke';
import { Label } from '../types';
import { LabelOverlay } from '../label-overlay';

interface Props {
  url: string;
  onAdd: (label: Label) => void;
  onRemove: (index: number) => void;
  labels: Label[];
}

export function LabelEditor({ url, onAdd, labels, onRemove }: Props) {
  const imageRef: React.RefObject<HTMLImageElement> = useRef<HTMLImageElement>(null);

  return (
    <SilkeBox className="0VyhAd5iXt0qzoeEKTzD_LabeledImage">
      <SilkeBox>
        <LabelOverlay labels={labels} imageRef={imageRef} />
        <img
          ref={imageRef}
          src={url}
          style={{ width: '100%' }}
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
  );
}
