import { useState } from 'react';
import { SilkeBox, SilkeIcon, SilkeText, SilkeTextField, SilkeToggle } from '@vev/silke';
import React from 'react';

interface Props {
  expanded?: boolean;
  title: string;
  children: React.ReactNode;
}

export function OptionGroup({ children, expanded = false, title }: Props) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  if (isExpanded) {
    return (
      <SilkeBox pad="s" column gap="s" bg="neutral-10" rounded="small">
        <SilkeBox vAlign gap="xs" onClick={() => setIsExpanded(false)} cursor="pointer">
          <SilkeIcon icon="chevron.down" />
          <SilkeText weight="strong">{title}</SilkeText>
        </SilkeBox>
        <SilkeBox gap="m" align>
          {children}
        </SilkeBox>
      </SilkeBox>
    );
  }

  return (
    <SilkeBox pad="s" vAlign gap="xs" onClick={() => setIsExpanded(true)} cursor="pointer">
      <SilkeIcon icon="chevron.right" />
      <SilkeText weight="strong">{title}</SilkeText>
    </SilkeBox>
  );
}
