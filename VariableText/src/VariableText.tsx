import React, { CSSProperties } from 'react';
import styles from './VariableText.module.css';
import { registerVevComponent, useGlobalStore } from '@vev/react';

type Props = {
  variableKey: string;
  type: string;
  html: boolean;
  hostRef: React.RefObject<HTMLDivElement>;
};

export type CamelToSnake<T extends string> = string extends T
  ? string
  : T extends `${infer C0}${infer R}`
  ? `${C0 extends Lowercase<C0> ? '' : '-'}${Lowercase<C0>}${CamelToSnake<R>}`
  : '';

const SUPPORTED_TAGS = [
  'div',
  'article',
  'aside',
  'figcaption',
  'main',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
];

const SUPPORTED_TAGS_STYLING = ['li'];

const TEXT_STYLE_PROPERTIES: { properties: CamelToSnake<keyof CSSProperties>[] } = {
  properties: [
    'background',
    'color',
    'border-radius',
    'box-shadow',
    'font-family',
    'font-size',
    'font-style',
    'text-align',
    'padding',
    'margin',
  ],
};

const VariableText = ({ variableKey, type = 'div', html = false }: Props) => {
  const variable = useGlobalStore((s) => s.variables).find((v) => v.key === variableKey);
  const props: React.Attributes = {};

  if (html) {
    props.dangerouslySetInnerHTML = { __html: variable?.value };
  }

  return (
    <div className={styles.content}>
      {React.createElement(type, props, html ? null : variable?.value)}
    </div>
  );
};

registerVevComponent(VariableText, {
  name: 'Text variable',
  emptyState: {
    action: 'OPEN_PROPERTIES',
    description: 'a variable',
    linkText: 'Connect ',
    checkProperty: 'variableKey',
  },
  props: [
    { name: 'variableKey', title: 'Variable', type: 'variable', variableType: 'text' },
    {
      name: 'type',
      title: 'HTML tag',
      type: 'select',
      initialValue: 'div',
      options: {
        display: 'dropdown',
        items: SUPPORTED_TAGS.map((value) => {
          return { label: value, value };
        }),
      },
    },
    {
      name: 'html',
      title: 'Use HTML',
      type: 'boolean',
      initialValue: false,
      description: 'Will mount the content of the variable directly as HTML',
    },
  ],
  editableCSS: [...SUPPORTED_TAGS, ...SUPPORTED_TAGS_STYLING].map((tag) => {
    return {
      title: tag,
      selector: `.${styles.content} ${tag}`,
      ...TEXT_STYLE_PROPERTIES,
    };
  }),
  type: 'standard',
});

export default VariableText;
