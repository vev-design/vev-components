import React, { useEffect, useState } from 'react';
import { durationToTimestamp } from '../timeline/util';

interface TimelineProps {
  audioElement: HTMLAudioElement;
}
export function Timestamp({ audioElement }: TimelineProps) {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    function updateTime() {
      setCurrentTime(audioElement.currentTime);
    }

    function loaded() {
      setDuration(audioElement.duration);
    }

    if (audioElement) {
      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('loadedmetadata', loaded);
    }

    return () => {
      audioElement && audioElement.removeEventListener('timeupdate', updateTime);
      audioElement && audioElement.removeEventListener('loadedmetadata', loaded);
    };
  }, [audioElement]);

  return (
    <p>
      {durationToTimestamp(currentTime)}/{durationToTimestamp(duration)}
    </p>
  );
}
