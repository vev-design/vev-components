import React from 'react';
import { SchemaFieldProps, SchemaFieldTypes } from '@vev/react';
import { SilkeBox, SilkeText, SilkeOverflowMenu, SilkeSlider } from '@vev/silke';

import styles from './SpeedSlider.module.css';

const MAX = 3;
const MIN = -1;

const SpeedSlider = ({ value = 1, onChange }: SchemaFieldProps<SchemaFieldTypes['number']>) => {
  const currentValue = (value - MIN) / (MAX - MIN);

  const onSlide = (percentage: number) => {
    // Snap to 1 if value within +- 20
    const newValue = percentage * (MAX - MIN) + MIN;
    const snap = newValue > 0.8 && newValue < 1.2;
    onChange(snap ? 1 : newValue);
  };

  const onReset = () => {
    onChange(1);
  };

  return (
    <SilkeBox column flex gap="s">
      <SilkeBox flex gap="m" hAlign="spread">
        <SilkeText tag="label">Speed</SilkeText>
        <SilkeOverflowMenu
          icon="menuMore"
          kind="ghost"
          size="s"
          items={[
            {
              label: `Reset speed`,
              value: 'reset',
              onClick: () => onReset(),
            },
          ]}
        />
      </SilkeBox>
      <SilkeBox column flex gap="m">
        <div className={styles.wrapper}>
          <SilkeSlider value={currentValue} onChange={onSlide} />
        </div>
      </SilkeBox>
    </SilkeBox>
  );
};

export default SpeedSlider;
