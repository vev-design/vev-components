import React, { useEffect, useRef, VideoHTMLAttributes } from "react";
import styles from "./Video.module.css";
import { useVisible, useEditorState, registerVevComponent } from "@vev/react";
import { getNameFromUrl, isIE, track } from "./utils";

type Props = {
  video: {
    key: string;
    url: string;
    thumbnail: string;
    name: string;
    sources: { url: string; format: string }[];
  };
  mute: boolean;
  controls: boolean;
  fill: boolean;
  thumbnail: {
    url: string;
  };
  preload: "auto" | "metadata" | "none";
};

enum VideoInteraction {
  play = "play",
  restart = "restart",
  togglePlay = "togglePlay",
  pause = "pause",
  mute = "mute",
  unMute = "unMute",
  toggleSound = "toggleSound",
}

enum VideoEvent {
  onPlay = "onPlay",
  onPause = "onPause",
  onEnd = "onEnd",
  currentTime = "currentTime",
}

const Video = ({ video, mute, controls, fill, thumbnail, preload }: Props) => {
  const videoRef = useRef<HTMLVideoElement>();
  const stateRef = useRef<{ current: number; maxProgress: number }>({
    current: 0,
    maxProgress: 0,
  });
  const { disabled } = useEditorState();
  const loopedAmount = useRef(1);

  let fifth = 1;

  useEffect(() => {
    const videoEl = videoRef.current;

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
  }, [video]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (disabled) {
      loopedAmount.current = 1;
      videoEl.load();
      videoEl.pause();
    }
  }, [disabled]);

  const attributes: VideoHTMLAttributes<HTMLVideoElement> = {};
  // if (loop) attributes.loop = true;
  if (mute) attributes.muted = true;
  if (controls) attributes.controls = true;
  if (isIE()) attributes.className = "ie";

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.style.objectFit = fill ? "cover" : "contain";
  }, [fill, videoRef.current]);

  return (
    <>
      {!video && (
        <div className={styles.empty}>
          <h3>Double-click to select video</h3>
        </div>
      )}
      <video
        ref={videoRef}
        aria-label={video?.name || ""}
        playsInline
        disableRemotePlayback
        className={styles.video}
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
    </>
  );
};

registerVevComponent(Video, {
  name: "Video",
  type: "both",
  props: [
    { name: "video", type: "video" },
    { name: "thumbnail", type: "image" },
    { name: "controls", type: "boolean", initialValue: true },
    { name: "fill", type: "boolean", initialValue: true },
    {
      name: "preload",
      type: "select",
      options: {
        display: "dropdown",
        items: ["auto", "metadata", "none"].map((v) => ({
          value: v,
          label: v,
        })),
      },
      initialValue: "auto",
    },
  ],
  editableCSS: [
    {
      selector: ":host",
      properties: ["background", "border", "border-radius", "box-shadow"],
    },
  ],
  events: [
    {
      type: VideoEvent.onPlay,
      description: "On play",
    },
    {
      type: VideoEvent.onPause,
      description: "On pause",
    },
    {
      type: VideoEvent.onEnd,
      description: "On end",
    },
    {
      type: VideoEvent.currentTime,
      description: "On play time",
      args: [
        {
          name: "currentTime",
          description: "currentTime",
          type: "number",
        },
      ],
    },
  ],

  interactions: [
    {
      type: VideoInteraction.play,
      description: "Play",
    },
    {
      type: VideoInteraction.restart,
      description: "Restart",
    },
    {
      type: VideoInteraction.togglePlay,
      description: "Toggle play",
    },
    {
      type: VideoInteraction.pause,
      description: "Pause",
    },
    {
      type: VideoInteraction.mute,
      description: "Mute",
    },
    {
      type: VideoInteraction.unMute,
      description: "Unmute",
    },
    {
      type: VideoInteraction.toggleSound,
      description: "Toggle sound",
    },
  ],
});

export default Video;
