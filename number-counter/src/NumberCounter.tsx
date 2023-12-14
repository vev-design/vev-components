import React, { useEffect, useState } from 'react';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useEditorState,
  useFrame,
  useVevEvent,
  useVisible,
} from '@vev/react';
import styles from './NumberCounter.module.css';
import { Events, Interactions } from './events';
import { easeIn, easeOut, easingNone, normalize, round } from './math-utils';

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
  easing: 'none' | 'easein' | 'easeout';
  format: {
    localeFormat: boolean;
    separator: string;
    decimalSeparator: string;
    precision: number;
    prefix: string;
    postfix: string;
  };
  disable: boolean;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

// Floating point hack
const oneIsh = 0.999999;

const NumberCounter = ({
  settings = {
    start: 1,
    end: 100,
    once: true,
    runWhenVisible: false,
  },
  easing = 'none',
  duration = { animationLength: 5, delay: 800 },
  format = {
    localeFormat: false,
    separator: ',',
    decimalSeparator: '.',
    precision: 0,
    prefix: '',
    postfix: '',
  },
  hostRef,
  disable = false,
}: Props) => {
  const { runWhenVisible, end: initEnd, once, start: initStart } = settings;
  const { animationLength, delay } = duration;
  const {
    localeFormat,
    separator,
    decimalSeparator,
    precision: initPrecision,
    prefix = '',
    postfix = '',
  } = format;

  const start = initStart || 0;
  const end = initEnd || 0;
  const precision = initPrecision || 0;

  const [count, setCount] = useState<number>(start);
  const [hasStarted, setHasStarted] = useState(false);
  const isVisible = useVisible(hostRef);
  const { disabled, schemaOpen } = useEditorState();
  const [startedTimestamp, setStartedTimestamp] = useState<number>(0);
  const dispatchVevEvent = useDispatchVevEvent();
  const actualSchemaOpen = disabled && schemaOpen;

  function resetCounter() {
    setStartedTimestamp(0);
    setCount(start);
    setHasStarted(false);
  }

  useFrame(
    (timestamp) => {
      if (!hasStarted) return;

      if (startedTimestamp === 0) {
        setStartedTimestamp(timestamp);
      } else {
        const animationLengthMs = animationLength * 1000;
        const delta = timestamp - startedTimestamp;
        const normalizedDelta = normalize(delta, 0, animationLengthMs);
        let animationProgress: number;

        switch (easing) {
          case 'none':
            animationProgress = easingNone(normalizedDelta);
            break;
          case 'easein':
            animationProgress = easeIn(normalizedDelta);
            break;
          case 'easeout':
            animationProgress = easeOut(normalizedDelta);
            break;
        }

        // Animation done
        if (animationProgress >= oneIsh) {
          if (once) {
            setCount(end);
            dispatchVevEvent(Events.COMPLETE);
            setHasStarted(false);
          } else {
            resetCounter();
            dispatchVevEvent(Events.COMPLETE);
          }
          return;
        }

        // Set count
        if (end > start) {
          const newCount = round(animationProgress * (end - start) + start);
          setCount(newCount);
        } else {
          // end < start
          const newCount = round(start - (start - end) * animationProgress);
          setCount(newCount);
        }
      }
    },
    [hasStarted, startedTimestamp],
  );

  useEffect(() => {
    if (!isVisible) {
      resetCounter();
    }
  }, [isVisible]);

  useEffect(() => {
    if (runWhenVisible && !isVisible) {
      resetCounter();
      return;
    }

    if (disabled && !actualSchemaOpen) {
      resetCounter();
      return;
    }

    const initialDelay = setTimeout(() => {
      if (!disable && isVisible) {
        setHasStarted(true);
      }
    }, delay);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [delay, isVisible, runWhenVisible, disabled, actualSchemaOpen]);

  // For restarting counter when changing props in editor
  useEffect(() => {
    if (actualSchemaOpen) {
      resetCounter();
      setHasStarted(true);
    }
  }, [start, end, precision, delay, easing, disabled, duration, delay, actualSchemaOpen]);

  useVevEvent(Interactions.START, () => {
    setHasStarted(true);
  });

  useVevEvent(Interactions.STOP, () => {
    setHasStarted(false);
  });

  useVevEvent(Interactions.RESET, () => {
    setCount(start);
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.counter}>
        {prefix +
          styleNumber(count, separator, decimalSeparator, precision, localeFormat) +
          postfix}
      </div>
    </div>
  );
};

function styleNumber(
  x: number,
  separator: string,
  decimalSeparator: string,
  precision: number,
  localeFormat: boolean,
) {
  if (localeFormat) {
    return new Intl.NumberFormat(navigator.language, {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
    }).format(x);
  }

  const toFixed = x.toFixed(precision);
  const parts = toFixed.split('.');
  if (parts.length === 1) {
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }

  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator) + decimalSeparator + parts[1];
}

