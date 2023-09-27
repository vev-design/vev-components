import React, { useEffect, useRef, useState } from "react";
import {
  registerVevComponent,
  useDispatchVevEvent,
  useEditorState,
  useVevEvent,
  useVisible,
} from "@vev/react";
import styles from "./NumberCounter.module.css";
import { Events, Interactions } from "./events";

type Props = {
  settings: {
    start: number;
    end: number;
    once: boolean;
    runWhenVisible: boolean;
  };
  duration: {
    animationLength: number;
    delay: number;
  };
  format: {
    localeFormat: boolean;
    separator: string;
    precision: number;
    prefix: string;
    postfix: string;
  };
  disable: boolean;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

const NumberCounter = ({
  settings = {
    start: 1,
    end: 100,
    once: true,
    runWhenVisible: false,
  },
  duration = { animationLength: 5, delay: 800 },
  format = {
    localeFormat: false,
    separator: ",",
    precision: 0,
    prefix: "",
    postfix: "",
  },
  hostRef,
  disable = false,
}: Props) => {
  const { runWhenVisible, end: initEnd, once, start: initStart } = settings;
  const { animationLength, delay } = duration;
  const {
    localeFormat,
    separator,
    precision: initPrecision,
    prefix = "",
    postfix = "",
  } = format;

  const start = initStart || 0;
  const end = initEnd || 0;
  const precision = initPrecision || 0;

  const internalCount = useRef<number>(start);
  const [count, setCount] = useState<number>(start);
  const [stepSize, setStepSize] = useState<number>(1);
  const interval = useRef<NodeJS.Timer>();
  const [hasStarted, setHasStarted] = useState(false);
  const isVisible = useVisible(hostRef);
  const { disabled, schemaOpen } = useEditorState();

  const dispatchVevEvent = useDispatchVevEvent();

  function resetCounter() {
    internalCount.current = start;
    setCount(start);
  }

  useEffect(() => {
    if (start < end) {
      const animationLengthMs = animationLength * 1000;
      const newStepSize = (25 * (end - start)) / animationLengthMs;
      setStepSize(newStepSize);
    } else {
      const animationLengthMs = animationLength * 1000;
      const newStepSize = (25 * (end - start)) / animationLengthMs;
      setStepSize(newStepSize);
    }
  }, [animationLength, start, end, delay]);

  useEffect(() => {
    if (!isVisible) {
      resetCounter();
    }
  }, [isVisible]);

  useEffect(() => {
    if (runWhenVisible && !isVisible) {
      resetCounter();
      setHasStarted(false);
      return;
    }
    if (disabled && !schemaOpen) {
      resetCounter();
      setHasStarted(false);
      return;
    }
    const initialDelay = setTimeout(() => {
      if (!disable) {
        setHasStarted(true);
      }
    }, delay);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [delay, isVisible, runWhenVisible, disabled, schemaOpen]);

  useEffect(() => {
    clearInterval(interval.current);
    resetCounter();
  }, [start, end, stepSize, precision, delay]);

  useVevEvent(Interactions.START, () => {
    setHasStarted(true);
  });

  useVevEvent(Interactions.STOP, () => {
    setHasStarted(false);
  });

  useVevEvent(Interactions.RESET, () => {
    setCount(start);
    internalCount.current = start;
  });

  useEffect(() => {
    if (interval.current) {
      clearInterval(interval.current);
    }

    interval.current = setInterval(() => {
      if (hasStarted) {
        if (end < start) {
          if (internalCount.current + stepSize >= end) {
            setCount((internalCount.current += stepSize));
          } else {
            dispatchVevEvent(Events.COMPLETE);
            internalCount.current = end;
            setCount(end);
          }
        } else {
          if (internalCount.current + stepSize <= end) {
            setCount((internalCount.current += stepSize));
          } else {
            dispatchVevEvent(Events.COMPLETE);
            internalCount.current = end;
            setCount(end);
          }
        }

        if (internalCount.current === end && !once) {
          resetCounter();
        }
      }
    }, 25);

    return () => {};
  }, [hasStarted, end, once, start, stepSize]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.counter}>
        {prefix +
          styleNumber(count, separator, precision, localeFormat) +
          postfix}
      </div>
    </div>
  );
};

function styleNumber(
  x: number,
  separator: string,
  precision: number,
  localeFormat: boolean
) {
  if (localeFormat) {
    return new Intl.NumberFormat(navigator.language, {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
    }).format(x);
  }

  if (x > 1000) {
    return x.toFixed(precision).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  } else {
    return x.toFixed(precision);
  }
}

registerVevComponent(NumberCounter, {
  name: "Number Counter",
  description:
    "Begins at the specified start number and counts by the specified step until the end number is reached. Increments up or down depending on start and end values provided.",
  props: [
    {
      name: "settings",
      title: "Settings",
      type: "object",
      initialValue: {
        start: 1,
        end: 100,
        once: true,
        runWhenVisible: false,
      },
      fields: [
        { title: "Start", name: "start", type: "number", initialValue: 1 },
        { title: "End", name: "end", type: "number", initialValue: 100 },
        {
          title: "Run once",
          name: "once",
          type: "boolean",
          initialValue: true,
        },
        {
          title: "Run when visible",
          name: "runWhenVisible",
          type: "boolean",
          initialValue: false,
        },
      ],
    },
    {
      title: "Duration",
      name: "duration",
      type: "object",
      initialValue: { increment: 2, delay: 800, stepSize: 1 },
      fields: [
        {
          title: "Duration (s)",
          name: "animationLength",
          type: "number",
          initialValue: 5,
        },
        {
          title: "Delay animation start (ms)",
          name: "delay",
          type: "number",
          initialValue: 800,
        },
      ],
    },
    {
      name: "format",
      title: "Formatting",
      type: "object",
      initialValue: { localeFormat: false, separator: "," },
      fields: [
        {
          title: "Locale formatting",
          description: "Use users locale to determine number formatting",
          name: "localeFormat",
          type: "boolean",
          initialValue: false,
        },
        {
          title: "Decimal precision",
          name: "precision",
          type: "number",
          initialValue: 0,
        },
        {
          title: "Digit separator",
          name: "separator",
          type: "string",
          initialValue: ",",
          hidden: (context) => {
            console.log("context", context);
            return context.value.format.localeFormat === true;
          },
        },
        {
          title: "Prefix",
          name: "prefix",
          type: "string",
          initialValue: "",
        },
        {
          title: "Postfix",
          name: "postfix",
          type: "string",
          initialValue: "",
        },
      ],
    },
  ],
  events: [
    {
      type: Events.COMPLETE,
      description: "Completed",
    },
  ],
  interactions: [
    {
      type: Interactions.START,
      description: "Start",
    },
    {
      type: Interactions.STOP,
      description: "Stop",
    },
    {
      type: Interactions.RESET,
      description: "Stop",
    },
  ],
  editableCSS: [
    {
      title: "Number",
      selector: styles.counter,
      properties: [
        "font-family",
        "font-size",
        "letter-spacing",
        "word-spacing",
        "font-weight",
        "color",
        "font-style",
        "text-align",
        "text-decoration",
      ],
    },
    {
      title: "Number",
      selector: styles.wrapper,
      properties: ["margin", "padding"],
    },
  ],
  type: "standard",
});

export default NumberCounter;
