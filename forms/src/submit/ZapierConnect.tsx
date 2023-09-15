import React from "react";
import { SchemaFieldProps, StringField } from "@vev/react";
import { SilkeButton, SilkeIcon, SilkeBox } from "@vev/silke";

function ZapierConnect(props: SchemaFieldProps<StringField>) {
  const { value } = props;

  return !value ? (
    <SilkeButton
      onClick={() => window.open("https://zapier.com", "_blank")}
      label="Create Zap"
      size="s"
      kind="tertiary"
    />
  ) : (
    <SilkeBox column gap="m">
      <SilkeBox gap="s">
        <SilkeIcon icon="check" style={{ color: "lightgreen" }} /> Is connected
      </SilkeBox>
    </SilkeBox>
  );
}

export default ZapierConnect;
