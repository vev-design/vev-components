import React from 'react';
import { useState } from 'react';
import { checkboxColumn, DataSheetGrid, keyColumn, textColumn } from 'react-datasheet-grid';
import { ChartDefinition } from '../types';
import 'react-datasheet-grid/dist/style.css';
import './baba.css';
import { SilkeBox } from '@vev/silke';

interface Props {
  value: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
}

export function ChartEditorData({ value, onChange }: Props) {
  const [data, setData] = useState([
    { active: true, firstName: 'Elon', lastName: 'Musk' },
    { active: false, firstName: 'Jeff', lastName: 'Bezos' },
  ]);

  const columns = [
    { ...keyColumn('active', checkboxColumn), title: 'Active' },
    { ...keyColumn('firstName', textColumn), title: 'First name' },
    { ...keyColumn('lastName', textColumn), title: 'Last name' },
  ];

  return <DataSheetGrid value={data} onChange={setData} columns={columns} />;
}
