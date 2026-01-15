export function readCSV(data: string): string[][] | null {
  const separator = getSeparator(data);
  return data.split('\n').map((row) => row.split(separator));
}

// Guess the CSV separator
function getSeparator(data: string) {
  const l1 = data.split(';').length;
  const l2 = data.split(',').length;

  if (l1 > l2) return ';';
  return ',';
}
