import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useChart } from '../../hooks/useChart';
import cloneDeep from 'lodash.merge';

interface Props {
  data: Array<(string | number)[]>;
}

export function RadarChart({ data }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const columnData = useMemo(() => {
    let rawColumns: (string | number)[][] = [];
    const dataLength = data[0].length;
    for (let i = 0; i < dataLength; i++) {
      rawColumns[i] = data.map((row) => {
        return row[i];
      });
    }

    return rawColumns.map((col) => {
      return {
        label: col[0],
        data: col.slice(1),
      };
    });
  }, [data]);

  useChart(elRef, {
    animation: true,
    legend: {
      data: columnData.slice(1).map((column) => column.label),
    },
    radar: {
      indicator: columnData[0].data.map((label) => ({ name: label })),
    },
    series: [
      {
        name: columnData[0].label,
        type: 'radar',
        data: columnData.slice(1).map((column) => {
          return {
            name: column.label,
            value: column.data,
          };
        }),
      },
    ],
  });

  return <div ref={elRef} />;
}
