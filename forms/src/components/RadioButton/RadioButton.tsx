import React, { useCallback, useEffect, useRef, useState } from "react";
import { FieldProps, Event } from "../../types";
import { registerVevComponent, useDispatchVevEvent } from "@vev/react";
import formIcon from "../../assets/form-icon.svg";
import styles from "./RadioButton.module.css";
import cx from "classnames";
import FieldWrapper from "../FieldWrapper";

type RadioButton = FieldProps & {
  name: string;
  label: string;
  value: string;
  initialValue: boolean;
};

function RadioButton(props: RadioButton) {
  const dispatch = useDispatchVevEvent();
  const ref = useRef<HTMLInputElement>();

  const handleChange = useCallback(
    (value: string) => {
      console.log("value", value);
      dispatch(Event.onChange, {
        name: props.name,
        value,
      });
    },
    [props.name]
  );

  useEffect(() => {
    if (props.initialValue) {
      handleChange(props.value);
      ref.current.checked = true;
    }
  }, []);

  return (
    <FieldWrapper>
      <div className={styles.item}>
        <label className={styles.itemLabel}>
          {props.label}
          <input
            ref={ref}
            id={props.value}
            type="radio"
            value={props.value}
            onChange={(e) => {
              handleChange(e.target.value);
            }}
            name={props.name}
          />
        </label>
      </div>
    </FieldWrapper>
  );
}

registerVevComponent(RadioButton, {
  name: "Radio button",
  categories: ["Form"],
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
    },
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
});

export default RadioButton;
