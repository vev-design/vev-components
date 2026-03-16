import { registerVevComponent, useEditorState, useSize, useVisible } from '@vev/react';
import React, { useEffect, useRef } from 'react';
import { useSlideEditMode, useViewTimeline } from '../../hooks';
import styles from './ScrollingSlide.module.css';
import {
  BaseSlide,
  BaseSlideProps,
  SlideTransitionModel,
  TransitionPhase,
  CoverFlowSlide,
  CubeSlide,
  CustomSlide,
  FadeSlide,
  FlipSlide,
  MaskSlide,
  NoneSlide,
  RevealSlide,
  ScrollSlide,
  StackSlide,
  SwingSlide,
  ZoomSlide,
} from './slide';
import {
  TransitionField,
  TransitionPicker,
  TransitionOverride,
  TransitionValue,
  SPEED_OPTIONS,
  resolveTransition,
} from '../fields/Transition';

export type SlideType =
  | 'fade'
  | 'reveal'
  | 'scroll'
  | 'stack'
  | 'mask'
  | 'custom'
  | 'none'
  | 'flip'
  | 'cube'
  | 'coverflow'
  | 'swing'
  | 'zoom';

type Props = {
  children: string[];
  hostRef: React.RefObject<HTMLDivElement>;
  type: SlideType | TransitionValue;
  defaultSpeed?: string;
  overrideTransition?: TransitionOverride[];
};

type Layout = 'row' | 'column' | 'grid';
const SLIDE_LAYOUT: Record<SlideType, Layout> = {
  scroll: 'grid',
  stack: 'grid',
  fade: 'grid',
  reveal: 'grid',
  mask: 'grid',
  custom: 'grid',
  none: 'grid',
  flip: 'grid',
  cube: 'grid',
  coverflow: 'grid',
  swing: 'grid',
  zoom: 'grid',
};

const SLIDE_COMPONENT: Record<SlideType, React.ComponentType<BaseSlideProps>> = {
  scroll: ScrollSlide,
  stack: StackSlide,
  fade: FadeSlide,
  reveal: RevealSlide,
  mask: MaskSlide,
  custom: CustomSlide,
  none: NoneSlide,
  flip: FlipSlide,
  cube: CubeSlide,
  coverflow: CoverFlowSlide,
  swing: SwingSlide,
  zoom: ZoomSlide,
};

const ScrollingSlide = ({ children = [], type, defaultSpeed, overrideTransition, hostRef }: Props) => {
  if (!type) type = 'scroll';

  // Resolve TransitionValue or plain string into slide type + settings
  const tv: TransitionValue =
    typeof type === 'string' ? { primary: type } : (type || { primary: 'scroll' });
  const resolved = resolveTransition(tv.primary || 'scroll', tv.effects);
  const slideType = (resolved.type || 'scroll') as SlideType;
  const defaultSettings = resolved.settings || {};

  const { activeContentChild, disabled: editorDisabled } = useEditorState();
  const visible = useVisible(hostRef);
  const insufficientScroll =
    typeof document !== 'undefined' && document.body.scrollHeight <= window.innerHeight;
  const disabled = (!visible && !activeContentChild) || insufficientScroll;
  // Force linear easing in editor to be able to calculate the scroll position
  if (editorDisabled && activeContentChild) defaultSpeed = 'linear';

  // When scroll height is insufficient, determine which slide to force-show
  const forceVisibleIndex = insufficientScroll
    ? editorDisabled && activeContentChild
      ? children.indexOf(activeContentChild)
      : 0
    : -1;

  const ref = useRef<HTMLDivElement>(null);
  const timeline = useViewTimeline(ref as React.RefObject<HTMLElement>, disabled);
  const size = useSize(ref);
  useSlideEditMode(hostRef, children, timeline);

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
    const widgetContainer = hostRef?.current?.querySelector('w') as HTMLElement;
    if (widgetContainer) {
      // Set z-index to 1 to prevent inner slides from covering children
      widgetContainer.style.zIndex = '1';
    }
  }, []);

  const layout = SLIDE_LAYOUT[slideType] || 'row';
  let cl = `${styles.wrapper} ${styles[layout]}`;

  // Build a fully resolved transition for each gap (between slide i and i+1)
  const resolveGap = (gapIndex: number): TransitionPhase => {
    const override = overrideTransition?.[gapIndex];
    const overrideSpeed = override?.speed || defaultSpeed || 'linear';
    if (override?.type && override.type !== '') {
      const overrideResolved = resolveTransition(override.type, override.effects);
      return {
        type: overrideResolved.type as SlideType,
        settings: overrideResolved.settings,
        speed: overrideSpeed,
      };
    }
    return {
      type: slideType,
      settings: defaultSettings,
      speed: overrideSpeed,
    };
  };

  // Build transition model for each slide
  const buildModel = (index: number): SlideTransitionModel => {
    const transitionCount = children.length - 1;
    const transitionIn = index > 0 ? resolveGap(index - 1) : null;
    const transitionOut = index < transitionCount ? resolveGap(index) : null;

    // Pick the component type: prefer in-transition, fall back to out
    const compType = (transitionIn?.type ?? transitionOut?.type ?? slideType) as SlideType;

    // ownsIn: this component handles the in-animation
    const ownsIn = !transitionIn || transitionIn.type === compType;
    // ownsOut: this component handles the out-animation
    const ownsOut = !transitionOut || transitionOut.type === compType;

    return { transitionIn, transitionOut, ownsIn, ownsOut };
  };

  return (
    <>
      {editorDisabled && document.body.scrollHeight < window.innerHeight && (
        <div className={styles.warningOverlay}>
          <p>Greater scroll length is required. Adjust section(s) to be taller.</p>
        </div>
      )}
      <div
        ref={ref}
        className={cl}
        style={
          {
            '--slide-count': children.length,
            perspective: '1200px',
            transformStyle: 'preserve-3d',
          } as any
        }
      >
        {children.map((childKey, index) => {
          if (forceVisibleIndex >= 0 && index !== forceVisibleIndex) return null;
          const model = buildModel(index);
          const compType = (model.transitionIn?.type ??
            model.transitionOut?.type ??
            slideType) as SlideType;
          const Comp = SLIDE_COMPONENT[compType] || BaseSlide;
          return (
            <Comp
              key={childKey}
              id={childKey}
              index={index}
              slideCount={children.length}
              timeline={timeline}
              selected={false}
              disabled={forceVisibleIndex >= 0}
              transition={model}
            />
          );
        })}
      </div>
    </>
  );
};

export default ScrollingSlide;

registerVevComponent(ScrollingSlide, {
  name: 'Scrollytelling',
  transform: {
    height: 'auto',
  },
  props: [
    {
      type: 'string',
      name: 'type',
      title: 'Default transition',
      initialValue: 'scroll',
      component: ({ value, onChange }) => (
        <TransitionPicker value={value || 'scroll'} onChange={onChange as any} />
      ),
    },
    {
      type: 'select',
      name: 'defaultSpeed',
      title: 'Default speed',
      initialValue: 'linear',
      options: {
        display: 'dropdown',
        items: SPEED_OPTIONS,
      },
    },
    {
      type: 'array',
      name: 'overrideTransition',
      component: ({ value, onChange, context }) => {
        return (
          <TransitionField
            value={value as any}
            numberOfSlides={context.value?.children?.length || 0}
            onChange={onChange}
          />
        );
      },
      of: [{ type: 'string', name: 'type' }],
    },
  ],
  children: {
    name: 'Block',
  },
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background', 'border', 'filter'],
    },
  ],
  type: 'both',
});
