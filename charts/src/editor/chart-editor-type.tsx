import { SilkeBox, SilkeCard, SilkeIcon, SilkeText } from '@vev/silke';
import React from 'react';
import { ChartDefinition } from '../types';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
}

export function ChartEditorType({ value, onChange }: Props) {
  return (
    <SilkeBox pad="l" gap="l">
      <SilkeCard
        title="Bar Chart"
        selected={value.type === 'bar'}
        onClick={() => {
          onChange({ type: 'bar' });
        }}
        image={
          <SilkeBox align fill>
            <SilkeIcon style={{ fontSize: '2.5rem' }} icon="bar" />
          </SilkeBox>
        }
      />
      <SilkeCard
        title="Line Chart"
        selected={value.type === 'line'}
        onClick={() => {
          onChange({ type: 'line' });
        }}
        image={
          <SilkeBox align fill>
            <SilkeIcon style={{ fontSize: '2.5rem' }} icon="line" />
          </SilkeBox>
        }
      />
      <SilkeCard
        title="Radar Chart"
        selected={value.type === 'radar'}
        onClick={() => {
          onChange({ type: 'radar' });
        }}
        image={
          <SilkeBox align fill>
            <SilkeIcon style={{ fontSize: '2.5rem' }} icon="radar" />
          </SilkeBox>
        }
      />
      <SilkeCard
        title="Pie Chart"
        selected={value.type === 'pie'}
        onClick={() => {
          onChange({ type: 'pie' });
        }}
        image={
          <SilkeBox align fill>
            <SilkeIcon style={{ fontSize: '2.5rem' }} icon="doughnut" />
          </SilkeBox>
        }
      />
    </SilkeBox>
  );
}
