import { SilkeBox, SilkeButton, SilkeModal } from '@vev/silke';
import React, { useState } from 'react';
import { LabelEditor } from './label-editor';
import { Label } from '../types';

export function LabelEditorForm(form: any) {
  const imageUrl = form.context.value?.image?.url;
  const { labels } = form.context.value;
  const [showModal, setShowModal] = useState(false);
  return (
    <SilkeBox align="center" pad="s">
      {showModal && (
        <SilkeModal
          onClose={() => {
            setShowModal(false);
          }}
        >
          <LabelEditor
            labels={labels}
            url={imageUrl}
            onRemove={(index) => {
              labels.splice(index, 1);
              form.onChange([...labels]);
            }}
            onAdd={(label) => {
              form.onChange([...(labels || []), label]);
            }}
            onChange={(index, label: Label) => {
              form.onChange([
                ...labels.map((l, lIndex) => {
                  if (lIndex === index) {
                    return label;
                  }
                  return l;
                }),
              ]);
            }}
          />
        </SilkeModal>
      )}
      <SilkeButton
        size="base"
        label="Edit labels"
        kind="secondary"
        onClick={() => {
          setShowModal(true);
        }}
      />
    </SilkeBox>
  );
}
