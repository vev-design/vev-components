import React, { useMemo, useRef } from 'react';
import { ECOption, useChart } from '../../hooks/useChart';
import { ChartDefinition } from '../../types';
import type { ComposeOption } from 'echarts/core';
import type {
  BarSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
  RadarSeriesOption,
} from 'echarts/charts';
import type {
  DatasetComponentOption,
  GridComponentOption,
  TitleComponentOption,
  TooltipComponentOption,
} from 'echarts/components';

export type BarChartOptions = ComposeOption<
  | BarSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
>;

function getOpts(
  columnData: { label: string | number; data: (string | number)[] }[],
  options: ChartDefinition['options'],
): BarChartOptions {
  let opts = {
    animation: true,
    legend: {
      data: columnData.slice(1).map((column) => column.label),
    },
    title: {
      text: 'ECharts Getting Started Example',
    },
    tooltip: {},
    xAxis: {
      name: `${columnData[0].label}`,
      type: 'category',
      data: columnData[0].data,
    } as const,
    yAxis: {},
    series: columnData.slice(1).map(
      (column) =>
        ({
          name: column.label,
          type: 'bar',
          data: column.data,
        } as const),
    ),
  };

  if (options?.yAxisBars) {
    opts.yAxis = { ...opts.xAxis };
    opts.xAxis = {};
  }

  return opts;
}

interface Props {
  data: Array<(string | number)[]>;
  options: ChartDefinition['options'];
}

export function BarChart({ data, options }: Props) {
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

  let opts = getOpts(columnData, options);
  console.log('opts', opts);
  useChart(elRef, opts);

  return <div ref={elRef} />;
}
