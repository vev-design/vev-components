import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useChart } from '../../hooks/useChart';
import cloneDeep from 'lodash.merge';
import { extractColumnData } from '../../util/extract-column-data';
import { useVevEvent } from '@vev/react';
import { InteractionType } from '../../event-types';
import { getRaceSets } from '../../util/get-race-sets';
import { ChartDefinition } from '../../types';

interface Props {
  data: Array<(string | number)[]>;
  options: ChartDefinition['options'];
  chartDef: Partial<ChartDefinition>;
}

export function LineChart({ data, options, chartDef }: Props) {
  const elRef = useRef<HTMLDivElement>(null);

  useVevEvent(InteractionType.START_RACE, () => {
    startRace();
  });

  const columnData = useMemo(() => {
    return extractColumnData(data);
  }, [data]);

  const chartRef = useChart(elRef, {
    animation: true,
    title: {
      text: options?.title || '',
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
            type: 'line',
            data: raceSets[setCounter],
          },
        ],
      });
      setCounter++;
    }, intervalDuration);
  }

  return <div ref={elRef} />;
}
