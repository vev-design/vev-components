import React, { useEffect, useMemo, useState } from 'react';
import styles from './charts.module.css';
import { registerVevComponent, useVevEvent } from '@vev/react';
import { BarChart } from './charts/BarChart';
import { ChartEditorFormButton } from './editor/chart-editor-form-button';
import { ChartDefinition } from './types';
import { getDefaultChart } from './helpers/get-default-chart';
import { InteractionType } from './event-types';

type Props = {
  chartDef: Partial<Omit<ChartDefinition, 'data'> & { data: string }>;
};

const Charts = ({ chartDef }: Props) => {
  const [chartDefActual, setChartDefActual] = useState<Partial<ChartDefinition>>(() => {
    if (chartDef?.data === undefined) return getDefaultChart();
    return { ...chartDef, data: JSON.parse(chartDef.data) };
  });

  const [activeDataSetIndex, setActiveDataSetIndex] = useState(0);

  const activeDataSet = useMemo(() => {
    return chartDefActual.data[activeDataSetIndex];
  }, [activeDataSetIndex]);

  useEffect(() => {
    if (chartDef) {
      setChartDefActual({ ...chartDef, data: JSON.parse(chartDef.data) });
    }
  }, [chartDef]);

  useVevEvent(InteractionType.SET_DATA_SET, (args: { data_set: number }) => {
    setActiveDataSetIndex(args.data_set);
  });

  if (!chartDefActual) return null;

  if (chartDefActual.type === 'bar' && activeDataSet) {
    return (
      <div className={styles.wrapper}>
        <BarChart data={activeDataSet} />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <p>Invalid chart</p>
    </div>
  );
};

registerVevComponent(Charts, {
  name: 'Charts',
  props: [
    {
      name: 'chartDef',
      type: 'array',
      of: 'string',
      component: ChartEditorFormButton,
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      title: 'Container',
      properties: ['background', 'border', 'border-radius', 'padding', 'opacity', 'filter'],
    },
  ],
  interactions: [
    {
      type: InteractionType.SET_DATA_SET,
      description: 'Set Data Set',
      args: [
        {
          name: 'data_set',
          title: 'Data set',
          type: 'select',
          options: {
            items: (context) => {
              if (context.value.widgetForm.chartDef?.data) {
                const chartDef = JSON.parse(
                  context.value.widgetForm.chartDef.data,
                ) as ChartDefinition['data'];
                return chartDef.map((_, index) => {
                  return { label: `Data Set ${index}`, value: index };
                });
              } else {
                return [{ label: `Data Set 1`, value: 0 }];
              }
            },
            display: 'dropdown',
          },
          initialValue: 0,
        },
      ],
    },
  ],
  type: 'both',
});

export default Charts;
