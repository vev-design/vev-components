export type FieldProps = {
  name: string;
  value: string;
  variable: string;
  className?: string;
  required?: boolean;
  initialValue?: boolean;
};

export enum Event {
  onInvalid = 'On invalid change',
  onValid = 'On valid change',
}
