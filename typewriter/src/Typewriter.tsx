import React, { useEffect, useRef, useState } from "react";
import styles from "./Typewriter.module.css";

type Props = {
  words: string[];
  before: string;
  after: string;
  timer: number;
  loop: boolean;
};

const Typewriter = ({ before, after, words, timer, loop }: Props) => {
  const [WRITE, SHOW, ERASE, WAIT] = [0, 1, 2, 3];
  const lastTime = useRef(null);
  const [frame, setFrame] = useState(0);
  const [state, setState] = useState(WRITE);
  const [textViewLength, setTextViewLength] = useState(0);
  const [textView, setTextView] = useState("");
  const [row, setRow] = useState(0);

  useEffect(() => {
    lastTime.current = update;
  }, [update]);

  useEffect(() => {
    let interval = setInterval(function () {
      lastTime.current();
    }, timer);
    return () => {
      clearInterval(interval);
    };
  }, [timer]);

  function update() {
    const text = words[row];
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
      setTextViewLength(0);
      if (frame === 1) {
        const calculatedRow = (row + 1) % words.length;
        setRow(calculatedRow);
      }
      if (frame === 50) {
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
    <div>
      <p className={styles.words}>
        {before}
        {textView}
        {after}
      </p>
    </div>
  );
};

export default Typewriter;
