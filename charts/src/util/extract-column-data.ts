export function extractColumnData(data: Array<(string | number)[]>) {
  let rawColumns: (string | number)[][] = [];
  const dataLength = data[0].length;
  for (let i = 0; i < dataLength; i++) {
    rawColumns[i] = data.map((row) => {
      return row[i];
    });
  }
  return rawColumns.map((col) => {
    return {
      label: col[0],
      data: col.slice(1),
    };
  });
}
