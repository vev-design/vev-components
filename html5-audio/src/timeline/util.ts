export function durationToTimestamp(duration: number) {
  const min = Math.floor(duration / 60).toFixed(0);
  const sec = Math.floor(duration % 60).toFixed(0);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
