import React, { useEffect, useState } from 'react';
import styles from './charts.module.css';
import { registerVevComponent } from '@vev/react';
import { BarChart } from './charts/BarChart';
import { ChartEditorFormButton } from './editor/chart-editor-form-button';
import { ChartDefinition } from './types';
import { getDefaultChart } from './helpers/get-default-chart';

type Props = {
  chartDef: Partial<Omit<ChartDefinition, 'data'> & { data: string }>;
};

const Charts = ({ chartDef }: Props) => {
  const [chartDefActual, setChartDefActual] = useState<Partial<ChartDefinition>>(() => {
    return { ...chartDef, data: JSON.parse(chartDef.data) } || getDefaultChart();
  });

  useEffect(() => {
    if (chartDef) {
      setChartDefActual({ ...chartDef, data: JSON.parse(chartDef.data) });
    }
  }, [chartDef]);

  if (!chartDefActual) return null;

  if (chartDefActual.type === 'bar') {
    return (
      <div className={styles.wrapper}>
        <BarChart data={chartDefActual.data} />
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
      type: 'object',
      fields: [],
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
  type: 'both',
});

export default Charts;
