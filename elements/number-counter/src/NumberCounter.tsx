import React, { useEffect, useRef, useState } from 'react';
import styles from './NumberCounter.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  range: {
    start: number;
    end: number;
  };
  increment: number;
  delay: number;
  stepSize: number;
  once: boolean;
  separator: string;
};

const NumberCounter = ({
  range = { start: 0, end: 100 },
  increment = 2,
  delay = 800,
  once = true,
  stepSize = 1,
  separator = ',',
}: Props) => {
  const actualStart = range.start || 0;
  const internalCount = useRef(range.start);
  const [hasStarted, setHasStarted] = useState(false);
  const [count, setCount] = useState(range.start);

  useEffect(() => {
    internalCount.current = range.start;
  }, [range.start, stepSize, increment, delay]);

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
      if (range.end < range.start) {
        if (internalCount.current - stepSize >= range.end && hasStarted) {
          setCount((internalCount.current -= stepSize));
        } else {
          setCount(range.end);
        }
      } else {
        if (internalCount.current + stepSize <= range.end && hasStarted) {
          setCount((internalCount.current += stepSize));
        } else {
          setCount(range.end);
        }
      }

      if (internalCount.current === range.end && !once) {
        internalCount.current = actualStart;
        setCount(actualStart);
      }
    }, increment);

    return () => {
      clearInterval(incInterval);
    };
  }, [hasStarted, increment, range.end, once, range.start, actualStart, stepSize]);

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
    {
      name: 'range',
      title: 'Range',
      type: 'object',
      fields: [
        { title: 'Start', name: 'start', type: 'number', initialValue: 0 },
        { title: 'End', name: 'end', type: 'number', initialValue: 100 },
      ],
    },
    {
      title: 'Increment speed (milliseconds)',
      name: 'increment',
      type: 'number',
      initialValue: 2,
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
