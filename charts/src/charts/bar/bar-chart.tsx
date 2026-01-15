import React, { useEffect, useMemo, useRef } from 'react';
import { useChart } from '../../hooks/useChart';
import { ChartDefinition } from '../../types';
import type { ComposeOption } from 'echarts/core';
import type { BarSeriesOption } from 'echarts/charts';
import type {
  DatasetComponentOption,
  GridComponentOption,
  TitleComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import { interpolateArray } from '../../util/interpolate-array';
import { useEditorState, useVevEvent } from '@vev/react';
import { InteractionType } from '../../event-types';

export type ChartOptions = ComposeOption<
  | BarSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
>;

function getOpts(
  columnData: { label: string | number; data: (string | number)[] }[],
  options: ChartDefinition['options'],
): ChartOptions {
  let opts: ChartOptions = {
    animation: true,
    legend: {
      data: columnData.slice(1).map((column) => column.label),
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

  if (options?.title && options?.title !== '') {
    opts.title = {
      text: options.title,
    };
  }

  if (options?.yAxisBars) {
    // @ts-ignore works
    opts.yAxis = { ...opts.xAxis };
    opts.xAxis = {};
  }

  return opts;
}

interface Props {
  data: Array<(string | number)[]>;
  options: ChartDefinition['options'];
  chartDef: Partial<ChartDefinition>;
}

function extractColumnData(data: Array<(string | number)[]>) {
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
}

function getRaceSets(chartDef: Partial<ChartDefinition>) {
  const dataSetData = chartDef.data.map((value) => {
    return extractColumnData(value)[1].data;
  });

  const minimumColumn = dataSetData.reduce((previousValue, currentValue) => {
    if (currentValue.length < previousValue) return currentValue.length;
    return previousValue;
  }, Number.MAX_VALUE);

  const setGroups: number[][] = [];

  for (let i = 0; i < minimumColumn; i++) {
    setGroups[i] = [];
    for (let j = 0; j < dataSetData.length; j++) {
      setGroups[i].push(parseFloat(`${dataSetData[j][i]}`));
    }
  }

  const interpolatedSets = setGroups.map((set) => {
    return interpolateArray(set, 5);
  });

  const finishedDataSets: number[][] = [];

  for (let j = 0; j < interpolatedSets[0].length; j++) {
    finishedDataSets[j] = [];
    for (let i = 0; i < minimumColumn; i++) {
      finishedDataSets[j].push(interpolatedSets[i][j]);
    }
  }

  return finishedDataSets;
}

export function BarChart({ data, options, chartDef }: Props) {
  const { disabled } = useEditorState();
  const elRef = useRef<HTMLDivElement>(null);
  const columnData = useMemo(() => {
    return extractColumnData(data);
  }, [data]);

  let opts = getOpts(columnData, options);
  const chartRef = useChart(elRef, opts);

  useVevEvent(InteractionType.START_RACE, () => {
    startRace();
  });

  function startRace() {
    const raceSets = getRaceSets(chartDef);
    const intervalDuration = options.raceSets.duration / raceSets.length;
    let setCounter = 0;
    return setInterval(() => {
      if (setCounter >= raceSets.length) {
        return;
      }
      chartRef.current.setOption({
        animationDuration: 0,
        animationDurationUpdate: intervalDuration,
        animationEasing: 'linear',
        animationEasingUpdate: 'linear',
        series: [
          {
            type: 'bar',
            data: raceSets[setCounter],
          },
        ],
      });
      setCounter++;
    }, intervalDuration);
  }

  // For race
  useEffect(() => {
    let interval: number;
    if (
      chartRef.current &&
      options.raceSets?.duration &&
      !disabled &&
      options.raceSets.startOnLoad
    ) {
      interval = startRace();
    }

    return () => clearInterval(interval);
  }, [chartDef, chartRef, disabled]);

  return <div ref={elRef} />;
}
