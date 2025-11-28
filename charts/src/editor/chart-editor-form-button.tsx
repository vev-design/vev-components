import { SilkeBox, SilkeButton, SilkeModal, SilkeTitle } from '@vev/silke';
import React, { useState } from 'react';
import { SchemaContextModel } from '@vev/utils';
import { ChartEditorForm } from './chart-editor-form';
import { ChartDefinition } from '../types';

interface Props {
  context: SchemaContextModel<ChartDefinition>;
  value?: Partial<ChartDefinition>;
  onChange: (value: Partial<ChartDefinition>) => void;
}
export function ChartEditorFormButton({ context, value, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);
  console.log('value', value);
  console.log('context', context);
  return (
    <SilkeBox align="center" pad="s">
      {showModal && (
        <SilkeModal
          size="large"
          title={<SilkeTitle kind="xs">Edit chart</SilkeTitle>}
          onClose={() => {
            setShowModal(false);
          }}
        >
          <div className="HqV1e7t2CYrf3zNe7rDZ">
            <ChartEditorForm value={value} onChange={onChange} />
          </div>
        </SilkeModal>
      )}
      <SilkeButton
        size="base"
        label="Edit chart"
        kind="secondary"
        onClick={() => {
          setShowModal(true);
        }}
      />
    </SilkeBox>
  );
}
