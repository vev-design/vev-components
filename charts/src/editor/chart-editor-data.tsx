import React from 'react';
import { ChartDefinition } from '../types';
import { ChartEditorDataGrid } from './data-grid/chart-editor-data-grid';
import { SchemaContextModel } from '@vev/utils';
import { SilkeBox } from '@vev/silke';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
  context: SchemaContextModel<ChartDefinition>;
}

export function ChartEditorData({ value, onChange, context }: Props) {
  return (
    <SilkeBox pad="l">
      <ChartEditorDataGrid value={value} onChange={onChange} context={context} />
    </SilkeBox>
  );
}
