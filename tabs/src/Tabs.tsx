import React, { useEffect, useState } from "react";
import styles from "./Tabs.module.css";
import { registerVevComponent, useEditorState, useModel } from "@vev/react";
import { WidgetNode, } from '@vev/react';

type Props = {
  title: string;
  index: number;
  selectedIndex: number;
  children: string[];
  tabPosition: "left" | "center" | "right";
  gap: number;
  margin: number;
};

const Tabs = ({ selectedIndex = 0, children = [] as string[], tabPosition = "left", gap = 10, margin = 0, ...rest }: Props) => {
  const [index, setIndex] = useState(0);
  const id = children?.[selectedIndex || index || 0];
  const isTop = tabPosition.includes('top');

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs + ' ' + styles[`${tabPosition}Tab`]} style={{ gap: gap, ...(isTop ? { marginBottom: margin } : { marginTop: margin }) }}>
        {children.map((child, i) => (
          <Tab key={i} id={child} active={index === i} onClick={() => setIndex(i)} />
        ))}
      </div>
      {id && <WidgetNode id={id} />}
    </div >
  );
};

const Tab = ({ id, active, onClick }: { id: string, active: boolean, onClick: () => void }) => {
  const model = useModel(id);
  console.log('name', model?.name);
  return (
    <button className={styles.tab + (active ? ' ' + styles.activeTab : '')} onClick={onClick}>
      {model?.name || 'Tab'}
    </button>
  )
}

registerVevComponent(Tabs, {
  name: "Tabs",
  description: "Tabs component",
  type: 'both',
  children: {
    name: 'Tab',
  },
  props: [{
    name: "tabPosition",
    type: "select",
    initialValue: "topCenter",
    options: {
      display: "dropdown",
      items: [
        {
          label: "Top Left",
          value: "topLeft",
        },
        {
          label: "Top Center",
          value: "topCenter",
        },
        {
          label: "Top Right",
          value: "topRight",
        },
        {
          label: "Bottom Left",
          value: "bottomLeft",
        },
        {
          label: "Bottom Center",
          value: "bottomCenter",
        },
        {
          label: "Bottom Right",
          value: "bottomRight",
        },
      ],
    },
  }, {
    name: "gap",
    type: "number",
    initialValue: 10,
  }, {
    name: "margin",
    type: "number",
    initialValue: 0,
  }],
  editableCSS: [
    {
      selector: styles.tab,
      properties: ["background", "color", "border", "border-radius", "padding", "border-radius", "font-size", "font-weight", "font-family"],
    },
    {
      selector: styles.activeTab,
      properties: ["background", "color", "border", "border-radius", "padding", "border-radius"],
    },
  ],
});

export default Tabs;
