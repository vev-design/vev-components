import React from 'react';
import styles from './charts.module.css';
import { registerVevComponent } from '@vev/react';
import { BarChart } from './charts/BarChart';
import { ChartEditorFormButton } from './editor/chart-editor-form-button';

type Props = {
  title: string;
};

const Charts = ({ title = 'Vev' }: Props) => {
  return (
    <div className={styles.wrapper}>
      <BarChart />
    </div>
  );
};

registerVevComponent(Charts, {
  name: 'Charts',
  props: [
    {
      name: 'chart_data',
      type: 'object',
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
