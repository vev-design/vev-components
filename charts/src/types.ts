export type ChartType = 'line' | 'bar' | 'pie' | 'radar';

export type ChartData = Array<(string | number)[]>;

export interface ChartDefinition {
  type: ChartType;
  data: ChartData[];
}
