import { BarChartOptions } from './charts/bar/bar-chart-options-form';

export type ChartType = 'line' | 'bar' | 'pie' | 'radar';

export type ChartData = Array<(string | number)[]>;

export type ChartOptions = {
  title?: string;
  raceSets?: { duration: number; startOnLoad: boolean };
};

export interface ChartDefinition {
  type: ChartType;
  data: ChartData[];
  options?: ChartOptions & BarChartOptions;
}
