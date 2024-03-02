import { SilkeBox, SilkeColorPickerButton } from "@vev/silke";
import React from "react";
import { AnimationKeyframe } from "../utils";
import { OpacityField } from "../fields/OpacityField";
import { RotateFiled } from "../fields/RotateFiled";
import { ScaleField } from "../fields/ScaleField";
import { TranslateField } from "../fields/TranslateField";

export function KeyFrame({
  frame,
  onChange,
}: {
  frame: AnimationKeyframe;
  onChange: (frame: AnimationKeyframe) => void;
}) {
  const handleAttrChange = (attr: string, value: string | null) => {
    const newFrame = { ...frame };
    if (value === null) delete newFrame[attr as keyof AnimationKeyframe];
    else newFrame[attr as keyof AnimationKeyframe] = value as any;
    onChange(newFrame);
  };
  return (
    <SilkeBox column gap="s">
      <TranslateField
        value={frame.translate}
        onChange={(translate) => handleAttrChange("translate", translate)}
      />
      <ScaleField
        value={frame.scale}
        onChange={(scale) => handleAttrChange("scale", scale)}
      />

      <RotateFiled
        value={frame.rotate}
        onChange={(rotate) => handleAttrChange("rotate", rotate)}
      />

      <OpacityField
        value={frame.opacity}
        onChange={(opacity) => handleAttrChange("opacity", opacity)}
      />

      <SilkeBox gap="s">
        <SilkeColorPickerButton
          label="Color"
          value={frame.color || "black"}
          onChange={(color) => handleAttrChange("color", color)}
        />
        <SilkeColorPickerButton
          label="Background"
          value={frame.backgroundColor || "black"}
          onChange={(backgroundColor) =>
            handleAttrChange("backgroundColor", backgroundColor)
          }
        />
      </SilkeBox>
    </SilkeBox>
  );
}
