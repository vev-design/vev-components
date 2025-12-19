import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useChart } from '../hooks/useChart';
import cloneDeep from 'lodash.merge';

interface Props {
  data: Array<(string | number)[]>;
}

export function PieChart({ data }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  console.log('data', data);
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

  let option = {
    title: {
      text: 'Referer of a Website',
      subtext: 'Fake Data',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: 'Access From',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 1048, name: 'Search Engine' },
          { value: 735, name: 'Direct' },
          { value: 580, name: 'Email' },
          { value: 484, name: 'Union Ads' },
          { value: 300, name: 'Video Ads' },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  let opts = {
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
  };
  console.log('opts', opts);
  useChart(elRef, opts);

  return <div ref={elRef} />;
}
