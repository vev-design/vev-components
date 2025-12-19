import { ChartDefinition } from '../types';

const defaultData: Array<(string | number)[]> = [
  ['Year', 'Apples', 'Oranges'],
  [2000, 5, 2],
  [2001, 6, 9],
  [2002, 9, 4],
  [2003, 5, 4],
  [2004, 3, 3],
  [2005, 7, 2],
  [2006, 2, 1],
  [2007, 10, 11],
  [2008, 3, 6],
  [2009, 3, 4],
  [2010, 11, 3],
];

export function getDefaultChart(): ChartDefinition {
  return {
    type: 'bar',
    data: [defaultData],
  };
}
