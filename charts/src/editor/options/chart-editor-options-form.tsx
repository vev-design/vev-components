import { SilkeBox, SilkeText, SilkeTextField, SilkeTitle, SilkeToggle } from '@vev/silke';
import React from 'react';
import { ChartDefinition } from '../../types';
import { BarChartOptionsForm } from '../../charts/bar/bar-chart-options-form';
import { OptionGroup } from './option-group';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
}

export function ChartEditorOptionsForm({ value, onChange }: Props) {
  return (
    <SilkeBox pad="l" column gap="m">
      <OptionGroup title="General options" expanded>
        <SilkeBox gap="m" align fill column>
          <SilkeTextField
            value={value.options?.title}
            label="Title"
            onChange={(update) => {
              onChange({ options: { ...(value.options || {}), title: update } });
            }}
          />
          <SilkeToggle
            value={!!value.options?.raceSets?.duration}
            small
            label="Race data sets"
            onChange={(update) => {
              if (update) {
                onChange({
                  options: {
                    ...(value.options || {}),
                    raceSets: { duration: 5000, startOnLoad: true },
                  },
                });
              } else {
                onChange({ options: { ...(value.options || {}), raceSets: null } });
              }
            }}
          />
          {value.options?.raceSets && value.options?.raceSets.duration && (
            <SilkeTextField
              value={value.options?.raceSets.duration}
              label="Race duration (ms)"
              type="number"
              onChange={(update) => {
                onChange({
                  options: {
                    ...(value.options || {}),
                    raceSets: {
                      duration: update,
                      startOnLoad: value.options?.raceSets?.startOnLoad,
                    },
                  },
                });
              }}
            />
          )}
          {value.options?.raceSets && value.options?.raceSets.duration && (
            <SilkeToggle
              small
              value={value.options?.raceSets.startOnLoad}
              label="Start race on load"
              onChange={(update) => {
                onChange({
                  options: {
                    ...(value.options || {}),
                    raceSets: {
                      duration: value.options?.raceSets?.duration,
                      startOnLoad: update,
                    },
                  },
                });
              }}
            />
          )}
        </SilkeBox>
      </OptionGroup>
      {value.type === 'bar' && (
        <OptionGroup title="Chart options">
          <BarChartOptionsForm value={value} onChange={onChange} />
        </OptionGroup>
      )}
    </SilkeBox>
  );
}
