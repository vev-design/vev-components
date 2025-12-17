import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useChart } from '../hooks/useChart';
import cloneDeep from 'lodash.merge';

interface Props {
  data: Array<(string | number)[]>;
}

export function BarChart({ data }: Props) {
  const elRef = useRef<HTMLDivElement>(null);

  const { axisLabels, xAxisData, yAxisData } = useMemo(() => {
    const clonedData = cloneDeep([...data]) as Array<(string | number)[]>;
    const axisLabels = clonedData.shift();
    const xAxisData = clonedData.map((value) => {
      return value[0];
    });
    const yAxisData = clonedData.map((value) => {
      return value[1];
    });

    return {
      axisLabels: { x: axisLabels[0] as string, y: axisLabels[1] as string },
      xAxisData,
      yAxisData,
    };
  }, [data]);

  useChart(elRef, {
    animation: true,
    title: {
      text: 'ECharts Getting Started Example',
    },
    tooltip: {},
    xAxis: {
      name: axisLabels.x,
      type: 'category',
      data: xAxisData,
    },
    yAxis: {},
    series: [
      {
        name: axisLabels.y,
        type: 'bar',
        data: yAxisData,
      },
    ],
  });

  return <div ref={elRef} />;
}
