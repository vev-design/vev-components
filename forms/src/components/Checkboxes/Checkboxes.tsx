import React, { useCallback, useState } from "react";
import { FieldProps, Event } from "../../types";
import { registerVevComponent, useDispatchVevEvent } from "@vev/react";
import formIcon from "../../assets/form-icon.svg";
import styles from "./Checkboxes.module.css";
import cx from "classnames";
import FieldWrapper from "../FieldWrapper";

type Props = FieldProps & {
  items: { item: { label: string; value: string } }[];
};

function Checkboxes(props: Props) {
  const items = props?.items?.map((opt) => opt["item"]);

  return (
    <div>
      <Boxes {...props} items={items} />
    </div>
  );
}

type CheckboxesProps = FieldProps & {
  items: { label: string; value: string }[];
};

function Boxes(props: CheckboxesProps) {
  const { items, name } = props;
  const [value, setValue] = useState([]);
  const dispatch = useDispatchVevEvent();

  const handleChange = useCallback((value: any, type?: "add" | "remove") => {
    if (type === "add")
      return setValue((prev) => {
        const updated = [...prev, value];
        dispatch(Event.onChange, {
          [name]: updated,
        });
        return updated;
      });

    if (type === "remove")
      return setValue((prev) => {
        const updated = prev.filter((i) => i !== value);
        dispatch(Event.onChange, {
          [name]: updated,
        });
        return updated;
      });
  }, []);

  return (
    <FieldWrapper>
      <div className={styles.wrapper}>
        {items?.map((item) => {
          const isChecked = value?.includes(item.value);

          return (
            <div key={item.value} className={styles.item}>
              <label htmlFor={item.value} className={styles.itemLabel}>
                {item.label}
                <input
                  id={item.value}
                  type="checkbox"
                  value={item.value}
                  onChange={(e) => {
                    const { value, checked } = e.target;
                    if (checked) {
                      handleChange(value, "add");
                    } else {
                      handleChange(value, "remove");
                    }
                  }}
                />
                <span
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
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </FieldWrapper>
  );
}

registerVevComponent(Checkboxes, {
  name: "Checkboxes",
  categories: ["Form"],
  icon: formIcon,
  editableCSS: [
    {
      selector: styles.itemLabel,
      title: "Item label",
      properties: ["color", "padding", "font-family", "font-size"],
    },
    {
      selector: styles.checkmarkChecked,
      title: "Checkmark",
      properties: ["background"],
    },
  ],
  size: {
    height: "auto",
    width: 300,
  },
  events: [
    {
      type: Event.onChange,
    },
  ],
  props: [
    {
      name: "name",
      type: "string",
      initialValue: "fruits",
    },
    {
      name: "title",
      type: "string",
      initialValue: "Fruits",
    },
    {
      name: "items",
      type: "array",
      initialValue: [
        {
          item: {
            label: "Apple",
            value: "apple",
          },
        },
        {
          item: {
            label: "Orange",
            value: "orange",
          },
        },
        {
          item: {
            label: "Pear",
            value: "pear",
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
          ],
        },
      ],
    },
  ],
});

export default Checkboxes;
