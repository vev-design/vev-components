import React, { useCallback, useEffect, useState } from "react";
import { FieldProps, Event } from "../../types";
import { registerVevComponent, useDispatchVevEvent } from "@vev/react";
import formIcon from "../../assets/form-icon.svg";
import styles from "./RadioButtons.module.css";
import cx from "classnames";
import FieldWrapper from "../FieldWrapper";

type RadioButtons = FieldProps & {
  placeholder?: string;
  items: { item: { label: string; value: string; initialValue: boolean } }[];
};

function RadioButtons(props: RadioButtons) {
  const [value, setValue] = useState("");
  const dispatch = useDispatchVevEvent();

  const options = props.items?.map((opt) => opt.item);

  const handleChange = useCallback(
    (value: string) => {
      dispatch(Event.onChange, {
        name: props.name,
        value,
      });
      setValue(value);
    },
    [props.name]
  );

  useEffect(() => {
    const initialValue = options?.find((item) => item.initialValue);
    if (initialValue) handleChange(initialValue.value);
  }, []);

  return (
    <FieldWrapper>
      <div className={styles.wrapper}>
        {options?.map((item, i) => {
          const isChecked = value === item.value;
          return (
            <div key={i} className={styles.item}>
              <label className={styles.itemLabel}>
                {item.label}
                <input
                  id={item.value}
                  type="radio"
                  value={item.value}
                  checked={item.value === value}
                  onChange={(e) => handleChange(e.target.value)}
                />
                <span
                  className={cx(styles.radioButton, {
                    [styles.radioButtonChecked]: isChecked,
                  })}
                >
                  {isChecked && <span className={styles.dot} />}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

registerVevComponent(RadioButtons, {
  name: "Radio buttons",
  categories: ["Forms"],
  icon: formIcon,
  size: {
    height: "auto",
    width: 300,
  },
  editableCSS: [
    {
      selector: styles.itemLabel,
      title: "Item label",
      properties: ["color", "padding", "font-family", "font-size"],
    },
    {
      selector: styles.radioButtonChecked,
      title: "Radio button",
      properties: ["background"],
    },
  ],
  events: [
    {
      type: Event.onChange,
    },
  ],
  props: [
    {
      name: "name",
      type: "string",
      initialValue: "radio",
    },
    {
      type: "boolean",
      name: "required",
    },
    {
      name: "items",
      type: "array",
      initialValue: [
        {
          item: {
            label: "Option 1",
            value: "option1",
          },
        },
        {
          item: {
            label: "Option 2",
            value: "option2",
          },
        },
        {
          item: {
            label: "Option 3",
            value: "option3",
          },
        },
      ],
      of: [
        {
          type: "object",
          name: "item",
          fields: [
            {
              type: "string",
              name: "label",
            },
            {
              type: "string",
              name: "value",
            },
            {
              type: "boolean",
              name: "initialValue",
              title: "Initial value",
            },
          ],
        },
      ],
    },
  ],
});

export default RadioButtons;
