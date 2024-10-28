import React, { useCallback, useRef, useState } from 'react';
import {
  ButtonContext,
  SilkeBox,
  SilkeButton,
  SilkeImage,
  SilkePopover,
  SilkeTextSmall,
} from '@vev/silke';
import { BackgroundEditor } from './background-editor/background-editor';
import { ImageProp } from './ImageCompare';

interface ObjectFitEditor {
  name: string;
  title: string;
  onChange: (change: ImageProp) => void;
  value?: ImageProp;
  context: any;
}

export function ObjectFitEditor({ title, context, onChange, value }: ObjectFitEditor) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const { actions } = context;
  const handleDeleteImage = useCallback(() => {
    onChange(null);
  }, [onChange]);
  const [showBackgroundEditor, setShowBackgroundEditor] = useState(false);

  const handleSelectImage = useCallback(() => {
    setShowBackgroundEditor(true);
    if (!actions) return;
    actions.imageLibraryOpen((image: any) => {
      if (!image || !image.url) return;
      onChange({ key: image.key, url: image.url, xPercent: 0.5, yPercent: 0.5 });
      actions.imageLibraryClose();
    });
  }, [onChange, actions]);

  return (
    <SilkeBox column flex vPad="s" gap="s" ref={fieldRef}>
      <SilkeTextSmall>{title}</SilkeTextSmall>
      <SilkeBox column>
        <SilkeImage
          aspectRatio="16:9"
          src={value?.url}
          style={{
            background: '#444',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        />
        <SilkeBox flex align="center">
          <SilkeButton size="m" icon="edit" kind="ghost" onClick={handleSelectImage} />
          {value?.url && (
            <SilkeButton size="m" icon="delete" kind="ghost" onClick={handleDeleteImage} />
          )}
        </SilkeBox>
      </SilkeBox>
      {showBackgroundEditor && (
        <SilkePopover
          contextId="editor.left.inspect"
          targetOrigin="top-right"
          anchorOrigin="top-left"
          anchor={fieldRef}
          offsetX={-10}
          onRequestClose={() => {
            setShowBackgroundEditor(false);
          }}
        >
          <ButtonContext size="base">
            <SilkeBox bg="blur" column rounded="small" pad="m" gap="m" scroll>
              <BackgroundEditor
                onChange={(xPercent, yPercent) => {
                  onChange({ ...value, xPercent, yPercent });
                }}
                imageUrl={value?.url}
                y={value?.yPercent || 0.5}
                x={value?.xPercent || 0.5}
              />
            </SilkeBox>
          </ButtonContext>
        </SilkePopover>
      )}
    </SilkeBox>
  );
}
