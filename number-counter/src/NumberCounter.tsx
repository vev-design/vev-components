import React, { useEffect, useRef, useState } from 'react';
import styles from './NumberCounter.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  start: number;
  end: number;
  increment: number;
  delay: number;
  stepSize: number;
  once: boolean;
  separator: string;
};

const NumberCounter = ({
  start = 1,
  end = 100,
  increment = 2,
  delay = 800,
  once = true,
  stepSize = 1,
  separator = ',',
}: Props) => {
  const actualStart = start || 0;
  const internalCount = useRef(actualStart);
  const [hasStarted, setHasStarted] = useState(false);
  const [count, setCount] = useState(actualStart);

  useEffect(() => {
    internalCount.current = start;
  }, [start, stepSize, increment, delay]);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [delay]);

  useEffect(() => {
    const incInterval = setInterval(() => {
      if (hasStarted) {
        if (end < start) {
          if (internalCount.current - stepSize >= end) {
            setCount((internalCount.current -= stepSize));
          } else {
            setCount(end);
          }
        } else {
          if (internalCount.current + stepSize <= end) {
            setCount((internalCount.current += stepSize));
          } else {
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
      <p className={styles.counter}>{styleNumber(count, separator)}</p>
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
      title: 'Run once',
      name: 'once',
      type: 'boolean',
      initialValue: true,
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
