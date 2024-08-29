export type Validation = {
  min: number;
  max: number;
  minLength: number;
  maxLength: number;
  required: boolean;
  isNumber: boolean;
};

export const validate = (value: string, validate: Validation) => {
  if (!value && validate.required) {
    return false;
  }

  if (validate.isNumber) {
    if (validate.min > 0 && Number(value) < validate.min) {
      return false;
    }

    if (validate.max > 0 && Number(value) > validate.max) {
      return false;
    }
  } else {
    if (value.length < validate.minLength) {
      return false;
    }
    if (value.length > validate.maxLength) {
      return false;
    }
  }

  return true;
};
