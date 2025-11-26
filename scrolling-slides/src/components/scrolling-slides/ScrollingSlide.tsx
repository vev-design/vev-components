import { registerVevComponent, useEditorState, useSize, useVisible } from '@vev/react';
import React, { useEffect, useRef } from 'react';
import { useViewAnimation, useViewTimeline } from '../../hooks';
import styles from './ScrollingSlide.module.css';
import { ScrollingSlideTypeField } from './fields/ScrollingSlideTypeField';
import { useSlideEditMode } from './hooks/use-slide-edit-mode';
import {
  BaseSlide,
  BaseSlideProps,
  CustomSlide,
  FadeSlide,
  MaskSlide,
  RevealSlide,
  StackSlide,
} from './slide';

export type SlideType = 'fade' | 'reveal' | 'scroll' | 'stack' | 'mask' | 'custom';

type Props = {
  children: string[];
  hostRef: React.RefObject<HTMLDivElement>;
  type: SlideType;
  settings?: { [key: string]: any };
};

type Layout = 'row' | 'column' | 'grid';
const SLIDE_LAYOUT: Record<SlideType, Layout> = {
  scroll: 'row',
  stack: 'grid',
  fade: 'grid',
  reveal: 'grid',
  mask: 'grid',
  custom: 'grid',
};

const SLIDE_COMPONENT: Record<SlideType, React.ComponentType<BaseSlideProps>> = {
  scroll: BaseSlide,
  stack: StackSlide,
  fade: FadeSlide,
  reveal: RevealSlide,
  mask: MaskSlide,
  custom: CustomSlide,
};

function isSafariBrowser() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

const ScrollingSlide = ({ children, type, settings, hostRef }: Props) => {
  if (!type) type = 'scroll';

  const { activeContentChild, disabled: editorDisabled } = useEditorState();
  const visible = useVisible(hostRef);
  const disabled = !visible && !activeContentChild;

  const ref = useRef<HTMLDivElement>(null);
  const timeline = useViewTimeline(ref, disabled);
  const size = useSize(ref);
  useSlideEditMode(hostRef, children, timeline);

  useViewAnimation(
    ref,
    // Use margin to make frame calculation in the editor correct when editing slides
    editorDisabled && activeContentChild
      ? {
          marginLeft: ['0', `${(-1 + 1 / children.length) * size.width}px`],
        }
      : {
          translate: ['0 0', `${-100 + 100 / children.length}% 0`],
        },
    timeline,
    type !== 'scroll' || disabled,
    {
      direction: settings?.reverse ? 'reverse' : undefined,
      easing: settings?.easing,
    },
  );
  useEffect(() => {
    const root = ref.current?.getRootNode() as ShadowRoot;
    if (root?.host) {
      let parent = (root as ShadowRoot)?.host as HTMLElement | null;
      while (parent) {
        if (getComputedStyle(parent).overflow === 'hidden') {
          parent.style.overflow = 'clip';
        }
        parent = parent.parentElement;
      }
    }
  }, []);

  const layout = SLIDE_LAYOUT[type] || 'row';
  let cl = `${styles.wrapper} ${styles[layout]}`;
  if (type === 'scroll' && settings?.reverse) cl += ' ' + styles.reverse;

  const Comp = SLIDE_COMPONENT[type] || BaseSlide;

  return (
    <>
      <div
        ref={ref}
        className={cl}
        style={
          {
            '--slide-count': children.length,
          } as any
        }
      >
        {type === 'scroll' && isSafariBrowser() && (
          <style>{`.${styles.content} > vev > .__wc vev{will-change:transform;}`}</style>
        )}
        {children.map((childKey, index) => (
          <Comp
            key={childKey}
            id={childKey}
            index={index}
            slideCount={children.length}
            timeline={timeline}
            settings={settings}
            selected={false}
            transitionOut={settings?.transitionOut}
          />
        ))}
      </div>
    </>
  );
};

export default ScrollingSlide;

