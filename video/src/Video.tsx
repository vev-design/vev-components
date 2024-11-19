import React, { useEffect, useRef, VideoHTMLAttributes } from 'react';
import styles from './Video.module.css';
import { useEditorState, useVevEvent, useDispatchVevEvent, useTracking } from '@vev/react';
import { getNameFromUrl, isIE, createTracker } from './utils';
import { VideoEvent, VideoInteraction } from '.';

type Props = {
  video: {
    key: string;
    url: string;
    thumbnail: string;
    name: string;
    sources: { url: string; format: string }[];
  };
  mute: boolean;
  autoplay: boolean;
  loop: boolean;
  controls: boolean;
  fill: boolean;
  disableTracking: boolean;
  thumbnail: {
    url: string;
  };
  preload: 'auto' | 'metadata' | 'none';
};

const Video = ({
  video,
  mute,
  controls,
  fill,
  thumbnail,
  preload,
  loop,
  disableTracking,
  autoplay = false,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement>();
  const stateRef = useRef<{ current: number; maxProgress: number }>({
    current: 0,
    maxProgress: 0,
  });
  const { disabled } = useEditorState();
  const loopedAmount = useRef(1);
  const videoStarted = useRef(false);

  const dispatch = useDispatchVevEvent();
  const track = createTracker(disableTracking);
  const dispatchTrackingEvent = useTracking(disableTracking);

  useVevEvent(VideoInteraction.play, () => {
    console.log('play');
    videoRef.current.play();
  });

  useVevEvent(VideoInteraction.restart, () => {
    videoRef.current.currentTime = 0;
    videoRef.current.play();
  });

  useVevEvent(VideoInteraction.togglePlay, () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  });

  useVevEvent(VideoInteraction.pause, () => {
    videoRef.current.pause();
  });

  useVevEvent(VideoInteraction.mute, () => {
    videoRef.current.muted = true;
  });

  useVevEvent(VideoInteraction.unMute, () => {
    videoRef.current.muted = false;
  });

  useVevEvent(VideoInteraction.toggleSound, () => {
    videoRef.current.muted = !videoRef.current.muted;
  });

  let fifth = 1;

  useEffect(() => {
    const videoEl = videoRef.current;

    const evs = ['play', 'pause', 'ended', 'timeupdate'];
    const onEv = (e) => {
      const videoEl: HTMLVideoElement = videoRef.current;
      if (!videoEl) return;

      const label = video?.name || getNameFromUrl(video.sources[0].url) || '';
      const current = Math.round((100 * videoEl.currentTime) / videoEl.duration);

      const update = {
        current,
        maxProgress: Math.max(current, stateRef.current.maxProgress),
      };
      switch (e.type) {
        case 'timeupdate':
          if (current > stateRef.current.maxProgress) {
            dispatchTrackingEvent('VEV_VIDEO_PROGRESS', {
              videoUrl: video.url,
              videoName: video.name,
              progress: current,
            });
            track('Video Progress', label, stateRef.current.maxProgress);
          }
          if (videoEl.currentTime > (fifth * videoEl.duration) / 5) {
            const progress = fifth * 20;
            track(`Video Progress ${progress}`, label);
            dispatch(VideoEvent.currentTime, { currentTime: progress });
            fifth++;
          }
          stateRef.current.current = update.current;
          stateRef.current.maxProgress = update.maxProgress;
          break;
        case 'play':
          dispatchTrackingEvent('VEV_VIDEO_PLAY', { videoUrl: video.url, videoName: video.name });
          dispatch(VideoEvent.onPlay);
          return track('Play', label);
        case 'pause':
          dispatchTrackingEvent('VEV_VIDEO_STOP', {
            videoUrl: video.url,
            videoName: video.name,
          });
          dispatch(VideoEvent.onPause);
          return track('Pause', label, stateRef.current.current);
        case 'ended':
          dispatchTrackingEvent('VEV_VIDEO_STOP', {
            videoUrl: video.url,
            videoName: video.name,
          });
          if (loop) {
            videoEl.currentTime = 0;
            videoEl.play();
          }
          dispatch(VideoEvent.onEnd);
          return track('Finished', label);
      }
    };
    evs.forEach((e) => videoEl && videoEl.addEventListener(e, onEv, false));
    return () => evs.forEach((e) => videoEl && videoEl.removeEventListener(e, onEv));
  }, [video, loop, track]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (autoplay && !disabled) {
      videoEl.muted = true;
      videoEl.play();
    }

    if (disabled) {
      loopedAmount.current = 1;
      videoEl.load();
      videoEl.pause();
    }
  }, [disabled, autoplay]);

  const attributes: VideoHTMLAttributes<HTMLVideoElement> = {};
  // if (loop) attributes.loop = true;
  if (mute) attributes.muted = true;
  if (controls) attributes.controls = true;
  if (isIE()) attributes.className = 'ie';
  if (autoplay) attributes.autoPlay = true;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.style.objectFit = fill ? 'cover' : 'contain';
  }, [fill, videoRef.current]);

  return (
    <div className={styles.wrapper}>
      {!video && (
        <div className={styles.empty}>
          <h3>Double-click to select video</h3>
        </div>
      )}
      <video
        autoPlay={autoplay}
        ref={videoRef}
        aria-label={video?.name || ''}
        playsInline
        disableRemotePlayback
        className={styles.video}
        poster={thumbnail && thumbnail.url ? thumbnail.url : video && video.thumbnail}
        preload={preload}
        {...attributes}
      >
        {video &&
          video.sources &&
          video.sources
            .sort((v) => (v.format === 'video/webm' ? -1 : 1))
            .map((v) => <source key={v.url} src={v.url} type={v.format || 'video/mp4'} />)}
        Your browser does not support this video
      </video>
    </div>
  );
};

export default Video;
