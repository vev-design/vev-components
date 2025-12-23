import { BarChartOptions } from './charts/bar/bar-chart-options';

export type ChartType = 'line' | 'bar' | 'pie' | 'radar';

export type ChartData = Array<(string | number)[]>;

export type ChartOptions = {
  raceSets?: boolean;
};

export interface ChartDefinition {
  type: ChartType;
  data: ChartData[];
  options?: ChartOptions & BarChartOptions;
}
