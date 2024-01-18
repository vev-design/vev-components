import React, { useEffect, useRef, useState } from "react";
import styles from "./Vimeo.module.css";
import {
  registerVevComponent,
  useEditorState,
  useVisible,
  useDispatchVevEvent,
  useVevEvent,
} from "@vev/react";
import { SilkeTextField, SilkeBox, SilkeTextSmall } from "@vev/silke";

import Player from "@vimeo/player";
import { Events, Interaction } from "./interactions";

const defaultVideoUrl = "https://vimeo.com/571600783";
const defaultVideoId = "571600783";

type Props = {
  videoInfo: {
    videoUrl: string;
    videoId: string;
  };
  videoId: string;
  settings: {
    autoplay: boolean;
    lazy: boolean;
    mute: boolean;
    disableControls: boolean;
    loop: boolean;
    background: boolean;
  };
  hostRef: React.RefObject<HTMLDivElement>;
};

function getVimeoUrl(
  videoId,
  autoplay,
  loop,
  mute,
  disableControls,
  background,
  disabled
) {
  const params = ["byline=1"];

  if (autoplay && !disabled) params.push("autoplay=1", "muted=1");
  else if (mute) params.push("muted=1");
  if (loop) params.push("loop=1");
  if (disableControls) params.push("controls=0");
  if (background) params.push("background=1");

  return `https://player.vimeo.com/video/${videoId}?${params.join("&")}`;
}

function LazyLoad({ hostRef, children }) {
  const isVisible = useVisible(hostRef);
  return isVisible ? children : null;
}

const VimeoUrl = (props) => {
  const { fullUrl } = Object.entries(props.value).length
    ? props.value
    : props.schema.initialValue;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      fetch("https://vimeo.com/api/oembed.json?url=" + fullUrl).then((raw) => {
        raw
          .json()
          .then((res) => {
            if (res.video_id) {
              setError(null);
              props.onChange({
                fullUrl,
                videoId: res.video_id,
              });
            }
          })
          .catch(() => {
            setError("Invalid Vimeo URL");
          });
      });
    } catch (e) {
      setError("Invalid Vimeo URL");
      props.onChange({
        fullUrl,
        videoId: defaultVideoId,
      });
    }
  }, [fullUrl]);

  return (
    <SilkeBox column gap="s" fill style={{ marginBottom: "16px" }}>
      <SilkeBox>
        <SilkeTextField
          label="Video URL"
          size="xs"
          value={props.value.fullUrl}
          onChange={(value) => {
            props.onChange({ fullUrl: value, videoId: props.value.videoId });
          }}
          error={error}
        />
      </SilkeBox>
    </SilkeBox>
  );
};

