import { SilkeBox, SilkeButton, SilkeFormSchema, SilkeModal, SilkeTitle } from '@vev/silke';
import React, { useState } from 'react';
import { LabelEditor } from './label-editor';
import { Label } from '../types';

export function LabelEditorForm(form: any) {
  const imageUrl = form.context.value?.image?.url;
  const pkg = form.context.pkg;
  const { labels } = form.context.value;
  const [showModal, setShowModal] = useState(false);

  const setPopup = (index: number, popup: string | undefined) => {
    form.onChange(
      labels.map((l: Label, lIndex: number) => (lIndex === index ? { ...l, popup } : l)),
    );
  };

  return (
    <SilkeBox column gap="s" pad="s">
      {showModal && (
        <SilkeModal
          size="large"
          pad="xs"
          title={<SilkeTitle kind="xs">Add labels to your image</SilkeTitle>}
          onClose={() => {
            setShowModal(false);
          }}
        >
          <LabelEditor
            pkg={pkg}
            labels={labels || []}
            url={imageUrl}
            onRemove={(removeIndex) => {
              const newLabels = labels.filter((label) => {
                return label.index !== removeIndex;
              });
              form.onChange([...newLabels]);
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
      {(labels || []).map((label: Label, index: number) => (
        // The editor provides the childFrame field: it creates and links one child frame per label
        <SilkeFormSchema
          key={label.index}
          schema={[
            {
              type: 'childFrame',
              name: 'popup',
              title: `Label ${label.index + 1} popup`,
              frameName: `Popup ${label.index + 1}`,
            },
          ]}
          value={{ popup: label.popup }}
          context={form.context}
          onChange={(value: { popup?: string }) => setPopup(index, value.popup || undefined)}
        />
      ))}
    </SilkeBox>
  );
}
