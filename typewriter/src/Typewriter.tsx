import React, { useEffect, useRef, useState } from 'react';
import styles from './Typewriter.module.css';
import { useEditorState, useVevEvent, useVisible } from '@vev/react';
import { TypewriterInteraction } from './index';

type Props = {
  words: string[];
  before: string;
  after: string;
  timer: number;
  loop: boolean;
  pauseOnStart: boolean;
  startOnView: boolean;
  hostRef: React.RefObject<HTMLDivElement>;
};

const Typewriter = ({
  before,
  after,
  words,
  timer,
  loop,
  pauseOnStart,
  startOnView,
  hostRef,
}: Props) => {
  const [WRITE, SHOW, ERASE, WAIT] = [0, 1, 2, 3];
  const lastTime = useRef<() => void>(null);
  const [frame, setFrame] = useState(0);
  const [state, setState] = useState(WRITE);
  const [textViewLength, setTextViewLength] = useState(0);
  const [textView, setTextView] = useState('');
  const [row, setRow] = useState(0);
  const { disabled } = useEditorState();

  // The editor canvas always animates, so designers can see the effect.
  const waitForView = startOnView && !disabled;
  const isVisible = useVisible(waitForView ? hostRef : false);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [paused, setPaused] = useState(false);

  // The animation only ticks when it is not paused and the view gate is open.
  const running = !paused && (!waitForView || hasEnteredView);

  useEffect(() => {
    if (isVisible) setHasEnteredView(true);
  }, [isVisible]);

  useVevEvent(TypewriterInteraction.play, () => {
    // An explicit trigger overrides the "start when in view" gate.
    setHasEnteredView(true);
    // Restart when the animation already finished with loop off.
    if (!loop && state === ERASE) {
      resetTypewriter();
      setState(WRITE);
    }
    setPaused(false);
  });

  useVevEvent(TypewriterInteraction.pause, () => {
    setPaused(true);
  });

  useVevEvent(TypewriterInteraction.restart, () => {
    setHasEnteredView(true);
    resetTypewriter();
    setState(WRITE);
    setPaused(false);
  });

  const resetTypewriter = () => {
    setFrame(0);
    setTextViewLength(0);
    setTextView('');
    setRow(0);
  };

  useEffect(() => {
    lastTime.current = update;
  }, [update]);

  useEffect(() => {
    resetTypewriter();
    setState(WRITE);
    setPaused(pauseOnStart && !disabled);
  }, [timer, disabled, pauseOnStart]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      lastTime.current?.();
    }, timer);
    return () => {
      clearInterval(interval);
    };
  }, [running, timer]);

  function update() {
    // The row can point past the end after the word list shrinks.
    const text = words[row] || '';
    if (state === WRITE) {
      if (frame % 5 === 0) {
        setTextViewLength(textViewLength + 1);
      }
      if (textViewLength > text.length) {
        resetAndNextState();
        return;
      }
    } else if (state === SHOW) {
      if (frame === 50) {
        resetAndNextState();
        return;
      }
    } else if (state === ERASE) {
      if (!loop) return;

      if (frame % 3 === 0) {
        setTextViewLength(textViewLength - 2);
      }
      if (textViewLength < 0) {
        resetAndNextState();
        return;
      }
    } else if (state === WAIT) {
      if (frame === 1) {
        const calculatedRow = (row + 1) % words.length;
        setRow(calculatedRow);
      }
      if (frame === 50 && loop) {
        resetAndNextState();
        return;
      }
    }

    setTextView(text.substring(0, textViewLength));
    setFrame(frame + 1);
  }

  function resetAndNextState() {
    setFrame(0);
    setState((state + 1) % 4);
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.words}>
        {before}
        {textView}
        {after}
      </p>
    </div>
  );
};

export default Typewriter;
