import React, { useCallback } from 'react';
import { registerVevComponent, Link, Tracking } from '@vev/react';
import styles from './LinkButton.module.css';
import icon from './icon.svg';

type LinkValue = { mode: number; [key: string]: any };

type Props = {
  link?: LinkValue;
  linkText?: string;
  ariaLabel?: string;
  variant?: 'button' | 'link';
};

// Link passes extra props (onClick, aria-*) to the <a>, but its type does not declare them.
const VevLink = Link as React.ComponentType<any>;

// Same label format as the legacy Link Button, so existing analytics reports keep working.
function getTrackingLabel(link?: LinkValue): string {
  if (!link || link.mode === undefined) return '';
  switch (link.mode) {
    case 0:
      return link.page || 'Unlinked page';
    case 1:
      return link.widget ? `${link.widget.name}, ${link.widget.pageName}` : 'Unlinked page';
    case 2:
      return link.href || 'empty link';
    case 3:
      return link.email ? `${link.email}?subject${link.subject || ''}` : 'empty email: ';
    case 4:
      return link.phone || 'empty phone';
    case 5:
      return link.file?.url || 'empty file: ';
    default:
      return '';
  }
}

const LinkButton = ({ link, linkText, ariaLabel, variant = 'button' }: Props) => {
  const text = linkText || 'Open link';
  const className = styles.button + (variant === 'link' ? ' ' + styles.link : '');

  const handleClick = useCallback(() => {
    Tracking.send('vev', 'link-button', 'click', getTrackingLabel(link));
  }, [link]);

  if (!link) {
    // No destination yet: render the same box, but not as a focusable link to nowhere.
    return (
      <a className={className} aria-disabled="true">
        {text}
      </a>
    );
  }

  return (
    <VevLink
      to={link}
      className={className}
      onClick={handleClick}
      aria-label={ariaLabel || undefined}
    >
      {text}
    </VevLink>
  );
};

// Full text controls for every style rule that holds text.
const TEXT_PROPS = [
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-transform',
  'text-decoration',
  'text-align',
] as const;

registerVevComponent(LinkButton, {
  name: 'Link Button',
  description:
    'A button that links to a page, an element, a URL, an email address or a phone number.',
  icon,
  type: 'standard',
  size: { width: 200, height: 'auto' },
  props: [
    { name: 'linkText', title: 'Text', type: 'string', initialValue: 'Open link' },
    { name: 'link', title: 'Link', type: 'link' },
    {
      name: 'variant',
      title: 'Style',
      type: 'select',
      initialValue: 'button',
      options: {
        display: 'dropdown',
        items: [
          { label: 'Button', value: 'button' },
          { label: 'Text link', value: 'link' },
        ],
      },
    },
    {
      name: 'ariaLabel',
      title: 'Accessible label',
      description:
        'Read by screen readers instead of the text. Use when the text alone is unclear.',
      type: 'string',
    },
  ],
  editableCSS: [
    {
      title: 'Button',
      selector: styles.button,
      properties: [
        ...TEXT_PROPS,
        'background',
        'justify-content',
        'border',
        'border-radius',
        'box-shadow',
        'padding',
      ],
    },
    {
      title: 'Hover',
      selector: `.${styles.button}:hover`,
      properties: [...TEXT_PROPS, 'background', 'border', 'box-shadow'],
    },
    {
      title: 'Focus',
      selector: `.${styles.button}:focus-visible`,
      properties: [...TEXT_PROPS, 'background', 'border', 'box-shadow', 'outline'],
    },
  ],
});

export default LinkButton;
