import { SilkeBox, SilkeButton, SilkeCssNumberField, SilkeIcon } from '@vev/silke';
import React from 'react';
import { KeyframeFieldProps, toPercentString } from './utils';

export function RotateFiled({ value, onChange }: KeyframeFieldProps) {
  let [rotate, rotateX, rotateY, rotateZ] = value?.split(' ') || ['0deg', '0', '0', '1'];
  if (!rotateX) rotateX = '0';
  if (!rotateY) rotateY = '0';
  if (!rotateZ) rotateZ = '1';

  const handleRotateChange = (rotate: string) => {
    if (rotateX === '0' && rotateY === '0') onChange(rotate);
    else onChange(`${rotate} ${rotateX} ${rotateY} ${rotateZ}`);
  };

  return (
    <SilkeBox gap="s">
      <SilkeCssNumberField
        label={<SilkeIcon icon="rotate" />}
        value={rotate || '0deg'}
        width={60}
        onChange={handleRotateChange}
      />
      <SilkeCssNumberField
        label="X"
        value={toPercentString(rotateX)}
        width={60}
        onChange={(value) => onChange(`${rotate} ${parseInt(value) / 100} ${rotateY} ${rotateZ}`)}
      />
      <SilkeCssNumberField
        label="Y"
        value={toPercentString(rotateY)}
        width={60}
        onChange={(value) => onChange(`${rotate} ${rotateX} ${parseInt(value) / 100} ${rotateZ}`)}
      />
      <SilkeCssNumberField
        label="Z"
        value={toPercentString(rotateZ)}
        width={60}
        onChange={(value) => {
          onChange(`${rotate} ${rotateX} ${rotateY} ${parseInt(value) / 100}`);
        }}
      />
      <SilkeButton
        disabled={!value}
        icon="redo"
        size="s"
        kind="ghost"
        onClick={() => onChange(null)}
      />
    </SilkeBox>
  );
}
