import { SilkeBox, SilkeTab, SilkeTabs } from '@vev/silke';
import React, { ReactElement, useState } from 'react';
import { ChartEditorType } from './chart-editor-type';
import { ChartDefinition } from '../types';
import { getDefaultChart } from '../helpers/get-default-chart';
import merge from 'lodash.merge';
import { ChartEditorData } from './chart-editor-data';
import { SchemaContextModel } from '@vev/utils';

type Tabs = 'type' | 'data' | 'style';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
  context: SchemaContextModel<ChartDefinition>;
}

export function ChartEditorForm({ value, onChange, context }: Props): ReactElement {
  const [activeTab, setActiveTab] = useState<Tabs>('data');
  const [actualValue, setActualValue] = useState(() => {
    if (!value) {
      return getDefaultChart();
    }
    return value;
  });

  function onChangeChart(update: Partial<ChartDefinition>) {
    const newValue = merge(actualValue, update);
    setActualValue(newValue);
    onChange(newValue);
  }

  return (
    <SilkeBox column>
      <SilkeTabs size="s" flex fill align="spread" rounded="tiny">
        <SilkeTab
          flex
          label="Chart type"
          active={activeTab === 'type'}
          onClick={() => {
            setActiveTab('type');
          }}
        />
        <SilkeTab
          flex
          label="Data"
          active={activeTab === 'data'}
          onClick={() => {
            setActiveTab('data');
          }}
        />
        <SilkeTab
          flex
          label="Styling"
          active={activeTab === 'style'}
          onClick={() => {
            setActiveTab('style');
          }}
        />
      </SilkeTabs>
      {activeTab === 'type' && <ChartEditorType value={actualValue} onChange={onChangeChart} />}
      {activeTab === 'data' && (
        <ChartEditorData value={actualValue} onChange={onChangeChart} context={context} />
      )}
    </SilkeBox>
  );
}
