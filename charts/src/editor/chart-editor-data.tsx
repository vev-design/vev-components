import React, { useMemo, useState } from 'react';
import { ChartData, ChartDefinition } from '../types';
import { ChartEditorDataGrid } from './data-grid/chart-editor-data-grid';
import { SchemaContextModel } from '@vev/utils';
import { SilkeBox, SilkeButton, SilkeTab, SilkeTabs } from '@vev/silke';
import cloneDeep from 'lodash.merge';
import { getDefaultChart } from '../helpers/get-default-chart';
import { readCSV } from './data-grid/paste-csv';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
  context: SchemaContextModel<ChartDefinition>;
}

export function ChartEditorData({ value, onChange, context }: Props) {
  const [dataSetIndex, setDataSetIndex] = useState(0);
  const [hoverTabIndex, setHoverTabIndex] = useState<number>(-1);

  const currentDataSet = useMemo(() => {
    if (value.data[dataSetIndex]) {
      return value.data[dataSetIndex];
    } else {
      return value.data[0];
    }
  }, [dataSetIndex, value]);

  return (
    <SilkeBox pad="l" column gap="s">
      <SilkeBox fill flex align="spread">
        <SilkeBox>
          <SilkeTabs size="s">
            {value.data.map((data, index) => {
              return (
                <SilkeTab
                  onMouseEnter={() => {
                    setHoverTabIndex(index);
                  }}
                  onMouseLeave={() => {
                    setHoverTabIndex(-1);
                  }}
                  label={
                    <SilkeBox gap="xs">
                      {`Data set ${index}`}
                      {hoverTabIndex === index && (
                        <SilkeButton
                          kind="ghost"
                          size="s"
                          icon="delete"
                          onClick={() => {
                            const clonedData = cloneDeep([...value.data]) as ChartData[];
                            clonedData.splice(index, 1);
                            let update = { data: [...clonedData] };
                            onChange(update);
                          }}
                        />
                      )}
                    </SilkeBox>
                  }
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
              const newData = cloneDeep(currentDataSet);
              onChange({ data: [...value.data, newData] });
            }}
          />
        </SilkeBox>
        <SilkeBox>
          <SilkeButton
            title="Remove all data"
            icon="remove"
            size="s"
            kind="ghost"
            onClick={async () => {
              const clonedData = cloneDeep(value) as Partial<ChartDefinition>;
              clonedData.data[dataSetIndex] = [[]];
              onChange(clonedData);
            }}
          />
          <SilkeButton
            title="Insert CSV from clipboard"
            icon="paste.add"
            size="s"
            kind="ghost"
            onClick={async () => {
              window.focus();
              const csv = await navigator.clipboard.readText();
              const data = readCSV(csv);

              const clonedData = cloneDeep(value) as Partial<ChartDefinition>;
              clonedData.data[dataSetIndex] = data;
              onChange(clonedData);
            }}
          />
        </SilkeBox>
      </SilkeBox>
      <ChartEditorDataGrid
        value={currentDataSet}
        onChange={(newData) => {
          const clonedData = cloneDeep(value) as Partial<ChartDefinition>;
          clonedData.data[dataSetIndex] = newData;
          onChange(clonedData);
        }}
        context={context}
      />
    </SilkeBox>
  );
}
