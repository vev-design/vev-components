import React, { useState, useEffect, useCallback } from "react";
import cx from "classnames";
import usePrevious from "../../utils/usePrevious";
import {
  registerVevComponent,
  useVevEvent,
  useDispatchVevEvent,
  useModel,
  useGlobalStateRef,
  ProjectInteraction,
} from "@vev/react";
import formIcon from "../../assets/form-icon.svg";
import styles from "./Button.module.css";

import GoogleSheetConnect from "../../submit/GoogleSheetConnect";
import ZapierConnect from "../../submit/ZapierConnect";

type Props = {
  submitButton: string;
  successMessage: string;
  errorMessage?: string;
  type: "reset" | "submit";
  submit: SubmitType;
};

export type SubmitType = {
  submitType: "zapier" | "googleSheet" | "httpRequest";
  googleSheetUrl?: string;
  zapierFormUrl?: string;
  webHookUrl?: string;
  httpRequest?: {
    method: "GET" | "POST";
    url: string;
    newTab?: boolean;
    queryParams?: boolean;
    defaultData?: {
      data: {
        key: string;
        value: string;
      };
    }[];
    defaultHeaders?: {
      data: {
        key: string;
        value: string;
      };
    }[];
  };
};

enum Interaction {
  UPDATE_FORM = "UPDATE_FORM",
  SUBMIT_FORM = "SUBMIT_FORM",
}

enum Event {
  FORM_SUBMITTED = "FORM_SUBMITTED",
  FORM_INVALID = "FORM_INVALID",
  FORM_VALID = "FORM_VALID",
}

/* const SUBMIT_URL =
  "https://us-central1-vev-development.cloudfunctions.net/publicApiHttps/form-submission"; */

const SUBMIT_URL =
  "https://us-central1-vev-prod.cloudfunctions.net/publicApiHttps/form-submission";

const serialize = function (obj) {
  var str = [];
  for (var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }

  return str.length ? `?${str.join("&")}` : "";
};

type FormModel = {
  key: string;
  type: string;
  content: {
    name: string;
    minLength: number;
    maxLength: number;
    required: boolean;
  };
};

const getFormModels = (
  modelKey: string,
  interactions: ProjectInteraction[] = [],
  models: any[] = []
): FormModel[] => {
  const usedInteractions = interactions.filter(
    (interaction) => interaction.event?.contentKey === modelKey
  );
  const triggerKeys = usedInteractions.map(
    (interaction) => interaction.trigger?.contentKey
  );
  return models.filter((model) => triggerKeys?.includes(model.key));
};

const validateForm = (formState: any, formModels: FormModel[]) => {
  let errors = [];
  for (const model of formModels) {
    const value = formState[model.content.name];
    const isRequired = model.content.required;
    if (!value && isRequired) {
      errors.push({
        key: model.content.name,
        message: "Required",
      });
    }
  }
  return errors;
};

function Button({ ...props }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState({});
  const dispatch = useDispatchVevEvent();
  const [store] = useGlobalStateRef();
  const model = useModel();

  console.log("formState", formState);

  const { submitButton, successMessage, type = "submit" } = props;

  const handleSubmit = useCallback(async (formState: any) => {
    console.log("** submit", formState);
    setSubmitting(true);

    const formModels = getFormModels(
      model.key,
      store?.current?.interactions,
      store?.current?.models
    );
    const errors = validateForm(formState, formModels);

    if (errors?.length) {
      console.log("have errors", errors);
      dispatch(Event.FORM_INVALID, { errors });
      setSubmitting(false);
      return;
    }

    const isLinkSubmission = (submit: Props["submit"]) =>
      submit.submitType === "httpRequest" && submit.httpRequest?.newTab;

    if (isLinkSubmission(props.submit)) {
      const defaultValues = (
        props.submit.httpRequest?.defaultData || []
      ).reduce(
        (res, curr) => ({ ...res, [curr.data.key]: curr.data.value }),
        {}
      );
      const url =
        props.submit.httpRequest +
        serialize({ ...defaultValues, ...formState });
      return window.open(url);
    }

    const formId = `${store?.current?.project}.${model.type}.${model.key}`;

    const body = {
      formData: formState,
      formId,
    };

    await fetch(SUBMIT_URL, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });

    dispatch(Event.FORM_SUBMITTED);
    setSubmitting(false);
  }, []);

  useVevEvent(Interaction.UPDATE_FORM, (e: any) => {
    console.log("-> updated", e, formState);
    if (!e) return;
    dispatch(Event.FORM_VALID);

    let value = e.value;

    if (["add", "remove"].includes(e.type)) {
      const prev = formState[e.name] || [];

      if (e.type === "add") {
        value = [...prev, e.value];
      }

      if (e.type === "remove") {
        value = prev.filter((i) => i !== value);
      }
    }

    setFormState((s) => ({ ...s, [e.name]: value }));
  });

  const messages = (state: string) =>
    ({
      loading: <Loader />,
      success: successMessage,
      default: submitButton,
    }[state]);

  return (
    <button
      disabled={submitting}
      onClick={() => handleSubmit(formState)}
      className={styles.button}
    >
      {messages(submitting ? "loading" : "default")}
    </button>
  );
}

