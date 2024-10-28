import React, { useEffect, useRef, VideoHTMLAttributes } from "react";
import styles from "./Video.module.css";
import {
  registerVevComponent,
  useVisible,
  useHover,
  useEditorState,
} from "@vev/react";
import { getNameFromUrl, isIE, track } from "./utils";

type Props = {
  hostRef: React.RefObject<HTMLDivElement>;
  video: any;
  infiniteLoop: boolean;
  loop: boolean;
  mute: boolean;
  loopAmount: number;
  controls: boolean;
  fill: boolean;
  noTracking: boolean;
  thumbnail: any;
  preload: "auto" | "metadata" | "none";
};

const VideoComponent = ({
  hostRef,
  video,
  loop,
  infiniteLoop,
  loopAmount,
  mute,
  controls,
  fill,
  noTracking,
  thumbnail,
  preload,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement>();
  const stateRef = useRef<{ current: number; maxProgress: number }>({
    current: 0,
    maxProgress: 0,
  });
  const [isHovered, bindHover] = useHover();
  const visible = useVisible(hostRef);
  const { disabled } = useEditorState();
  const loopedAmount = useRef(1);

  let fifth = 1;
  useEffect(() => {
    const videoEl = videoRef.current;
    if (noTracking || !videoEl || !video) return;

    const evs = ["play", "pause", "ended", "timeupdate"];
    const onEv = (e) => {
      const videoEl: HTMLVideoElement = videoRef.current;
      if (!videoEl) return;

      const label = video?.name || getNameFromUrl(video.sources[0].url) || "";
      switch (e.type) {
        case "timeupdate":
          const current = Math.round(
            (100 * videoEl.currentTime) / videoEl.duration
          );
          const update = {
            current,
            maxProgress: Math.max(current, stateRef.current.maxProgress),
          };

          if (current > stateRef.current.maxProgress) {
            track("Video Progress", label, stateRef.current.maxProgress);
          }
          if (videoEl.currentTime > (fifth * videoEl.duration) / 5) {
            track(`Video Progress ${fifth * 20}`, label);
            fifth++;
          }
          stateRef.current.current = update.current;
          stateRef.current.maxProgress = update.maxProgress;
          break;
        case "play":
          return track("Play", label);
        case "pause":
          return track("Pause", label, stateRef.current.current);
        case "ended":
          return track("Finished", label);
      }
    };
    evs.forEach((e) => videoEl && videoEl.addEventListener(e, onEv, false));
    return () =>
      evs.forEach((e) => videoEl && videoEl.removeEventListener(e, onEv));
  }, [video, noTracking, visible]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (disabled) {
      loopedAmount.current = 1;
      videoEl.load();
      videoEl.pause();
    } else if (videoEl.readyState >= 3) {
      if (!visible) {
        videoEl.pause();
        loopedAmount.current = 1;
      }
    }
  }, [visible, disabled]);

  const attributes: VideoHTMLAttributes<HTMLVideoElement> = {};
  if (infiniteLoop && loop) attributes.loop = true;
  if (mute) attributes.muted = true;
  if (controls) attributes.controls = true;
  if (isIE()) attributes.className = "ie";

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.style.objectFit = fill ? "cover" : "contain";
  }, [fill, videoRef.current]);

  const handleLoop = () => {
    if (loopedAmount.current < loopAmount) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      loopedAmount.current++;
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener("ended", handleLoop);

      return () => {
        if (videoRef.current)
          videoRef.current.removeEventListener("ended", handleLoop);
      };
    }
  }, [videoRef.current, loopAmount]);

  return (
    <>
      {!video && (
        <div className="fill row v-center h-center" style={{ color: "white" }}>
          <h3>{"Double-click to select video"}</h3>
        </div>
      )}
      <video
        {...bindHover}
        ref={videoRef}
        aria-label={video?.name || ""}
        playsInline
        disableRemotePlayback
        poster={
          thumbnail && thumbnail.url ? thumbnail.url : video && video.thumbnail
        }
        preload={preload}
        {...attributes}
      >
        {video &&
          video.sources &&
          video.sources
            .sort((v) => (v.format === "video/webm" ? -1 : 1))
            .map((v) => (
              <source key={v.url} src={v.url} type={v.format || "video/mp4"} />
            ))}
        Your browser does not support this video
      </video>
      <div className="overlay" />
    </>
  );
};

export default VideoComponent;
