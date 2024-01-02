import React from 'react';
import { SchemaFieldProps, SchemaFieldTypes } from '@vev/react';
import { SilkeBox, SilkeText, SilkeTextSmall, SilkeSlider } from '@vev/silke';

import styles from './SpeedSlider.module.css';

const MAX = 20;
const MIN = 0;

const SpeedSlider = ({ value = 2, onChange }: SchemaFieldProps<SchemaFieldTypes['number']>) => {
  const currentValue = (value - MIN) / (MAX - MIN);

  const onSlide = (percentage: number) => {
    // Snap to 1 if value within +- 20
    const newValue = percentage * (MAX - MIN) + MIN;
    onChange(newValue);
  };

  return (
    <SilkeBox row flex gap="xs">
      <SilkeBox align="center" style={{ width: '80px' }}>
        <SilkeBox vAlign="center" flex>
          <SilkeTextSmall weight="strong">Speed</SilkeTextSmall>
        </SilkeBox>
      </SilkeBox>
      <SilkeBox column flex gap="s">
        <div className={styles.wrapper}>
          <SilkeSlider value={currentValue} onChange={onSlide} />
        </div>
      </SilkeBox>
    </SilkeBox>
  );
};

export default SpeedSlider;
