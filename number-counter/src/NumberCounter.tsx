import React, { useEffect, useRef, useState } from 'react';
import {registerVevComponent, useDispatchVevEvent, useVevEvent, useVisible} from '@vev/react';
import styles from './NumberCounter.module.css';
import {Events, Interactions} from "./events";

type Props = {
  start: number;
  end: number;
  increment: number;
  delay: number;
  stepSize: number;
  once: boolean;
  separator: string;
  runWhenVisible: boolean;
  disable: boolean;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

const NumberCounter = ({
  start = 1,
  end = 100,
  increment = 2,
  delay = 800,
  once = true,
  stepSize = 1,
  separator = ',',
  runWhenVisible = false,
  hostRef, disable = false,
}: Props) => {
  const actualStart = start || 0;
  const internalCount = useRef(actualStart);
  const [hasStarted, setHasStarted] = useState(false);
  const [count, setCount] = useState(actualStart);
  const isVisible = useVisible(hostRef);

  const dispatchVevEvent = useDispatchVevEvent();


  useEffect(() => {
    if(!isVisible) {
      internalCount.current = start
      setCount(start);
    }
  }, [isVisible]);

  useEffect(() => {
    internalCount.current = start;
  }, [start, stepSize, increment, delay]);

  useEffect(() => {
    if (runWhenVisible && !isVisible) return () => {};
    const initialDelay = setTimeout(() => {
      if(!disable) {
        setHasStarted(true);
      }
    }, delay);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [delay, isVisible, runWhenVisible]);

  useVevEvent(Interactions.START, () => {
    setHasStarted(true);
  })

  useVevEvent(Interactions.STOP, () => {
    setHasStarted(false);
  })

  useVevEvent(Interactions.RESET, () => {
    setCount(start);
    internalCount.current = start;
  })

  useEffect(() => {
    const incInterval = setInterval(() => {
      if (hasStarted) {
        if (end < start) {
          if (internalCount.current - stepSize >= end) {
            setCount((internalCount.current -= stepSize));
          } else {
            dispatchVevEvent(Events.COMPLETE);
            setCount(end);
          }
        } else {
          if (internalCount.current + stepSize <= end) {
            setCount((internalCount.current += stepSize));
          } else {
            dispatchVevEvent(Events.COMPLETE);
            setCount(end);
          }
        }

        if (internalCount.current === end && !once) {
          internalCount.current = actualStart;
          setCount(actualStart);
        }
      }
    }, increment);

    return () => {
      clearInterval(incInterval);
    };
  }, [hasStarted, increment, end, once, start, actualStart, stepSize]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.counter}>{styleNumber(count, separator)}</div>
    </div>
  );
};

function styleNumber(x: number, separator: string) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

registerVevComponent(NumberCounter, {
  name: 'Number Counter',
  description:
    'Begins at the specified start number and counts by the specified step until the end number is reached. Increments up or down depending on start and end values provided.',
  props: [
    { title: 'Start', name: 'start', type: 'number', initialValue: 1 },
    { title: 'End', name: 'end', type: 'number', initialValue: 100 },
    {
      title: 'Increment speed (milliseconds)',
      name: 'increment',
      type: 'number',
      initialValue: 300,
    },
    {
      title: 'Delay animation start (milliseconds)',
      name: 'delay',
      type: 'number',
      initialValue: 800,
    },
    {
      title: 'Step size',
      name: 'stepSize',
      type: 'number',
      initialValue: 1,
    },
    {
      title: 'Digit separator',
      name: 'separator',
      type: 'string',
      initialValue: ',',
    },
    {
      title: 'Run once',
      name: 'once',
      type: 'boolean',
      initialValue: true,
    },
    {
      title: 'Disable',
      name: 'disable',
      type: 'boolean',
      initialValue: false,
    },
    {
      title: 'Run when visible',
      name: 'runWhenVisible',
      type: 'boolean',
      initialValue: false,
    },
  ],
  events: [
    {
      type: Events.COMPLETE,
      description: 'Completed'
    }
  ],
  interactions: [
    {
      type: Interactions.START,
      description: 'Start',
    },
    {
      type: Interactions.STOP,
      description: 'Stop',
    },
    {
      type: Interactions.RESET,
      description: 'Stop',
    },
  ],
  editableCSS: [
    {
      title: 'Number',
      selector: styles.counter,
      properties: [
        'font-family',
        'font-size',
        'letter-spacing',
        'word-spacing',
        'font-weight',
        'color',
        'font-style',
        'text-align',
        'text-decoration',
      ],
    },
    {
      title: 'Number',
      selector: styles.wrapper,
      properties: ['margin', 'padding'],
    },
  ],
  type: 'standard',
});

export default NumberCounter;
