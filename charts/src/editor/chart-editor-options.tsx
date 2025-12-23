import { SilkeBox, SilkeToggle } from '@vev/silke';
import React from 'react';
import { ChartDefinition } from '../types';
import { BarChartOptions } from '../charts/bar/bar-chart-options';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
}

export function ChartEditorOptions({ value, onChange }: Props) {
  return (
    <SilkeBox pad="l" gap="l" column>
      <SilkeToggle
        small
        label="Race datasets"
        value={value.options?.raceSets || false}
        onChange={(update) => {
          console.log('!!update', update);
          onChange({ options: { ...(value.options || {}), raceSets: update } });
        }}
      />
      {value.type === 'bar' && <BarChartOptions value={value} onChange={onChange} />}
    </SilkeBox>
  );
}
