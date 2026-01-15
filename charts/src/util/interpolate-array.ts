export function interpolateArray(data: number[], newPointsPerGap: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length - 1; i++) {
    const startValue = data[i];
    const endValue = data[i + 1];

    result.push(startValue);

    const totalSteps = newPointsPerGap + 1;
    const stepSize = (endValue - startValue) / totalSteps;

    for (let j = 1; j < totalSteps; j++) {
      const newValue = startValue + stepSize * j;
      result.push(newValue);
    }
  }

  result.push(data[data.length - 1]);

  return result;
}
