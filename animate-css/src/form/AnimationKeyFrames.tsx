import {
  SilkeBox,
  SilkeButton,
  SilkeCssNumberField,
  SilkeTitle,
} from "@vev/silke";
import React, { useMemo, useState } from "react";
import { AnimationKeyframe } from "../utils";
import { KeyFrame } from "./AnimationKeyFrame";

function calculateFrameOffsets(frames: AnimationKeyframe[]): number[] {
  if (!frames?.length) return;
  const res = frames.map((f) => f.offset);
  if (!res[0]) res[0] = 0;
  if (!res[res.length - 1]) res[res.length - 1] = 1;
  // Calculating the undefined offset by equally spacing out between defined numbers
  let indexBefore = 0;

  for (let i = 1; i < res.length; i++) {
    const offset = res[i];
    if (offset === undefined) {
      let indexAfter = i + 1 + res.slice(i + 1).findIndex(Boolean);
      const len = indexAfter - indexBefore;
      const offsetBefore = res[indexBefore] as number;
      const offsetAfter = res[indexAfter] as number;
      const offsetRange = offsetAfter - offsetBefore;
      const stepSize = offsetRange / len;
      res[i] = offsetBefore + stepSize * (i - indexBefore);
    } else {
      indexBefore = i;
    }
  }
  return res as number[];
}

export function AnimationKeyFrames({
  frames,
  onChange,
}: {
  frames: AnimationKeyframe[];
  onChange: (frames: AnimationKeyframe[]) => void;
}) {
  if (!frames) frames = [];
  const [selectedIndex, setSelectedIndex] = useState(1);
  const offsets = useMemo(() => calculateFrameOffsets(frames), [frames]);

  const selectedFrame = frames[selectedIndex];
  const selectedOffset = offsets[selectedIndex];
  const prevOffset = frames[selectedIndex - 1]?.offset || 0;
  const nextOffset = frames[selectedIndex + 1]?.offset || 1;

  return (
    <SilkeBox gap="s">
      <SilkeBox column gap="s">
        <SilkeBox flex column vAlign="spread">
          <div
            style={{
              width: 1,
              position: "absolute",
              backgroundColor: "white",
              top: 11,
              bottom: 13,
              right: 13,
            }}
          />
          {offsets.map((offsets, index) => (
            <SilkeButton
              key={index}
              kind="ghost"
              size="s"
              label={
                <div style={{ width: 30 }}>
                  {Math.round(offsets * 100) + "%"}
                </div>
              }
              selected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              icon="dot"
            />
          ))}
        </SilkeBox>
        <SilkeButton
          kind="ghost"
          size="s"
          label={<div style={{ width: 30 }}>Add</div>}
          onClick={() => {
            onChange([...frames, {}]);
            setSelectedIndex(frames.length);
          }}
          icon="add"
        />
      </SilkeBox>
      <SilkeBox column gap="s">
        <SilkeBox gap="s">
          <SilkeTitle kind="xxs" flex>
            Keyframe
          </SilkeTitle>
          <SilkeCssNumberField
            width={50}
            min={selectedIndex === 0 ? 0 : prevOffset * 100 + 1}
            max={
              selectedIndex === frames.length - 1 ? 100 : nextOffset * 100 - 1
            }
            value={Math.round(selectedOffset * 100) + "%"}
            onChange={(offset) =>
              onChange(
                frames.map((f, i) =>
                  i === selectedIndex
                    ? { ...f, offset: parseInt(offset) / 100 }
                    : f
                )
              )
            }
          />
          <SilkeButton
            kind="ghost"
            size="s"
            icon="delete"
            disabled={frames.length === 2}
            onClick={() => {
              if (selectedIndex === frames.length - 1)
                setSelectedIndex(selectedIndex - 1);
              onChange(frames.filter((f, i) => i !== selectedIndex));
            }}
          />
        </SilkeBox>
        {selectedFrame && (
          <KeyFrame
            frame={selectedFrame}
            onChange={(frame) => {
              onChange(frames.map((f, i) => (i === selectedIndex ? frame : f)));
            }}
          />
        )}
      </SilkeBox>
    </SilkeBox>
  );
}
