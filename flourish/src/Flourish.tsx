import React, { useEffect, useRef, useState } from 'react';
import styles from './Flourish.module.css';
import {
  registerVevComponent,
  useScrollTop,
  useSize,
  useViewport,
  View,
  useVevEvent,
  useVisible,
} from '@vev/react';
import { InteractionTypes } from './event-types';

type Props = {
  formUrl: string;
  scrollytelling: boolean;
  numberOfSlides: number;
  distance: number;
  type: 'bottom' | 'distance' | 'element';
  widgetKey: string;
  widgetDistance: number;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

const DEFAULT_URL = 'https://flo.uri.sh/story/1767962/embed';

function getElementTopPosition(widgetKey: string) {
  const el = document.getElementById(widgetKey);
  return el.offsetTop;
}

const Flourish = ({
  formUrl = DEFAULT_URL,
  scrollytelling = false,
  numberOfSlides,
  distance,
  type,
  widgetKey,
  widgetDistance,
  hostRef,
}: Props) => {
  const [offsetTop, setTop] = useState<number>(0);
  const [url, setUrl] = useState<string>(formUrl);
  const { height: hostHeight } = useSize(hostRef);
  const scrollTop = useScrollTop();
  const { scrollHeight, height: viewportHeight } = useViewport();
  const [slideChangeDistance, setSlideChangeDistance] = useState<number>(0);
  const [slide, setSlide] = useState<number>(0);
  const frameRef = useRef<HTMLIFrameElement>();
  const globalOffsetTop = View.rootNodeOffsetTop;

  const isVisible = useVisible(hostRef);

  useEffect(() => {
    if (frameRef.current) {
      frameRef.current.src = frameRef.current.src;
    }
  }, [isVisible]);

  useVevEvent(InteractionTypes.NEXT_SLIDE, () => {
    if (slide !== numberOfSlides - 1) {
      setSlide(slide + 1);
    }
  });

  useVevEvent(InteractionTypes.PREVIOUS_SLIDE, () => {
    if (slide !== 0) {
      setSlide(slide - 1);
    }
  });
  useVevEvent(InteractionTypes.SET_SLIDE, (args) => {
    setSlide(args.set_slide - 1);
  });

  // Strip hash if scrollytelling
  useEffect(() => {
    setUrl(formUrl);
  }, [formUrl]);

  // Set top offset
  useEffect(() => {
    setTop(hostRef.current.getBoundingClientRect().top);
  }, [hostRef]);

  // Set slide change distance
  useEffect(() => {
    if (type === 'bottom') {
      setSlideChangeDistance((scrollHeight - viewportHeight - globalOffsetTop) / numberOfSlides);
    } else if (type === 'distance') {
      setSlideChangeDistance(distance);
    } else if (type === 'element') {
      const elementPosition = getElementTopPosition(widgetKey);
      setSlideChangeDistance((elementPosition - offsetTop) / numberOfSlides);
    }
  }, [
    scrollHeight,
    numberOfSlides,
    viewportHeight,
    type,
    distance,
    widgetKey,
    widgetDistance,
    scrollTop,
    globalOffsetTop,
    hostHeight,
  ]);

  // Set slide
  useEffect(() => {
    if (scrollytelling) {
      let slide = Math.floor(Math.max(scrollTop - globalOffsetTop, 0) / slideChangeDistance);
      if (type === 'element') slide -= 1;
      setSlide(slide);
    }
  }, [globalOffsetTop, scrollTop, slideChangeDistance]);

  // Update url with slide
  useEffect(() => {
    const urlObj = new URL(url);
    setUrl(`${urlObj.origin}${urlObj.pathname}#slide-${slide}`);
  }, [slide, url]);

  return (
    <div className={`flourish fill ${styles.container}`}>
      <iframe
        ref={frameRef}
        className={styles.frame}
        src={isVisible ? url : undefined}
        sandbox="allow-scripts allow-popups"
        frameBorder="0"
      />
    </div>
  );
};

registerVevComponent(Flourish, {
  name: 'Flourish',
  emptyState: {
    linkText: 'Add URL',
    description: ' to your Flourish component',
    checkProperty: 'formUrl',
    action: 'OPEN_PROPERTIES',
  },
  props: [
    {
      title: 'Flourish URL',
      name: 'formUrl',
      type: 'string',
      initialValue: 'https://flo.uri.sh/story/1767962/embed',
      options: {
        multiline: true,
      },
    },
    {
      title: 'Scrollytelling',
      name: 'scrollytelling',
      type: 'boolean',
      initialValue: false,
    },
    {
      title: 'Number of slides',
      name: 'numberOfSlides',
      type: 'number',
      hidden: (context) => {
        return context.value.scrollytelling !== true;
      },
    },
    {
      title: 'Play for how long',
      name: 'type',
      type: 'select',
      options: {
        items: [
          { label: 'Bottom of page', value: 'bottom' },
          {
            label: 'Distance',
            value: 'distance',
          },
          { label: 'To element', value: 'element' },
        ],
        display: 'dropdown',
      },
      hidden: (context) => {
        return context.value.scrollytelling !== true;
      },
    },
    {
      title: 'Element',
      name: 'widgetKey',
      type: 'widgetSelect',
      hidden: (context) => {
        return context.value.type !== 'element' || context.value.scrollytelling !== true;
      },
    },
    {
      title: 'Distance from widget',
      name: 'widgetDistance',
      type: 'number',
      hidden: (context) => {
        return context.value.type !== 'element' || context.value.scrollytelling !== true;
      },
    },
    {
      title: 'Distance in px',
      name: 'distance',
      type: 'number',
      hidden: (context) => {
        return context.value.type !== 'distance' || context.value.scrollytelling !== true;
      },
    },
  ],
  editableCSS: [
    {
      title: 'Florish frame',
      selector: styles.container,
      properties: ['background', 'margin', 'border', 'border-radius', 'filter'],
    },
  ],
  interactions: [
    {
      type: InteractionTypes.NEXT_SLIDE,
      description: 'Next slide',
    },
    {
      type: InteractionTypes.PREVIOUS_SLIDE,
      description: 'Previous slide',
    },
    {
      type: InteractionTypes.SET_SLIDE,
      description: 'Set slide',
      args: [{ name: 'set_slide', title: 'Slide number', type: 'number' }],
    },
  ],
  type: 'both',
});

export default Flourish;
