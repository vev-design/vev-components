import React from "react";
import { registerVevComponent } from "@vev/react";

type Props = {
  className: string;
  children: React.ReactNode;
};

const InnerScroll = ({ className, children }: Props) => {
  return (
    <div className={className} style={{ overflow: "auto" }}>
      {children}
    </div>
  );
};

registerVevComponent(InnerScroll, {
  name: "Scrollbar",
  description: "A scrollable container",
  type: "action",
});

export default InnerScroll;
