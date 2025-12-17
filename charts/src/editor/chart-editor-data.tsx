import React, { useMemo, useState } from 'react';
import { ChartDefinition } from '../types';
import { ChartEditorDataGrid } from './data-grid/chart-editor-data-grid';
import { SchemaContextModel } from '@vev/utils';
import { SilkeBox, SilkeButton, SilkeTab, SilkeTabs } from '@vev/silke';
import cloneDeep from 'lodash.merge';
import { getDefaultChart } from '../helpers/get-default-chart';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
  context: SchemaContextModel<ChartDefinition>;
}

export function ChartEditorData({ value, onChange, context }: Props) {
  const [dataSetIndex, setDataSetIndex] = useState(0);

  const currentDataSet = useMemo(() => {
    return value.data[dataSetIndex];
  }, [dataSetIndex, value]);

  return (
    <SilkeBox pad="l" column gap="s">
      <SilkeBox>
        <SilkeTabs size="s">
          {value.data.map((data, index) => {
            return (
              <SilkeTab
                label={`Data set ${index}`}
                active={dataSetIndex === index}
                onClick={() => setDataSetIndex(index)}
              />
            );
          })}
        </SilkeTabs>
        <SilkeButton
          icon="add"
          size="s"
          kind="ghost"
          title="Add data set"
          onClick={() => {
            const defaultChart = getDefaultChart().data;
            onChange({ data: [...value.data, ...defaultChart] });
          }}
        />
      </SilkeBox>
      <ChartEditorDataGrid
        value={currentDataSet}
        onChange={(newData) => {
          const clonedData = cloneDeep(value) as Partial<ChartDefinition>;
          clonedData.data[dataSetIndex] = newData;
          console.log('clonedData', clonedData);
          onChange(clonedData);
        }}
        context={context}
      />
    </SilkeBox>
  );
}
