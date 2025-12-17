import { SilkeBox, SilkeButton, SilkeModal, SilkeTitle } from '@vev/silke';
import React, { useState } from 'react';
import { SchemaContextModel } from '@vev/utils';
import { ChartEditorForm } from './chart-editor-form';
import { ChartDefinition } from '../types';

interface Props {
  context: SchemaContextModel<ChartDefinition>;
  value?: Partial<Omit<ChartDefinition, 'data'> & { data: string }>;
  onChange: (value: Partial<Omit<ChartDefinition, 'data'> & { data: string }>) => void;
}
export function ChartEditorFormButton({ context, value, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);

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
          <div className={`pkg-${context.pkg}`}>
            <ChartEditorForm
              value={
                value
                  ? {
                      ...value,
                      data: JSON.parse(value?.data || '[]') as Array<(string | number)[]>,
                    }
                  : undefined
              }
              onChange={(change) => {
                onChange({ ...change, data: JSON.stringify(change?.data || []) });
              }}
              context={context}
            />
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
