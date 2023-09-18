import React, { useEffect, useState, useCallback } from "react";
import { FieldProps, Event } from "../../types";
import { registerVevComponent, useDispatchVevEvent } from "@vev/react";
import formIcon from "../../assets/form-icon.svg";
import styles from "./Dropdown.module.css";
import FieldWrapper from "../FieldWrapper";

type DropdownProps = FieldProps & {
  placeholder?: string;
  items: { item: { label: string; value: string; initialValue: boolean } }[];
};

function Dropdown(props: DropdownProps) {
  const [value, setValue] = useState("");
  const dispatch = useDispatchVevEvent();

  const { name, required, items, placeholder } = props;
  const options = items?.map((opt) => opt["item"]);

  const handleChange = useCallback(
    (value: string) => {
      dispatch(Event.onChange, {
        [props.name]: value,
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
        <select
          name={name}
          value={value || ""}
          onChange={(e) => handleChange(e.target.value)}
          className={styles.select}
        >
          <option value="" disabled selected>
            {placeholder || "Select your option"}
          </option>
          {options?.map((opt, i) => (
            <option value={opt.value} key={i}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className={styles.arrow}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </FieldWrapper>
  );
}

registerVevComponent(Dropdown, {
  name: "Dropdown",
  categories: ["Form"],
  icon: formIcon,
  size: {
    height: "auto",
    width: 300,
  },
  editableCSS: [
    {
      selector: styles.select,
      title: "Input",
      properties: [
        "border",
        "background",
        "box-shadow",
        "padding",
        "color",
        "border-radius",
        "font-family",
        "font-size",
      ],
    },
    {
      selector: styles.arrow,
      title: "Arrow",
      properties: ["fill"],
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
      name: "placeholder",
      type: "string",
    },
    {
      name: "items",
      type: "array",
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

export default Dropdown;