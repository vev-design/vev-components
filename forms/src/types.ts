export type FieldProps = {
  name: string;
  value: string;
  className?: string;
  required?: boolean;
};

export enum Event {
  onChange = "OnChange",
  onInvalid = "OnInvalid",
  onValid = "OnValid",
}