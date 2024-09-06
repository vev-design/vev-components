import { SilkeBox, SilkeButton } from "@vev/silke";
import React from "react";

type RevealDirectionFieldProps = {
  value: number;
  onChange: (value: number) => void;
};

export function RevealDirectionField({
  value,
  onChange,
}: RevealDirectionFieldProps) {
  return (
    <SilkeBox gap="s">
      <SilkeButton kind="ghost" icon={<DirectionIcon angle={90} />} />
      <SilkeButton kind="ghost" icon={<DirectionIcon angle={90} />} />
      <SilkeButton kind="ghost" icon={<DirectionIcon angle={90} />} />
      <SilkeButton kind="ghost" icon={<DirectionIcon angle={90} />} />
    </SilkeBox>
  );
}

function DirectionIcon({ angle }: { angle: number }) {
  return (
    <SilkeBox size="m">
      <div style={{ background: "white", height: "100%", width: 1 }} />
    </SilkeBox>
  );
}
