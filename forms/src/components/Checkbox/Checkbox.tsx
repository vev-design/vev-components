import React, { useCallback, useEffect, useRef, useState } from "react";
import { FieldProps, Event } from "../../types";
import { registerVevComponent, useDispatchVevEvent } from "@vev/react";
import formIcon from "../../assets/form-icon.svg";
import styles from "./Checkbox.module.css";
import cx from "classnames";
import FieldWrapper from "../FieldWrapper";

type Props = FieldProps & {
  name: string;
};

function Checkbox(props: Props) {
  const { name, value } = props;
  const ref = useRef<HTMLInputElement>();
  const dispatch = useDispatchVevEvent();

  const isChecked = false;

  useEffect(() => {
    if (props.initialValue) {
      console.log("initialValue", props.initialValue);
      ref?.current && (ref.current.checked = true);
    }
  }, []);

  return (
    <div className={styles.checkbox}>
      <input
        ref={ref}
        name={name}
        id={name}
        type="checkbox"
        onChange={(e) => {
          const { checked } = e.target;
          dispatch(Event.onChange, {
            name,
            value,
            type: checked ? "add" : "remove",
          });
        }}
      />
      {/*       <span
        className={cx(styles.checkmark, {
          [styles.checkmarkChecked]: isChecked,
        })}
      >
        {isChecked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className={styles.checkmarkIcon}
          >
            <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
          </svg>
        )}
      </span> */}
    </div>
  );
}

registerVevComponent(Checkbox, {
  name: "Checkbox",
  categories: ["Form"],
  icon: formIcon,
  props: [
    {
      name: "name",
      type: "string",
      initialValue: "fruits",
    },
    {
      name: "value",
      type: "string",
    },
    {
      name: "initialValue",
      type: "boolean",
    },
  ],
  editableCSS: [
    {
      selector: styles.checkbox,
      title: "Background",
      properties: ["background", "border", "border-radius"],
    },
    {
      selector: styles.checkbox + " input:checked",
      title: "Checked",
      properties: ["background"],
    },
  ],
  size: {
    width: 50,
    height: 50,
  },
  events: [
    {
      type: Event.onChange,
    },
  ],
});

export default Checkbox;
