export type FieldProps = {
  name: string;
  value: string;
  className?: string;
  required?: boolean;
  initialValue?: boolean;
};

export enum Event {
  onChange = 'On change',
  onInvalid = 'On invalid change',
  onValid = 'On valid change',
}
