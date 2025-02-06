import React, { useEffect } from "react";
import { FieldProps } from "../../types";
import cx from "classnames";
import { registerVevComponent } from "@vev/react";
import formIcon from "../../assets/form-icon.svg";
import styles from "./Toggle.module.css";
import FieldWrapper from "../FieldWrapper";
import { useFormField } from "../../hooks/use-form";

function Toggle(props: FieldProps) {
  const [value, onChange] = useFormField<string>(props.variable);
  const { name } = props;

  const handleChange = (value: boolean) => {
    onChange(value.toString());
  };

  useEffect(() => {
    if (props.initialValue) {
      onChange(value);
    }
  }, [value, onChange, props.initialValue]);

  const booleanValue: boolean = value === "true";

  return (
    <FieldWrapper>
      <label htmlFor={name} className={styles.container}>
        <span
          className={cx(styles.field, {
            [styles.fieldActive]: !!booleanValue,
            [styles.fieldInactive]: !booleanValue,
          })}
        >
          <input
            className={styles.checkbox}
            type="checkbox"
            value={(value || "").toString() || ""}
            id={name}
            name={name}
            onChange={() => handleChange(!booleanValue)}
            checked={!!booleanValue}
          />
          <span
            className={cx(styles.switch, {
              [styles.switchActive]: !!booleanValue,
            })}
          />
        </span>
      </label>
    </FieldWrapper>
  );
}

registerVevComponent(Toggle, {
  name: "Toggle",
  icon: formIcon,
  categories: ["Form"],
  editableCSS: [
    {
      selector: styles.fieldInactive,
      title: "Background",
      properties: ["background"],
    },
    {
      selector: styles.field,
      title: "Toggle",
      properties: ["border-radius", "border"],
    },
    {
      selector: styles.switch,
      title: "Switch",
      properties: ["background"],
    },
    {
      selector: styles.fieldActive,
      title: "Background Active",
      properties: ["background"],
    },
  ],
  size: {
    height: "auto",
    width: "auto",
  },
  props: [
    {
      name: "variable",
      type: "variable",
    },
    {
      name: "initialValue",
      type: "boolean",
      title: "Default true",
    },
  ],
  interactions: [
    {
      type: "SET",
      description: "Set value",
      args: [
        {
          name: "value",
          type: "boolean",
        },
      ],
    },
  ],
});

export default Toggle;
