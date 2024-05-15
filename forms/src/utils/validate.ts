export type Validation = {
  min: number;
  max: number;
  minLength: number;
  maxLength: number;
  required: boolean;
};

export const validate = (value: string, validate: Validation) => {
  if (!value && validate.required) {
    return false;
  }

  if (value.length < validate.minLength) {
    return false;
  }
  if (value.length > validate.maxLength) {
    return false;
  }

  if (validate.min > 0 && Number(value) < validate.min) {
    return false;
  }

  if (validate.max > 0 && Number(value) > validate.max) {
    return false;
  }

  return true;
};