registerVevComponent(Button, {
  name: "Form button",
  categories: ["Form"],
  icon: formIcon,
  editableCSS: [
    {
      selector: styles.button,
      title: "Base",
      properties: [
        "background",
        "color",
        "border-radius",
        "box-shadow",
        "padding",
        "font-family",
        "font-size",
        "text-align",
      ],
    },
    {
      selector: styles.button + ":hover",
      title: "Hover",
      properties: ["background", "color", "box-shadow"],
    },
  ],
  props: [
    {
      name: "submitButton",
      title: "Submit button",
      type: "string",
      initialValue: "Submit",
    },
    {
      name: "type",
      type: "select",
      initialValue: "submit",
      options: {
        items: [
          {
            value: "submit",
            label: "Submit",
          },
          {
            value: "reset",
            label: "Reset",
          },
        ],
      },
    },
    {
      name: "successMessage",
      title: "Success message",
      type: "string",
      initialValue: "Thank you",
      hidden: (context) => {
        return context.value.type !== "submit";
      },
    },
    {
      type: "object",
      name: "submit",
      title: "Destination config",
      fields: [
        {
          type: "select",
          name: "submitType",
          title: "Destination",
          initialValue: "httpRequest",
          options: {
            display: "dropdown",
            items: [
              {
                label: "Zapier",
                value: "zapier",
              },
              {
                label: "Google Sheet",
                value: "googleSheet",
              },
              {
                label: "HTTP Request",
                value: "httpRequest",
              },
            ],
          },
        },
        {
          type: "object",
          name: "httpRequest",
          title: "HTML request",
          description: "Send data to a custom URL",
          hidden({ value }) {
            return value?.submit.submitType !== "httpRequest";
          },
          fields: [
            {
              type: "select",
              name: "method",
              initialValue: "POST",
              options: {
                multiselect: false,
                display: "dropdown",
                items: [
                  {
                    label: "GET",
                    value: "GET",
                  },
                  {
                    label: "POST",
                    value: "POST",
                  },
                ],
              },
            },
            {
              type: "string",
              name: "url",
              initialValue: "https://example.com",
              options: {
                type: "text",
                multiline: true,
              },
            },
            {
              type: "boolean",
              name: "newTab",
              title: "Open as link",
              hidden({ value }) {
                return value?.submit?.htmlRequest?.method !== "GET";
              },
            },
            {
              type: "boolean",
              name: "queryParams",
              title: "Query params",
              description:
                "Send data as query params, if not it will be sent as JSON in body",
              initialValue: false,
            },
            {
              name: "defaultData",
              title: "Default data",
              type: "array",
              of: [
                {
                  type: "object",
                  name: "data",
                  fields: [
                    {
                      type: "string",
                      name: "key",
                      title: "Key",
                    },
                    {
                      type: "string",
                      name: "value",
                      title: "Value",
                    },
                  ],
                },
              ],
            },
            {
              name: "defaultHeaders",
              title: "Headers",
              type: "array",
              of: [
                {
                  type: "object",
                  name: "defaultValue",
                  fields: [
                    {
                      type: "string",
                      name: "name",
                      title: "Key",
                    },
                    {
                      type: "string",
                      name: "value",
                      title: "Value",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "string",
          name: "zapierFormName",
          hidden({ value }) {
            return value?.submit.submitType !== "zapier";
          },
        },
        {
          type: "string",
          name: "zapierFormUrl",
          component: ZapierConnect,
          hidden({ value }) {
            return value?.submit.submitType !== "zapier";
          },
        },
        {
          type: "string",
          name: "googleSheetUrl",
          component: GoogleSheetConnect,
          hidden({ value }) {
            return value?.submit.submitType !== "googleSheet";
          },
        },
      ],
    },
  ],
  size: {
    width: 40,
    height: 100,
  },
  events: [
    {
      type: Event.FORM_SUBMITTED,
      description: "On submitted form",
    },
    {
      type: Event.FORM_INVALID,
      description: "On invalid form",
    },
    {
      type: Event.FORM_VALID,
      description: "Form valid",
    },
  ],
  interactions: [
    {
      type: Interaction.UPDATE_FORM,
      description: "Update form",
    },
    {
      type: Interaction.SUBMIT_FORM,
      description: "Submit form",
    },
  ],
});

const Loader = () => (
  <svg
    role="status"
    viewBox="0 0 100 101"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
      fill="#E5E7EB"
    />
    <path
      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
      fill="currentColor"
    />
  </svg>
);

export default Button;
