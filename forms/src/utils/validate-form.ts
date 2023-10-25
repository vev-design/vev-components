import { VevProps } from '@vev/react';

export default function validateForm(
  values = {},
  schema: VevProps[],
): { [fieldName: string]: string } {
  let errors: { [fieldName: string]: string } = {};

  const validate = (values = {}, schema: VevProps[], parent?: string) => {
    for (const field of schema) {
      if ((field as any).required && !values[field.name]) {
        errors = {
          ...errors,
          [[parent, field.name].filter(Boolean).join('.')]: 'required',
        };
      }
    }
  };

  validate(values, schema);
  return errors;
}

const getSchema = (schema: VevProps[], fieldName: string): VevProps[] => {
  return schema.find((f) => f.name === fieldName) as any;
};
