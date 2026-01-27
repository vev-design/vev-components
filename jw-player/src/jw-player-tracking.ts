type TrackFn = (action: string, value?: any) => void;
type DispatchTrackingEventFn = (eventName: string, payload: any) => void;

export type JwPlayerTrackingBinding = {
  event: string;
  callback: (payload?: any) => void;
};

export function createJwPlayerTrackingBindings({
  track,
  dispatchTrackingEvent,
  videoUrl,
  videoName,
  throttleIntervalMs = 500,
}: {
  track: TrackFn;
  dispatchTrackingEvent: DispatchTrackingEventFn;
  videoUrl: string;
  videoName: string;
  throttleIntervalMs?: number;
}): JwPlayerTrackingBinding[] {
  // Tracking state - scoped to this factory instance
  let passedTenSeconds = false;
  let fifth = 1;
  let lastProgressSecond: number | undefined;
  let lastKnownCurrentTime: number | undefined;
  let lastKnownDuration: number | undefined;

  // Throttle time event to reduce CPU usage
  let lastTimeCheck = 0;

  const getPercentagePlayed = (currentTime?: number, duration?: number) => {
    if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) {
      return undefined;
    }
    return Math.floor((currentTime / duration) * 100);
  };

  return [
    {
      event: 'setupError',
      callback: ({ message }: { message?: string } = {}) => track('setupError', message),
    },
    {
      event: 'autostartNotAllowed',
      callback: () => track('autostartNotAllowed'),
    },
    {
      event: 'firstFrame',
      callback: () => {
        track('Play');
        dispatchTrackingEvent('VEV_VIDEO_PLAY', {
          videoUrl,
          videoName,
          totalPlayTime: lastKnownDuration,
          percentagePlayed: getPercentagePlayed(lastKnownCurrentTime, lastKnownDuration),
        });
      },
    },
    {
      event: 'time',
      callback: ({ currentTime, duration }: { currentTime?: number; duration?: number } = {}) => {
        const now = Date.now();
        if (now - lastTimeCheck < throttleIntervalMs) {
          return;
        }
        lastTimeCheck = now;

        if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) {
          return;
        }

        lastKnownCurrentTime = currentTime;
        lastKnownDuration = duration;

        const currentSecond = Math.floor(currentTime);
        if (currentSecond !== lastProgressSecond) {
          lastProgressSecond = currentSecond;
          dispatchTrackingEvent('VEV_VIDEO_PROGRESS', {
            videoUrl,
            videoName,
            progress: currentSecond,
            totalPlayTime: duration,
            percentagePlayed: Math.floor((currentTime / duration) * 100),
          });
        }

        // Fire event at ten seconds
        if (currentTime > 10 && !passedTenSeconds) {
          passedTenSeconds = true;
          track('atTenSeconds');
        }

        // Fire events at every fifth of progress
        if (currentTime > (fifth * duration) / 5) {
          track('videoProgress', fifth * 20);
          fifth++;
        }
      },
    },
    {
      event: 'pause',
      callback: () => {
        track('Pause');
        dispatchTrackingEvent('VEV_VIDEO_STOP', {
          videoUrl,
          videoName,
          totalPlayTime: lastKnownDuration,
          percentagePlayed: getPercentagePlayed(lastKnownCurrentTime, lastKnownDuration),
        });
      },
    },
    {
      event: 'complete',
      callback: () => {
        track('Finished');
        dispatchTrackingEvent('VEV_VIDEO_END', {
          videoUrl,
          videoName,
          totalPlayTime: lastKnownDuration,
          percentagePlayed: 100,
        });
      },
    },
  ];
}
