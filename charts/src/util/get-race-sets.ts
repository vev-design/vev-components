import { ChartDefinition } from '../types';
import { extractColumnData } from './extract-column-data';
import { interpolateArray } from './interpolate-array';

export function getRaceSets(chartDef: Partial<ChartDefinition>) {
  const dataSetData = chartDef.data.map((value) => {
    return extractColumnData(value)[1].data;
  });

  const minimumColumn = dataSetData.reduce((previousValue, currentValue) => {
    if (currentValue.length < previousValue) return currentValue.length;
    return previousValue;
  }, Number.MAX_VALUE);

  const setGroups: number[][] = [];

  for (let i = 0; i < minimumColumn; i++) {
    setGroups[i] = [];
    for (let j = 0; j < dataSetData.length; j++) {
      setGroups[i].push(parseFloat(`${dataSetData[j][i]}`));
    }
  }

  const interpolatedSets = setGroups.map((set) => {
    return interpolateArray(set, 5);
  });

  const finishedDataSets: number[][] = [];

  for (let j = 0; j < interpolatedSets[0].length; j++) {
    finishedDataSets[j] = [];
    for (let i = 0; i < minimumColumn; i++) {
      finishedDataSets[j].push(interpolatedSets[i][j]);
    }
  }

  return finishedDataSets;
}