registerVevComponent(ScrollingSlide, {
  name: 'Scrolling slides',
  transform: {
    height: 'auto',
  },
  props: [
    {
      type: 'select',
      name: 'type',
      initialValue: 'scroll',
      component: ScrollingSlideTypeField,
      options: {
        display: 'dropdown',
        items: [
          {
            label: 'Scroll',
            value: 'scroll',
          },
          {
            label: 'Fade',
            value: 'fade',
          },
          {
            label: 'Reveal',
            value: 'reveal',
          },
          {
            label: 'Stack',
            value: 'stack',
          },
          {
            label: 'Mask',
            value: 'mask',
          },
          {
            label: 'Scale',
            value: 'scale',
          },
        ],
      },
    },
    {
      type: 'object',
      name: 'settings',

      fields: [
        {
          type: 'boolean',
          name: 'reverse',
        },
        {
          type: 'boolean',
          hidden: (context) => context.value?.type === 'scroll',
          name: 'transitionOut',
        },
        {
          type: 'number',
          title: 'Overlap transitions',
          name: 'offsetStart',
          initialValue: 0,
          options: {
            format: '%',
            min: 0,
            max: 100,
            scale: 100,
          },
        },
        {
          type: 'select',
          name: 'easing',
          initialValue: 'linear',
          options: {
            display: 'autocomplete',
            items: [
              {
                label: 'linear',
                value: 'linear',
              },
              { label: 'ease', value: 'ease' },
              {
                label: 'ease-in',
                value: 'ease-in',
              },
              {
                label: 'ease-out',
                value: 'ease-out',
              },
              {
                label: 'ease-in-out',
                value: 'ease-in-out',
              },
              {
                label: 'ease-in-quad',
                value: 'cubic-bezier(0.550, 0.085, 0.680, 0.530)',
              },
              {
                label: 'ease-in-cubic',
                value: 'cubic-bezier(0.550, 0.055, 0.675, 0.190)',
              },
              {
                label: 'ease-in-quart',
                value: 'cubic-bezier(0.895, 0.030, 0.685, 0.220)',
              },
              {
                label: 'ease-in-quint',
                value: 'cubic-bezier(0.755, 0.050, 0.855, 0.060)',
              },
              {
                label: 'ease-in-sine',
                value: 'cubic-bezier(0.470, 0.000, 0.745, 0.715)',
              },
              {
                label: 'ease-in-expo',
                value: 'cubic-bezier(0.950, 0.050, 0.795, 0.035)',
              },
              {
                label: 'ease-in-circ',
                value: 'cubic-bezier(0.600, 0.040, 0.980, 0.335)',
              },
              {
                label: 'ease-in-back',
                value: 'cubic-bezier(0.600, -0.280, 0.735, 0.045)',
              },
              {
                label: 'ease-out-quad',
                value: 'cubic-bezier(0.250, 0.460, 0.450, 0.940)',
              },
              {
                label: 'ease-out-cubic',
                value: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',
              },
              {
                label: 'ease-out-quart',
                value: 'cubic-bezier(0.165, 0.840, 0.440, 1.000)',
              },
              {
                label: 'ease-out-quint',
                value: 'cubic-bezier(0.230, 1.000, 0.320, 1.000)',
              },
              {
                label: 'ease-out-sine',
                value: 'cubic-bezier(0.390, 0.575, 0.565, 1.000)',
              },
              {
                label: 'ease-out-expo',
                value: 'cubic-bezier(0.190, 1.000, 0.220, 1.000)',
              },
              {
                label: 'ease-out-circ',
                value: 'cubic-bezier(0.075, 0.820, 0.165, 1.000)',
              },
              {
                label: 'ease-out-back',
                value: 'cubic-bezier(0.175, 0.885, 0.320, 1.275)',
              },
              {
                label: 'ease-in-out-quad',
                value: 'cubic-bezier(0.455, 0.030, 0.515, 0.955)',
              },
              {
                label: 'ease-in-out-cubic',
                value: 'cubic-bezier(0.645, 0.045, 0.355, 1.000)',
              },
              {
                label: 'ease-in-out-quart',
                value: 'cubic-bezier(0.770, 0.000, 0.175, 1.000)',
              },
              {
                label: 'ease-in-out-quint',
                value: 'cubic-bezier(0.860, 0.000, 0.070, 1.000)',
              },
              {
                label: 'ease-in-out-sine',
                value: 'cubic-bezier(0.445, 0.050, 0.550, 0.950)',
              },
              {
                label: 'ease-in-out-expo',
                value: 'cubic-bezier(1.000, 0.000, 0.000, 1.000)',
              },
              {
                label: 'ease-in-out-circ',
                value: 'cubic-bezier(0.785, 0.135, 0.150, 0.860)',
              },
              {
                label: 'ease-in-out-back',
                value: 'cubic-bezier(0.680, -0.550, 0.265, 1.550)',
              },
            ],
          },
        },
        {
          type: 'number',
          name: 'scale',
          title: 'Scale Factor',
          hidden: (context) => context.value?.type !== 'fade',
          options: {
            format: '%',
            scale: 100,
          },
        },
        {
          type: 'select',
          name: 'maskShape',
          initialValue:
            'circle(calc(var(--slide-offset) * 150%) at calc(var(--mask-x) * 100%) calc(var(--mask-y) * 100%))',
          hidden: (context) => context.value?.type !== 'mask',
          options: {
            items: [
              {
                label: 'Circle',
                value:
                  'circle(calc(var(--slide-offset) * 150%) at calc(var(--mask-x) * 100%) calc(var(--mask-y) * 100%))',
              },
              {
                label: 'Rectangle',
                value:
                  'inset(calc(var(--mask-y) * (1 - var(--slide-offset)) * 100% ) calc((1 - var(--mask-x)) * (1 - var(--slide-offset)) * 100% ) calc((1 - var(--mask-y)) * (1 - var(--slide-offset)) * 100% ) calc(var(--mask-x) * (1 - var(--slide-offset)) * 100% ))',
              },
            ],
          },
        },
        {
          type: 'number',
          name: 'maskX',
          title: 'Mask Origin X',
          initialValue: 0.5,
          hidden: (context) => context.value?.type !== 'mask',
          options: {
            format: '%',
            min: 0,
            max: 1,
            scale: 100,
          },
        },
        {
          type: 'number',
          name: 'maskY',
          title: 'Mask Origin Y',
          initialValue: 0.5,
          hidden: (context) => context.value?.type !== 'mask',
          options: {
            format: '%',
            min: 0,
            max: 1,
            scale: 100,
          },
        },
        {
          type: 'select',
          name: 'stackDirection',
          initialValue: 'vertical',
          hidden: (context) => context.value?.type !== 'stack',
          title: 'Direction',
          options: {
            items: [
              {
                label: 'Vertical',
                value: 'vertical',
              },
              {
                label: 'Horizontal',
                value: 'horizontal',
              },
            ],
          },
        },
        {
          type: 'select',
          name: 'revealDirection',
          hidden: (context) => context.value?.type !== 'reveal',
          title: 'Direction',
          initialValue:
            'polygon(0 0, calc( 100% * var(--slide-offset)) 0, calc( 100% * var(--slide-offset)) 100%, 0% 100%)',
          options: {
            items: [
              {
                label: 'From left',
                value:
                  'polygon(0 0, calc( 100% * var(--slide-offset)) 0, calc( 100% * var(--slide-offset)) 100%, 0% 100%)',
              },
              {
                label: 'From top',
                value:
                  'polygon(0 0, 100% 0, 100% calc(var(--slide-offset) * 100%), 0% calc(var(--slide-offset) * 100%))',
              },
              {
                label: 'From top left',
                value:
                  'polygon(-100% -100%, calc((25% + 100% * var(--slide-offset) / 2) * 4) -100%, -100% calc((25% + 100% * var(--slide-offset) / 2) * 4))',
              },
              {
                label: 'From top right',
                value:
                  'polygon(100% -100%, 100% calc((25% + 100% * var(--slide-offset) / 2) * 4), -100% calc((25% + 100% * var(--slide-offset) / 2) * 4))',
              },
            ],
          },
        },
        {
          type: 'array',
          name: 'keyframes',
          title: 'Custom Keyframes',
          hidden: (context) => context.value?.type !== 'custom',
          initialValue: [{ style: 'opacity:0;' }, { style: 'opacity:1;' }],
          of: [
            {
              name: 'style',
              title: 'CSS Styles',
              type: 'string',
              options: {
                type: 'text',
                multiline: true,
              },
            },
          ],
        },
      ],
    },
  ],
  children: {
    name: 'Block',
  },
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background'],
    },
  ],
  type: 'standard',
});
