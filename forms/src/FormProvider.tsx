import React, {
  createContext,
  useContext,
  useState,
  FormEventHandler,
  useCallback,
} from "react";
import { useGlobalStateRef, useModel, VevProps } from "@vev/react";
import { omit, isEmpty, merge } from "lodash";

import validateForm from "./utils/validate-form";

const SUBMIT_URL =
  "https://us-central1-vev-development.cloudfunctions.net/publicApiHttps/form-submission";

/**
 * Context
 */

type FormContextType = {
  formState: { [key: string]: any };
  formSchema: VevProps[];
  onChange: (
    key: string,
    value: any,
    type?: "default" | "add" | "remove"
  ) => void;
  errors?: { [key: string]: string };
  submitting?: boolean;
  haveContext: boolean;
  setFormSchema: (schema: VevProps) => void;
};

const FormContext = createContext<FormContextType>({
  formState: {},
  formSchema: [],
  onChange: () => {},
  haveContext: false,
  setFormSchema: () => null,
  errors: {},
});

/**
 * Hooks
 */

export const useForm = () => useContext(FormContext);

export const useFormField = (field: any) => {
  const {
    formState,
    onChange,
    haveContext,
    setFormSchema,
    errors = {},
  } = useContext(FormContext);

  React.useEffect(() => {
    setFormSchema(field);
  }, []);

  return {
    value: formState[field?.name],
    error: errors[field?.name],
    onChange: (name: string, value: any, type?: "default" | "add" | "remove") =>
      onChange(name, value, type),
    haveContext,
    setFormSchema,
  };
};

/**
 * Provider
 */

export type SubmitType = {
  submitType: "zapier" | "googleSheet" | "webhook";
  googleSheetUrl?: string;
  zapierFormUrl?: string;
  webHookUrl?: string;
};

export type Props = {
  children: React.ReactNode;
  options: {
    submitButton?: string;
    successMessage?: string;
  };
  submit: SubmitType;
};

function FormProvider(props: Props) {
  const [formState, setFormState] = useState({});
  const [errors, setErrors] = useState<{ [formField: string]: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [formSchema, setFormSchema] = useState([]);

  const model = useModel();
  const [store] = useGlobalStateRef();
  const formId = `${store?.current?.project}.${model.type}.${model.key}`;

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (e) => {
      e.preventDefault();
      setErrors(undefined);
      setSubmitting(true);

      console.log(`
        submitType:\t ${props.submit?.submitType}
        formId:\t\t ${formId}
        values:\t\t ${JSON.stringify(formState, null, 2)}
      `);

      /*
       * Validate form
       */
      const errors = validateForm(formState, formSchema);
      console.log("errors", errors);

      if (errors && !isEmpty(errors)) {
        setErrors(errors);
        setSubmitting(false);
        return;
      }

      const body = {
        formData: formState,
        formId,
      };

      console.log("SUBMIT_URL", SUBMIT_URL);

      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.log("error submitting to google sheet");
        return;
      } else {
        setFormState({});
        setSubmitting(false);
      }
    },
    [JSON.stringify(formState)]
  );

  /*
   * Update form values
   */

  const onChange = useCallback(
    (field: string, value: any, type?: "default" | "add" | "remove") => {
      setErrors(undefined);

      if (type === "add") {
        return setFormState((prev) => ({
          ...prev,
          [field]: [...(prev[field] || []), value],
        }));
      }

      if (type === "remove") {
        return setFormState((prev) => ({
          ...prev,
          [field]: (prev[field] as any as string[])?.filter((i) => i !== value),
        }));
      }

      setFormState((prev) => ({ ...merge(prev, { [field]: value }) }));
    },
    []
  );

  /*
   * Set form schema
   */

  const setSchema = useCallback((schema: VevProps) => {
    const cleanedSchema = omit(schema, ["hostRef"]);
    setFormSchema((state) => [...state, cleanedSchema]);
  }, []);

  return (
    <FormContext.Provider
      value={{
        formState,
        onChange,
        errors,
        submitting,
        haveContext: true,
        formSchema,
        setFormSchema: setSchema,
      }}
    >
      <form onSubmit={handleSubmit} onReset={() => setFormState({})}>
        {props.children}
      </form>
    </FormContext.Provider>
  );
}

export default FormProvider;