const Vimeo = ({
  videoInfo = {
    videoUrl: defaultVideoUrl,
    videoId: defaultVideoId,
  },
  settings = {
    autoplay: false,
    lazy: false,
    mute: false,
    disableControls: false,
    loop: false,
    background: false,
  },
  hostRef,
}: Props) => {
  const { disabled } = useEditorState();
  const iframeRef = useRef<HTMLIFrameElement>();
  const playerRef = useRef<Player>();
  const currentTime = useRef<number>(0);
  const dispatch = useDispatchVevEvent();

  const autoplay = settings.autoplay || false;
  const lazy = settings.lazy || false;
  const mute = settings.mute || false;
  const disableControls = settings.disableControls || false;
  const background = settings.background || false;
  const loop = settings.loop || false;

  useVevEvent(Interaction.PLAY, async () => {
    await playerRef.current.play();
  });

  useVevEvent(Interaction.PAUSE, () => {
    playerRef.current.pause();
  });

  useVevEvent(Interaction.TOGGLE_PLAY, async () => {
    if (await playerRef.current.getPaused()) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  });

  useVevEvent(Interaction.MUTE, () => {
    playerRef.current.setMuted(true);
  });

  useVevEvent(Interaction.UNMUTE, () => {
    playerRef.current.setMuted(false);
  });

  useVevEvent(Interaction.TOGGLE_SOUND, async () => {
    if (await playerRef.current.getMuted()) {
      playerRef.current.setMuted(false);
    } else {
      playerRef.current.setMuted(true);
    }
  });

  useEffect(() => {
    try {
      if (iframeRef.current) {
        const iframe = document.querySelector("iframe");
        const player = new Player(iframe);
        playerRef.current = player;

        player.on("play", () => {
          dispatch(Events.ON_PLAY);
        });

        player.on("pause", () => {
          dispatch(Events.ON_PAUSE);
        });

        player.on("ended", () => {
          dispatch(Events.ON_END);
        });

        player.on("timeupdate", (event) => {
          const currentSec = Math.floor(event.seconds);

          if (currentSec !== currentTime.current) {
            currentTime.current = currentSec;
            dispatch(Events.CURRENT_TIME, {
              currentTime: currentSec,
            });
          }
        });
      }
    } catch (e) {}
  }, [iframeRef]);

  const iframe = (
    <iframe
      ref={iframeRef}
      className={styles.frame}
      src={getVimeoUrl(
        videoInfo.videoId || defaultVideoId,
        autoplay,
        loop,
        mute,
        disableControls,
        background,
        disabled
      )}
      id={`vimeo-${videoInfo.videoId}`}
      width="100%"
      allow="autoplay"
      height="100%"
      frameBorder="0"
      allowFullScreen
    />
  );
  return lazy && !disabled ? (
    <LazyLoad hostRef={hostRef}>{iframe}</LazyLoad>
  ) : (
    iframe
  );
};

registerVevComponent(Vimeo, {
  name: "Vimeo",
  props: [
    {
      title: "Vimeo Link",
      name: "videoInfo",
      type: "object",
      fields: [
        {
          name: "fullUrl",
          type: "string",
        },
        {
          name: "videoId",
          type: "string",
        },
      ],
      initialValue: {
        fullUrl: defaultVideoUrl,
        videoId: defaultVideoId,
      },
      component: VimeoUrl,
    },
    {
      title: "Settings",
      name: "settings",
      type: "object",
      fields: [
        {
          title: "Autoplay",
          name: "autoplay",
          type: "boolean",
          initialValue: false,
        },
        {
          title: "Lazy load",
          name: "lazy",
          type: "boolean",
          initialValue: false,
        },
        { title: "Mute", name: "mute", type: "boolean", initialValue: false },
        {
          title: "Controls",
          name: "disableControls",
          type: "boolean",
          initialValue: false,
        },
        { title: "Loop", name: "loop", type: "boolean", initialValue: false },
        {
          title: "Background",
          name: "background",
          type: "boolean",
          initialValue: false,
        },
      ],
    },
  ],
  events: [
    {
      type: Events.ON_PLAY,
      description: "On play",
    },
    {
      type: Events.ON_PAUSE,
      description: "On pause",
    },
    {
      type: Events.ON_END,
      description: "On end",
    },
    {
      type: Events.CURRENT_TIME,
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
      type: Interaction.PLAY,
      description: "Play",
    },
    {
      type: Interaction.RESTART,
      description: "Restart",
    },
    {
      type: Interaction.TOGGLE_PLAY,
      description: "Toggle play",
    },
    {
      type: Interaction.PAUSE,
      description: "Pause",
    },
    {
      type: Interaction.MUTE,
      description: "Mute",
    },
    {
      type: Interaction.UNMUTE,
      description: "Unmute",
    },
    {
      type: Interaction.TOGGLE_SOUND,
      description: "Toggle sound",
    },
  ],
  editableCSS: [
    {
      selector: styles.frame,
      properties: ["background", "border-radius", "border", "filter"],
    },
  ],
  type: "both",
});

export default Vimeo;
