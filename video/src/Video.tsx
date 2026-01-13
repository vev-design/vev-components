import React, { useEffect, useRef, useState, VideoHTMLAttributes } from 'react';
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
  section?: boolean;
  altText?: string;
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
  section = false,
  altText,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Keeps track of the muted state given by interaction events
  const mutedRef = useRef<boolean>(undefined);
  const queuedPlay = useRef(false);
  // Keeps track of the video has been manually paused
  const pausedRef = useRef(false);
  const stateRef = useRef<{ current: number; maxProgress: number }>({
    current: 0,
    maxProgress: 0,
  });
  const { disabled } = useEditorState();
  const loopedAmount = useRef(1);

  const dispatch = useDispatchVevEvent();
  const track = createTracker(disableTracking);
  const dispatchTrackingEvent = useTracking(disableTracking);

  useVevEvent(VideoInteraction.play, async () => {
    pausedRef.current = false;
    await videoRef.current.play();
    // The video for some reason hasn't started. Queue it up to play when onCanPlay is triggered
    if (videoRef.current.readyState < 2) {
      queuedPlay.current = true;
    }
  });

  useVevEvent(VideoInteraction.restart, () => {
    pausedRef.current = false;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
  });

  useVevEvent(VideoInteraction.togglePlay, () => {
    if (videoRef.current.paused) {
      pausedRef.current = false;
      videoRef.current.play();
    } else {
      pausedRef.current = true;
      videoRef.current.pause();
    }
  });

  useVevEvent(VideoInteraction.pause, () => {
    pausedRef.current = true;
    videoRef.current.pause();
  });

  useVevEvent(VideoInteraction.mute, () => {
    mutedRef.current = true;
    videoRef.current.muted = true;
  });

  useVevEvent(VideoInteraction.unMute, () => {
    mutedRef.current = false;
    videoRef.current.muted = false;
  });

  useVevEvent(VideoInteraction.toggleSound, () => {
    mutedRef.current = !mutedRef.current;
    videoRef.current.muted = !videoRef.current.muted;
  });

  const handleCanPlay = () => {
    if (queuedPlay.current) {
      videoRef.current.play();
      queuedPlay.current = false;
    }
  };

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
              progress: videoEl.currentTime,
              totalPlayTime: videoEl.duration,
              percentagePlayed: update.maxProgress,
            });
            track?.('Video Progress', label, stateRef.current.maxProgress);
          }
          if (videoEl.currentTime > (fifth * videoEl.duration) / 5) {
            const progress = fifth * 20;
            track?.(`Video Progress ${progress}`, label);
            dispatch(VideoEvent.currentTime, { currentTime: progress });
            fifth++;
          }
          stateRef.current.current = update.current;
          stateRef.current.maxProgress = stateRef.current.maxProgress;
          break;
        case 'play':
          dispatchTrackingEvent('VEV_VIDEO_PLAY', {
            videoUrl: video.url,
            videoName: video.name,
            totalPlayTime: videoEl.duration,
            percentagePlayed: update.maxProgress,
          });
          dispatch(VideoEvent.onPlay);
          return track?.('Play', label);
        case 'pause':
          dispatchTrackingEvent('VEV_VIDEO_STOP', {
            videoUrl: video.url,
            videoName: video.name,
            progress: videoEl.currentTime,
            totalPlayTime: videoEl.duration,
            percentagePlayed: update.maxProgress,
          });
          dispatch(VideoEvent.onPause);
          return track?.('Pause', label, stateRef.current.current);
        case 'ended':
          dispatchTrackingEvent('VEV_VIDEO_END', {
            videoUrl: video.url,
            videoName: video.name,
            totalPlayTime: videoEl.duration,
            percentagePlayed: 100,
          });
          if (loop) {
            videoEl.currentTime = 0;
            videoEl.play();
          }
          dispatch(VideoEvent.onEnd);
          return track?.('Finished', label);
      }
    };
    evs.forEach((e) => videoEl && videoEl.addEventListener(e, onEv, false));
    return () => evs.forEach((e) => videoEl && videoEl.removeEventListener(e, onEv));
  }, [video, loop, track]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (!video) {
      videoEl.load();
      return;
    }

    if (autoplay && !disabled) {
      if (mutedRef.current === undefined) {
        videoEl.muted = true;
      } else {
        videoEl.muted = mutedRef.current;
      }

      if (!pausedRef.current) videoEl.play();
    }
    

    if (disabled) {
      mutedRef.current = undefined;
      pausedRef.current = undefined;
      loopedAmount.current = 1;
      videoEl.load();
      videoEl.pause();
    }
  }, [disabled, autoplay, video]);

  const attributes: VideoHTMLAttributes<HTMLVideoElement> = {};
  // if (loop) attributes.loop = true;
  if ((mutedRef.current === undefined && mute) || mutedRef.current) attributes.muted = true;
  if (controls) attributes.controls = true;
  if (isIE()) attributes.className = 'ie';
  if (autoplay) attributes.autoPlay = true;

  let videoCl = styles.video;
  if (fill) videoCl += ' ' + styles.fill;

  let cl = styles.wrapper;
  if (section) cl = styles.section;

  return (
    <div className={cl}>
      {!video && (
        <div className={styles.empty}>
          <h3>Double-click to select video</h3>
        </div>
      )}
      <video
        autoPlay={autoplay}
        key={video?.sources?.[0]?.url}
        ref={videoRef}
        aria-label={video?.name || ''}
        onCanPlay={handleCanPlay}
        playsInline
        disableRemotePlayback
        className={videoCl}
        poster={thumbnail && thumbnail.url ? thumbnail.url : video && video.thumbnail}
        preload={preload}
        {...attributes}
      >
        {video &&
          video.sources &&
           video.sources
            .sort((a, b) => {
              
              if (a.format === b.format) return 0;
              if (a.format === 'video/quicktime') return -1;
              if (b.format === 'video/quicktime') return 1;
              
              if (a.format === 'video/mp4') return -1;
              if (b.format === 'video/mp4') return 1;
              
              if (a.format === 'video/webm') return -1;
              if (b.format === 'video/webm') return 1;

              if (a.format === 'video/ogg') return -1;
              if (b.format === 'video/ogg') return 1;
              return 0;
            })
            .map((v) => <source key={v.url} src={v.url} type={v.format || 'video/mp4'} />)}
        <p>{altText || 'Your browser does not support this video'}</p>
      </video>
    </div>
  );
};

export default Video;
