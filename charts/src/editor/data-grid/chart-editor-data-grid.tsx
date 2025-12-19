import { SilkeBox, SilkeOverflowMenu } from '@vev/silke';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './chart-editor-data-grid.module.css';
import { ChartData, ChartDefinition } from '../../types';
import { SchemaContextModel } from '@vev/utils';
import cloneDeep from 'lodash.clonedeep';
import { SilkeOverflowMenuItem } from '@vev/silke/dist/types/components/silke-overflow-menu/silke-overflow-menu';
import { addBelow, addLeft, addRight, addAbove, deleteRow, deleteColumn } from './grid-util';

interface Props {
  value: ChartData;
  onChange: (value: ChartData) => void;
  context: SchemaContextModel<ChartDefinition>;
}

export function ChartEditorDataGrid({ value, onChange, context }: Props) {
  const [data, setData] = useState<ChartData>(value || []);
  console.log('data', data);
  useEffect(() => {
    onChange(data);
  }, [data]);

  useEffect(() => {
    console.log('SET value', value);
    setData(value);
  }, [value]);

  const columnCount = data[0]?.length || 0;

  const getOverflowMenuItemsColumn: (index: number) => SilkeOverflowMenuItem[] = useCallback(
    (index: number) => {
      return [
        {
          label: 'Insert left',
          onClick: () => {
            setData(addLeft(data, index));
          },
        },
        {
          label: 'Insert right',
          onClick: () => {
            setData(addRight(data, index));
          },
        },
        {
          label: 'Delete',
          kind: 'danger',
          onClick: () => {
            setData(deleteColumn(data, index));
          },
        },
      ];
    },
    [data],
  );

  const getOverflowMenuItemsRow: (index: number) => SilkeOverflowMenuItem[] = useCallback(
    (index: number) => {
      return [
        {
          label: 'Insert above',
          onClick: () => {
            setData(addAbove(data, index));
          },
        },
        {
          label: 'Insert below',
          onClick: () => {
            setData(addBelow(data, index));
          },
        },
        {
          label: 'Delete',
          kind: 'danger',
          onClick: () => {
            setData(deleteRow(data, index));
          },
        },
      ];
    },
    [data],
  );

  return (
    <SilkeBox column>
      <SilkeBox>
        <div className={`${styles.cellHeader} ${styles.cellHeaderLeft}`} />
        {Array.from({ length: columnCount }).map((_, colIndex) => (
          <div key={colIndex} className={`${styles.cellHeader}`}>
            <SilkeBox align>
              <SilkeBox>{String.fromCharCode(65 + colIndex)}</SilkeBox>
              <SilkeOverflowMenu
                size="s"
                kind="ghost"
                items={getOverflowMenuItemsColumn(colIndex)}
              />
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
                <SilkeOverflowMenu
                  size="s"
                  kind="ghost"
                  items={getOverflowMenuItemsRow(rowIndex) || []}
                />
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