registerVevComponent(NumberCounter, {
  name: 'Number Counter',
  description:
    'Begins at the specified start number and counts by the specified step until the end number is reached. Increments up or down depending on start and end values provided.',
  props: [
    {
      name: 'settings',
      title: 'Settings',
      type: 'object',
      initialValue: {
        start: 1,
        end: 100,
        once: true,
        runWhenVisible: false,
      },
      fields: [
        { title: 'Start', name: 'start', type: 'number', initialValue: 1 },
        { title: 'End', name: 'end', type: 'number', initialValue: 100 },
        {
          title: 'Run once',
          name: 'once',
          type: 'boolean',
          initialValue: true,
        },
        {
          title: 'Run when visible',
          name: 'runWhenVisible',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
    {
      title: 'Duration',
      name: 'duration',
      type: 'object',
      initialValue: { increment: 2, delay: 800, stepSize: 1 },
      fields: [
        {
          title: 'Duration (s)',
          name: 'animationLength',
          type: 'number',
          initialValue: 5,
        },
        {
          title: 'Delay animation start (ms)',
          name: 'delay',
          type: 'number',
          initialValue: 800,
        },
      ],
    },
    {
      title: 'Easing',
      name: 'easing',
      type: 'select',
      initialValue: 'none',
      options: {
        display: 'dropdown',
        items: [
          { label: 'None', value: 'none' },
          { label: 'Ease in', value: 'easein' },
          { label: 'Ease out', value: 'easeout' },
        ],
      },
    },
    {
      name: 'format',
      title: 'Formatting',
      type: 'object',
      initialValue: { localeFormat: false, separator: ',' },
      fields: [
        {
          title: 'Locale formatting',
          description: 'Use users locale to determine number formatting',
          name: 'localeFormat',
          type: 'boolean',
          initialValue: false,
        },
        {
          title: 'Decimal precision',
          name: 'precision',
          type: 'number',
          initialValue: 0,
        },
        {
          title: 'Digit separator (thousands)',
          name: 'separator',
          type: 'string',
          initialValue: ',',
          hidden: (context) => {
            return context.value.format.localeFormat === true;
          },
        },
        {
          title: 'Digit separator (decimal)',
          name: 'decimalSeparator',
          type: 'string',
          initialValue: '.',
          hidden: (context) => {
            return context.value.format.localeFormat === true;
          },
        },
        {
          title: 'Prefix',
          name: 'prefix',
          type: 'string',
          initialValue: '',
        },
        {
          title: 'Postfix',
          name: 'postfix',
          type: 'string',
          initialValue: '',
        },
      ],
    },
  ],
  events: [
    {
      type: Events.COMPLETE,
      description: 'On end',
    },
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
        'font-style',
        'letter-spacing',
        'word-spacing',
        'font-weight',
        'color',
        'text-align',
        'text-decoration',
      ],
    },
    {
      title: 'Margin and padding',
      selector: styles.wrapper,
      properties: ['margin', 'padding'],
    },
  ],
  type: 'standard',
});

export default NumberCounter;
