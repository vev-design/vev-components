import { ChartData } from '../../types';
import cloneDeep from 'lodash.merge'; // Note: merge works, but lodash/cloneDeep is more standard for this

export function addRight(data: ChartData, index: number) {
  let clonedData = cloneDeep([...data]) as ChartData;
  clonedData.forEach((row) => row.splice(index + 1, 0, ''));
  return clonedData;
}

export function addLeft(data: ChartData, index: number) {
  let clonedData = cloneDeep([...data]) as ChartData;
  clonedData.forEach((row) => row.splice(index, 0, ''));
  return clonedData;
}

export function addAbove(data: ChartData, index: number) {
  let clonedData = cloneDeep([...data]) as ChartData;
  const newRow = new Array(clonedData[0]?.length || 0).fill('');
  clonedData.splice(index, 0, newRow);
  return clonedData;
}

export function addBelow(data: ChartData, index: number) {
  let clonedData = cloneDeep([...data]) as ChartData;
  const newRow = new Array(clonedData[0]?.length || 0).fill('');
  clonedData.splice(index + 1, 0, newRow);
  return clonedData;
}

export function deleteRow(data: ChartData, index: number) {
  let clonedData = cloneDeep([...data]) as ChartData;
  if (clonedData.length > 0) {
    clonedData.splice(index, 1);
  }
  return clonedData;
}

export function deleteColumn(data: ChartData, index: number) {
  let clonedData = cloneDeep([...data]) as ChartData;
  clonedData.forEach((row) => {
    if (row.length > 0) {
      row.splice(index, 1);
    }
  });
  return clonedData;
}
