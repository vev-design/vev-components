import {
  SilkeBox,
  SilkeButton,
  SilkeCssNumberField,
  SilkeOverflowMenu,
  SilkeSelectField,
  SilkeTitle,
  TextFieldContext,
} from "@vev/silke";
import React from "react";
import { AnimationType, TimelineRange, VevAnimation } from "../utils";
import { AnimationRangeField } from "../form/AnimationRangeField";
import { AnimationKeyFrames } from "../form/AnimationKeyFrames";

type AnimationFormProps = {
  value: VevAnimation[];
  onChange: (value: VevAnimation[]) => void;
};

export function AnimationForm({ value, onChange }: AnimationFormProps) {
  if (!value) value = [];
  return (
    <TextFieldContext inline="label-inside" size="xs">
      <SilkeBox column gap="s" fill flex>
        {value.map((animation, index) => (
          <SilkeBox key={index} bg="surface-1" column pad="m" gap="m" rounded>
            <SilkeBox gap="s">
              <SilkeTitle kind="xs" flex>
                On {animation.type}
              </SilkeTitle>
              <SilkeButton
                icon="delete"
                size="s"
                kind="ghost"
                onClick={() => onChange(value.filter((a, i) => i !== index))}
              />
              <SilkeButton icon="chevron.down" size="s" kind="ghost" />
            </SilkeBox>
            <Animation
              animation={animation}
              onChange={(newAnimation) =>
                onChange(
                  value.map((oldAnimation, i) =>
                    i === index ? newAnimation : oldAnimation
                  )
                )
              }
            />
          </SilkeBox>
        ))}
        <SilkeBox pad="s" hAlign="center">
          <SilkeOverflowMenu
            icon="add"
            kind="secondary"
            label="Add animation"
            items={[
              {
                label: "Standard Animation",
                onClick: () =>
                  onChange([
                    ...value,
                    {
                      type: AnimationType.visible,
                      keyframes: [
                        { opacity: "0", translate: "0 20px" },
                        { opacity: "1", translate: "0" },
                      ],
                    },
                  ]),
              },
              {
                label: "Scroll linked animation",
                onClick: () =>
                  onChange([
                    ...value,
                    {
                      type: AnimationType.scroll,
                      keyframes: [
                        { opacity: "0", translate: "0 20px" },
                        { opacity: "1", translate: "0" },
                      ],
                    },
                  ]),
              },
              {
                label: "Hover animation",
                onClick: () =>
                  onChange([
                    ...value,
                    {
                      type: AnimationType.hover,
                      keyframes: [{}, { scale: "1.2" }],
                    },
                  ]),
              },
            ]}
          />
        </SilkeBox>
      </SilkeBox>
    </TextFieldContext>
  );
}

function Animation({
  animation,
  onChange,
}: {
  animation: VevAnimation;
  onChange: (animation: VevAnimation) => void;
}) {
  const keyframes = animation.keyframes || [{}, {}];
  const isScrollAnimation = animation.type === "scroll";
  return (
    <SilkeBox column gap="s">
      {!isScrollAnimation && (
        <SilkeCssNumberField
          label="Duration (s)"
          width={FIELD_WIDTH * 2 + 8}
          value={animation.duration || "1s"}
          onChange={(duration = "") => {
            onChange({
              ...animation,
              duration,
            });
          }}
        />
      )}
      {!isScrollAnimation && (
        <SilkeCssNumberField
          label="Delay (ms)"
          width={FIELD_WIDTH * 2 + 8}
          value={animation.delay || "0ms"}
          onChange={(duration) => onChange({ ...animation, duration })}
        />
      )}
      <SilkeBox>Loop</SilkeBox>
      {!isScrollAnimation && (
        <SilkeSelectField
          label="Easing"
          width={FIELD_WIDTH * 2 + 8}
          value={animation.easing || "ease-out"}
          items={[
            { label: "Ease out", value: "ease-out" },
            { label: "Ease in", value: "ease-in" },
            { label: "Ease in out", value: "ease-in-out" },
            {
              label: "Sinusoidal",
              value: "cubic-bezier(0.445, 0.05, 0.55, 0.95)",
            },
            { label: "Cubic", value: "cubic-bezier(0.645, 0.045, 0.355, 1)" },
            { label: "Linear", value: "linear" },
          ]}
          onChange={(easing: string) => onChange({ ...animation, easing })}
        />
      )}
      <AnimationRangeField
        value={animation.start || "entry-crossing"}
        valueOffset={animation.startOffset || 0}
        label="Start"
        onChange={(start) =>
          onChange({ ...animation, start: start as TimelineRange })
        }
        onOffsetChange={(startOffset) =>
          onChange({ ...animation, startOffset })
        }
      />
      {isScrollAnimation && (
        <AnimationRangeField
          value={animation.end || "exit-crossing"}
          valueOffset={
            animation.endOffset === undefined ? 1 : animation.endOffset
          }
          label="End"
          onChange={(end) =>
            onChange({ ...animation, end: end as TimelineRange })
          }
          onOffsetChange={(endOffset) => onChange({ ...animation, endOffset })}
        />
      )}
      <AnimationKeyFrames
        frames={keyframes}
        onChange={(keyframes) => onChange({ ...animation, keyframes })}
      />
    </SilkeBox>
  );
}

export const FIELD_WIDTH = 128;
