import { SilkeBox, SilkeTextField, SilkeToggle } from '@vev/silke';
import React from 'react';
import { ChartDefinition } from '../../types';

export type BarChartOptions = {
  yAxisBars?: boolean;
};

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
}

export function BarChartOptionsForm({ value, onChange }: Props) {
  return (
    <SilkeBox>
      <SilkeToggle
        value={value.options?.yAxisBars}
        small
        label="Swap axis"
        onChange={(update) => {
          onChange({ options: { ...(value.options || {}), yAxisBars: update } });
        }}
      />
    </SilkeBox>
  );
}
