import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NumberCounter from './NumberCounter';

vi.mock('./NumberCounter.module.css', () => ({
  default: {
    counter: 'counter',
    srOnly: 'srOnly',
    wrapper: 'wrapper',
  },
}));

vi.mock('@vev/react', () => ({
  registerVevComponent: () => undefined,
  useDispatchVevEvent: () => vi.fn(),
  useEditorState: () => ({ disabled: false, schemaOpen: false }),
  useFrame: () => undefined,
  useVevEvent: () => undefined,
  useVisible: () => true,
}));

const hostRef = { current: document.createElement('div') };

let container: HTMLDivElement;
let root: Root;

function mount(element: React.ReactElement) {
  act(() => {
    root.render(element);
  });
}

function renderCounter(
  settings: {
    end: number;
    localeFormat?: boolean;
    postfix?: string;
    prefix?: string;
    start: number;
  },
  format?: {
    decimalSeparator?: string;
    precision?: number;
    separator?: string;
  },
) {
  mount(
    <NumberCounter
      format={{
        decimalSeparator: format?.decimalSeparator ?? '.',
        precision: format?.precision ?? 0,
        separator: format?.separator ?? ',',
      }}
      hostRef={hostRef}
      settings={{
        end: settings.end,
        localeFormat: settings.localeFormat ?? false,
        postfix: settings.postfix ?? '',
        prefix: settings.prefix ?? '',
        start: settings.start,
      }}
    />,
  );
}

describe('NumberCounter accessibility', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('hides the animated start value and exposes the formatted end value', () => {
    renderCounter(
      { end: 1000, postfix: '+', prefix: '$', start: 1 },
      { precision: 0, separator: ',' },
    );

    const visual = container.querySelector('.counter');
    const accessible = container.querySelector('.srOnly');

    expect(visual?.getAttribute('aria-hidden')).toBe('true');
    expect(visual?.textContent).toBe('$1+');
    expect(accessible?.textContent).toBe('$1,000+');
  });

  it('uses the same separators and precision for the accessible end value', () => {
    renderCounter(
      { end: 1234.5, start: 0 },
      { decimalSeparator: ';', precision: 2, separator: ' ' },
    );

    expect(container.querySelector('.srOnly')?.textContent).toBe('1 234;50');
  });

  it('keeps the accessible value on the end number when counting down', () => {
    renderCounter({ end: 10, start: 50 });

    expect(container.querySelector('.counter')?.textContent).toBe('50');
    expect(container.querySelector('.srOnly')?.textContent).toBe('10');
  });

  it('updates the accessible value when start and end change', () => {
    renderCounter({ end: 100, prefix: '#', start: 1 });

    expect(container.querySelector('.srOnly')?.textContent).toBe('#100');

    mount(
      <NumberCounter
        format={{ decimalSeparator: '.', precision: 0, separator: ',' }}
        hostRef={hostRef}
        settings={{
          end: 2500,
          localeFormat: false,
          postfix: ' sold',
          prefix: '#',
          start: 200,
        }}
      />,
    );

    expect(container.querySelector('.srOnly')?.textContent).toBe('#2,500 sold');
  });

  it('still exposes the end value when loop is enabled', () => {
    mount(
      <NumberCounter
        animation={{
          animationLength: 5,
          autostart: false,
          delay: 0,
          easing: 'none',
          loop: true,
          once: false,
        }}
        format={{ decimalSeparator: '.', precision: 0, separator: ',' }}
        hostRef={hostRef}
        settings={{
          end: 80,
          localeFormat: false,
          postfix: '',
          prefix: '',
          start: 1,
        }}
      />,
    );

    expect(container.querySelector('.counter')?.textContent).toBe('1');
    expect(container.querySelector('.srOnly')?.textContent).toBe('80');
  });
});
