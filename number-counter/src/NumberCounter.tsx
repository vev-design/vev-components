import React, { useEffect, useState, useRef } from 'react';

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
    prefix: string;
    postfix: string;
    localeFormat: boolean;
  };
  animation: {
    animationLength: number;
    delay: number;
    easing: 'none' | 'easein' | 'easeout';
    loop: boolean;
    autostart: boolean;
    once: boolean;
  };
  format: {
    separator: string;
    decimalSeparator: string;
    precision: number;
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
    prefix: '',
    postfix: '',
    localeFormat: false,
  },
  animation = {
    animationLength: 5,
    delay: 800,
    easing: 'none',
    loop: false,
    autostart: true,
    once: false,
  },
  format = {
    separator: ',',
    decimalSeparator: '.',
    precision: 0,
  },
  hostRef,
  disable = false,
}: Props) => {
  const {
    end: initEnd,
    start: initStart,
    prefix = '',
    postfix = '',
    localeFormat = false,
  } = settings;

  const { animationLength, delay, easing, loop, autostart, once } = animation;
  const { separator, decimalSeparator, precision: initPrecision } = format;

  const actualDelay = 1000 * delay;
  const start = initStart || 0;
  const end = initEnd || 0;
  const precision = initPrecision || 0;

  const [count, setCount] = useState<number>(start);
  const [hasStarted, setHasStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const isVisible = useVisible(hostRef);
  const { disabled, schemaOpen } = useEditorState();
  const [startedTimestamp, setStartedTimestamp] = useState<number>(0);
  const dispatchVevEvent = useDispatchVevEvent();

  const actualSchemaOpen = disabled && schemaOpen;
  // Stores the original params of the first render, used to reset the counter when props are changed(through variants)
  const previousSettings = useRef({ start: initStart, end: initEnd, actualDelay, autostart });

  function resetCounter() {
    setStartedTimestamp(0);
    setCount(start);
    setHasStarted(false);
  }

  useVevEvent(Interactions.START, () => {
    setTimeout(() => {
      if (!disable) {
        setHasStarted(true);
      }
    }, actualDelay);
  });

  useVevEvent(Interactions.STOP, () => {
    setHasStarted(false);
  });

  useVevEvent(Interactions.STOP_AND_RESET, () => {
    resetCounter();
  });

  useVevEvent(Interactions.RESET, () => {
    resetCounter();
    setHasStarted(true);
  });

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
          if (!loop) {
            setCount(end);
            dispatchVevEvent(Events.COMPLETE);
            setHasStarted(false);
            setFinished(true);
          } else {
            resetCounter();
            dispatchVevEvent(Events.COMPLETE);
            setHasStarted(true);
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
    if (disabled) return;
    const { start, end } = settings;
    const { delay, autostart } = animation;
    // Resets counter and playState if either start or end is changed through props
    if (previousSettings.current.start !== start || previousSettings.current.end !== end) {
      previousSettings.current = { start, end, actualDelay: delay * 1000, autostart };
      setStartedTimestamp(0);
      setCount(start)
      if (autostart) setTimeout(() => setHasStarted(true), actualDelay);
    }
  }, [settings, animation, disabled]);

  useEffect(() => {
    if (once && finished) return;
    if (!isVisible) {
      resetCounter();
    } else {
      resetCounter();
      if (!disabled) {
        setTimeout(() => {
          if (autostart) {
            setHasStarted(true);
          }
        }, actualDelay);
      }
    }
  }, [isVisible, disabled]);

  useEffect(() => {
    if (disabled && !actualSchemaOpen) {
      setFinished(false);
      resetCounter();
      return;
    }
  }, [actualDelay, isVisible, disabled, actualSchemaOpen, disabled]);

  // For restarting counter when changing props in editor
  useEffect(() => {
    if (actualSchemaOpen) {
      resetCounter();
      setTimeout(() => {
        if (autostart || actualSchemaOpen) {
          setHasStarted(true);
        }
      }, actualDelay);
    } else {
      resetCounter();
    }
  }, [
    start,
    end,
    precision,
    actualDelay,
    easing,
    disabled,
    animationLength,
    actualDelay,
    actualSchemaOpen,
    loop,
    once,
  ]);

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
  // Coerce to number in case a string is passed (e.g., "0" from props)
  const num = Number(x);

  if (localeFormat) {
    return new Intl.NumberFormat(navigator.language, {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
    }).format(num);
  }

  const toFixed = num.toFixed(precision);
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
          title: 'Prefix',
          description: 'Shows at the start of the component',
          name: 'prefix',
          type: 'string',
          initialValue: '',
        },
        {
          title: 'Postfix',
          description: 'Shows at the end of the component',
          name: 'postfix',
          type: 'string',
          initialValue: '',
        },
        {
          title: 'Location',
          description: 'Determine formatting based on user location',
          name: 'localeFormat',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
    {
      title: 'Animation',
      name: 'animation',
      type: 'object',
      initialValue: { increment: 2, delay: 800, stepSize: 1 },
      fields: [
        {
          title: 'Duration',
          name: 'animationLength',
          type: 'number',
          initialValue: 5,
          options: {
            format: 's',
          },
        },
        {
          title: 'Delay animation start',
          name: 'delay',
          type: 'number',
          initialValue: 5,
          options: {
            format: 'ms',
          },
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
          title: 'Loop',
          name: 'loop',
          type: 'boolean',
          description: 'When counter is done, it starts again immediately',
          initialValue: false,
        },
        {
          title: 'Run once',
          name: 'once',
          type: 'boolean',
          description: 'Will only run once, even if it goes out of view',
          initialValue: false,
        },
        {
          title: 'Auto start',
          name: 'autostart',
          type: 'boolean',
          initialValue: true,
        },
      ],
    },
    {
      name: 'format',
      title: 'Formatting',
      type: 'object',
      initialValue: { localeFormat: false, separator: ',' },
      hidden: (context) => {
        return context.value?.settings?.localeFormat === true;
      },
      fields: [
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
        },
        {
          title: 'Digit separator (decimal)',
          name: 'decimalSeparator',
          type: 'string',
          initialValue: '.',
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
      description: 'Reset and continue',
    },
    {
      type: Interactions.STOP_AND_RESET,
      description: 'Reset and stop',
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
        'line-height',
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
