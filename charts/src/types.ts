export type ChartType = 'line' | 'bar' | 'pie' | 'radar';

export interface ChartDefinition {
  type: ChartType;
  data: Array<(string | number)[]>;
}
