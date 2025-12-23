import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useChart } from '../../hooks/useChart';
import cloneDeep from 'lodash.merge';

interface Props {
  data: Array<(string | number)[]>;
}

export function LineChart({ data }: Props) {
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
    title: {
      text: 'ECharts Getting Started Example',
    },
    tooltip: {},
    xAxis: {
      name: `${columnData[0].label}`,
      type: 'category',
      data: columnData[0].data,
    },
    yAxis: {
      type: 'value',
    },
    series: columnData.slice(1).map((column) => ({
      name: column.label,
      type: 'line',
      data: column.data,
    })),
  });

  return <div ref={elRef} />;
}
