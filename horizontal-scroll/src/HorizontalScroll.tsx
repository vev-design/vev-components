import {
  WidgetNode,
  registerVevComponent,
  useEditorState,
  useScrollTop,
  useVisible,
} from "@vev/react";
import React, { useLayoutEffect, useRef } from "react";
import styles from "./HorizontalScroll.module.css";
import { useViewAnimation, useViewTimeline } from "./hooks";

type Props = {
  children: string[];
};

const HORIZONTAL_SCROLL_KEYFRAMES: PropertyIndexedKeyframes = {
  translate: ["0 0", "calc(100vw - 100%) 0"],
};

const HorizontalScroll = ({ children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTop = useScrollTop();
  const visible = useVisible(ref);
  const { disabled, activeContentChild } = useEditorState();
  const timeline = useViewTimeline(ref);
  const showSlideKey = disabled && activeContentChild;
  useViewAnimation(ref, HORIZONTAL_SCROLL_KEYFRAMES, timeline, !!showSlideKey);

  useLayoutEffect(() => {
    const el = ref.current;
    if (disabled && el) {
      const { top } = el.getBoundingClientRect();
      el.style.marginLeft = `-${top}px`;
    }
  }, [disabled, scrollTop]);

  let cl = `${styles.wrapper}`;
  if (showSlideKey) cl += " " + styles.editSlides;
  if (visible) cl += " " + styles.visible;
  return (
    <div
      ref={ref}
      className={cl}
      style={{ "--slide-count": children.length } as any}
    >
      {children.map((childKey, index) => (
        <Slide
          key={childKey}
          id={childKey}
          index={index}
          selected={showSlideKey === childKey}
        />
      ))}
    </div>
  );
};

function Slide({
  id,
  selected,
  index,
}: {
  id: string;
  selected: boolean;
  index: number;
}) {
  let cl = styles.content;
  if (selected) cl += " " + styles.selected;
  return (
    <div className={cl} style={{ "--index": index }}>
      <WidgetNode id={id} />
    </div>
  );
}

registerVevComponent(HorizontalScroll, {
  name: "HorizontalScroll",
  props: [],
  children: {
    name: "Slide",
  },
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: "both",
});

export default HorizontalScroll;
