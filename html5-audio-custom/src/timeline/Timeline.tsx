import React, { useEffect, useRef, useState } from 'react';
import styles from './Timeline.module.css';

interface TimelineProps {
  audioElement: HTMLAudioElement;
}
export function Timeline({ audioElement }: TimelineProps) {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateTime(e) {
      setCurrentTime(audioElement.currentTime);
    }

    function loaded() {
      setDuration(audioElement.duration);
    }

    if (audioElement) {
      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('loadedmetadata', loaded);
      audioElement.addEventListener('loadeddata', loaded);
    }

    return () => {
      audioElement && audioElement.removeEventListener('timeupdate', updateTime);
      audioElement && audioElement.removeEventListener('loadedmetadata', loaded);
      audioElement && audioElement.removeEventListener('loadeddata', loaded);
    };
  }, [audioElement]);

  return (
    <div
      ref={barRef}
      className={styles.timeline}
      onClick={(e) => {
        const rect = barRef.current.getBoundingClientRect();
        const dx = e.pageX - rect.x;
        const progress = dx / rect.width;
        audioElement.currentTime = duration * progress;
      }}
    >
      <div className={styles.bar}>
        <div
          className={styles.barProgress}
          style={{ maxWidth: `${(currentTime / duration) * 100}%` }}
        />
      </div>
    </div>
  );
}
