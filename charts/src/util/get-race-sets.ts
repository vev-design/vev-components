import { ChartDefinition } from '../types';
import { extractColumnData } from './extract-column-data';
import { interpolateArray } from './interpolate-array';

type RaceSetDataGroup = {
  name: string | number;
  type: 'line' | 'bar' | 'pie' | 'radar';
  data: number[][];
};

export function getRaceSets(chartDef: Partial<ChartDefinition>) {
  const results: RaceSetDataGroup[] = [];

  for (let i = 0; i < chartDef.data[0][0].length - 1; i++) {
    results.push(getRaceSetDataForGroup(chartDef, i));
  }
  console.log('results', results);
  return {
    raceSetLength: results[0].data.length,
    getRaceSet: (index: number) => {
      return results.map((result) => {
        return {
          name: result.name,
          type: result.type,
          data: result.data[index],
        };
      });
    },
  };
}

function getRaceSetDataForGroup(
  chartDef: Partial<ChartDefinition>,
  dataIndex = 0,
): RaceSetDataGroup {
  console.log('dataIndex', dataIndex);
  const columnName = chartDef.data[0][0][dataIndex + 1];

  const dataSetData = chartDef.data.map((value) => {
    let extractColumnData1 = extractColumnData(value);
    return extractColumnData1[dataIndex + 1].data;
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
    return interpolateArray(set, 1);
  });

  const finishedDataSets: number[][] = [];

  for (let j = 0; j < interpolatedSets[0].length; j++) {
    finishedDataSets[j] = [];
    for (let i = 0; i < minimumColumn; i++) {
      finishedDataSets[j].push(interpolatedSets[i][j]);
    }
  }

  return {
    name: columnName,
    type: chartDef.type,
    data: finishedDataSets,
  };
}
