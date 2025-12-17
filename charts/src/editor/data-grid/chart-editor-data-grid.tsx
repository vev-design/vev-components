import { SilkeBox, SilkeOverflowMenu } from '@vev/silke';
import React, { useEffect, useState } from 'react';
import styles from './chart-editor-data-grid.module.css';
import { ChartData, ChartDefinition } from '../../types';
import { SchemaContextModel } from '@vev/utils';
import cloneDeep from 'lodash.clonedeep';
import { SilkeOverflowMenuItem } from '@vev/silke/dist/types/components/silke-overflow-menu/silke-overflow-menu';

interface Props {
  value: ChartData;
  onChange: (value: ChartData) => void;
  context: SchemaContextModel<ChartDefinition>;
}

const overflowMenuItemsTop: SilkeOverflowMenuItem[] = [
  {
    label: 'Insert left',
  },
  {
    label: 'Insert right',
  },
  {
    label: 'Delete',
    kind: 'danger',
  },
];

const overflowMenuItemsLeft: SilkeOverflowMenuItem[] = [
  {
    label: 'Insert above',
  },
  {
    label: 'Insert below',
  },
  {
    label: 'Delete',
    kind: 'danger',
  },
];

export function ChartEditorDataGrid({ value, onChange, context }: Props) {
  const [data, setData] = useState<ChartData>(value || []);

  useEffect(() => {
    onChange(data);
  }, [data]);

  useEffect(() => {
    setData(value);
  }, [value]);

  const columnCount = data[0]?.length || 0;

  return (
    <SilkeBox column>
      <SilkeBox>
        <div className={`${styles.cellHeader} ${styles.cellHeaderLeft}`} />
        {Array.from({ length: columnCount }).map((_, i) => (
          <div key={i} className={`${styles.cellHeader}`}>
            <SilkeBox align>
              <SilkeBox>{String.fromCharCode(65 + i)}</SilkeBox>
              <SilkeOverflowMenu size="s" kind="ghost" items={overflowMenuItemsTop} />
            </SilkeBox>
          </div>
        ))}
      </SilkeBox>
      {data.map((row, rowIndex) => {
        return (
          <SilkeBox key={rowIndex}>
            <div className={`${styles.cellHeader} ${styles.cellHeaderLeft}`}>
              <SilkeBox gap="xs" align>
                <SilkeBox>{rowIndex + 1}</SilkeBox>
                <SilkeOverflowMenu size="s" kind="ghost" items={overflowMenuItemsLeft} />
              </SilkeBox>
            </div>
            {row.map((col, colIndex) => {
              return (
                <input
                  key={colIndex}
                  type="text"
                  className={styles.cell}
                  value={col}
                  onChange={(event) => {
                    const dataCloned = cloneDeep(data);
                    dataCloned[rowIndex][colIndex] = event.target.value;
                    setData(dataCloned);
                  }}
                />
              );
            })}
          </SilkeBox>
        );
      })}
    </SilkeBox>
  );
}
