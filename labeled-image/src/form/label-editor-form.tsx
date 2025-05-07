import { SilkeBox, SilkeButton, SilkeModal } from '@vev/silke';
import React, { useState } from 'react';
import { LabelEditor } from './label-editor';

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
              form.onChange([...labels.splice(index, 1)]);
            }}
            onAdd={(label) => {
              form.onChange([...(labels || []), label]);
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
