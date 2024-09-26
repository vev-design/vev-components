import { SilkeBox, SilkeButton, SilkeCssNumberField } from '@vev/silke';
import React from 'react';
import { FIELD_WIDTH } from '../animation';
import { KeyframeFieldProps, toPercentString } from './utils';

export function ScaleField({ value, onChange }: KeyframeFieldProps) {
  let [x, y] = value?.split(' ') || [];
  if (!x) x = '1';
  const locked = !y;
  if (!y) y = x;
  return (
    <SilkeBox gap="s">
      <SilkeCssNumberField
        label="Scale X"
        value={toPercentString(x)}
        width={FIELD_WIDTH - 16}
        onChange={(x) =>
          locked ? onChange(`${parseInt(x) / 100}`) : onChange(`${parseInt(x) / 100} ${y}`)
        }
      />
      <SilkeButton
        icon="lock"
        size="s"
        kind="ghost"
        selected={locked}
        onClick={() => {
          if (locked) onChange(`${x} ${x}`);
          else onChange(`${x}`);
        }}
      />
      <SilkeCssNumberField
        label="Scale Y"
        value={toPercentString(y)}
        width={FIELD_WIDTH - 16}
        onChange={(y) =>
          locked ? onChange(`${parseInt(y) / 100}`) : onChange(`${x} ${parseInt(y) / 100}`)
        }
      />
      <SilkeButton
        icon="redo"
        disabled={!value}
        size="s"
        kind="ghost"
        onClick={() => onChange(null)}
      />
    </SilkeBox>
  );
}
