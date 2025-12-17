import { ChartDefinition } from '../types';

const defaultData: Array<(string | number)[]> = [
  ['Year', 'Apples'],
  [2000, 5],
  [2001, 6],
  [2002, 9],
  [2003, 5],
  [2004, 3],
  [2005, 7],
  [2006, 2],
  [2007, 10],
  [2008, 3],
  [2009, 3],
  [2010, 11],
];

export function getDefaultChart(): ChartDefinition {
  return {
    type: 'bar',
    data: [defaultData],
  };
}
