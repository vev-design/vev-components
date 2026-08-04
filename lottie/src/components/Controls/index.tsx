import React, { useEffect, useState } from 'react';
import { DotLottie } from '@lottiefiles/dotlottie-react';
import styles from './Controls.module.css';

type Props = {
  dotLottie: DotLottie | null;
};

/**
 * Minimal playback controls (play/pause + seek) for the dotLottie canvas.
 *
 * The maintained `@lottiefiles/dotlottie-react` package no longer ships a
 * `<Controls>` component like the deprecated `@dotlottie/react-player` did, so
 * we provide a small custom bar to preserve the widget's "Hide controls"
 * option.
 */
const Controls = ({ dotLottie }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  useEffect(() => {
    if (!dotLottie) return undefined;

    const onLoad = () => setTotalFrames(dotLottie.totalFrames);
    const onPlay = () => setIsPlaying(true);
    const onPauseOrStop = () => setIsPlaying(false);
    const onFrame = (event: { currentFrame: number }) => setFrame(event.currentFrame);

    dotLottie.addEventListener('load', onLoad);
    dotLottie.addEventListener('play', onPlay);
    dotLottie.addEventListener('pause', onPauseOrStop);
    dotLottie.addEventListener('stop', onPauseOrStop);
    dotLottie.addEventListener('complete', onPauseOrStop);
    dotLottie.addEventListener('frame', onFrame);

    if (dotLottie.isLoaded) {
      setTotalFrames(dotLottie.totalFrames);
      setIsPlaying(dotLottie.isPlaying);
    }

    return () => {
      dotLottie.removeEventListener('load', onLoad);
      dotLottie.removeEventListener('play', onPlay);
      dotLottie.removeEventListener('pause', onPauseOrStop);
      dotLottie.removeEventListener('stop', onPauseOrStop);
      dotLottie.removeEventListener('complete', onPauseOrStop);
      dotLottie.removeEventListener('frame', onFrame);
    };
  }, [dotLottie]);

  const togglePlay = () => {
    if (!dotLottie) return;
    if (dotLottie.isPlaying) {
      dotLottie.pause();
    } else {
      dotLottie.play();
    }
  };

  const onSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    dotLottie?.setFrame(Number(event.target.value));
  };

  const max = Math.max(totalFrames - 1, 0);

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.button}
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <input
        className={styles.seeker}
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(frame, max)}
        onChange={onSeek}
        aria-label="Seek"
      />
    </div>
  );
};

export default Controls;
