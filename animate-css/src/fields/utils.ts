export type KeyframeFieldProps = {
  value?: string;
  onChange: (value: string | null) => void;
};

export function toPercentString(value: string, fallback = 0): string {
  if (!value) return fallback * 100 + "%";
  const num = parseFloat(value);
  if (isNaN(num)) return fallback * 100 + "%";
  return num * 100 + "%";
}
