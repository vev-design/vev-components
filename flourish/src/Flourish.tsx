import React, { useEffect, useState } from 'react';
import styles from './Flourish.module.css';
import { registerVevComponent, useScrollTop, useSize, useViewport } from '@vev/react';
import TextFieldColumn from '../../shared-components/text-field-column';

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

const DEFAULT_SCROLLYTELLING_URL = 'https://flo.uri.sh/story/468238/embed';
const DEFAULT_URL = 'https://flo.uri.sh/story/1767962/embed';

function getElementPosition(widgetKey: string, widgetDistance: number, scrollTop: number) {
  const el = document.getElementById(widgetKey);
  return el ? el.getBoundingClientRect().top - (widgetDistance || 0) + scrollTop : undefined;
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
  const [_, setTop] = useState<number>(0);
  const [url, setUrl] = useState<string>(formUrl);
  const [offset, setOffset] = useState<number>(0);
  const { height: hostHeight } = useSize(hostRef);
  const scrollTop = useScrollTop();
  const { scrollHeight, height: viewportHeight } = useViewport();
  const [slideChangeDistance, setSlideChangeDistance] = useState<number>(0);
  const [slide, setSlide] = useState<number>(0);

  useEffect(() => {
    let parent = hostRef.current as HTMLElement;
    let top = 0;
    while (parent) {
      top += parent.offsetTop;
      parent = parent.parentElement;
    }
    setOffset(top);
  }, [hostRef]);

  // Strip hash if scrollytelling
  useEffect(() => {
    if (scrollytelling) {
      let newUrl: string;
      if (scrollytelling && formUrl === DEFAULT_URL) {
        newUrl = DEFAULT_SCROLLYTELLING_URL;
      }

      const urlObj = new URL(newUrl);
      setUrl(`${urlObj.origin}${urlObj.pathname}`);
    } else {
      setUrl(formUrl);
    }
  }, [formUrl, scrollytelling]);

  // Set top offset
  useEffect(() => {
    setTop(hostRef.current.getBoundingClientRect().top);
  }, [hostRef]);

  // Set slide change distance
  useEffect(() => {
    if (type === 'bottom') {
      setSlideChangeDistance((scrollHeight - viewportHeight - offset) / numberOfSlides);
    } else if (type === 'distance') {
      setSlideChangeDistance(distance);
    } else if (type === 'element') {
      const distanceFromWidget = widgetDistance + hostHeight;
      const elementPosition = getElementPosition(widgetKey, distanceFromWidget, scrollTop);
      setSlideChangeDistance((elementPosition - offset) / numberOfSlides);
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
    offset,
    hostHeight,
  ]);

  // Set slide
  useEffect(() => {
    if (scrollTop === 0) {
      setSlide(0);
    } else {
      setSlide(Math.floor(Math.max(scrollTop - offset, 0) / slideChangeDistance) - 1);
    }
  }, [offset, scrollTop, slideChangeDistance]);

  // Update url with slide
  useEffect(() => {
    const urlObj = new URL(url);
    setUrl(`${urlObj.origin}${urlObj.pathname}#slide-${slide}`);
  }, [slide, url]);

  return (
    <div className={`flourish fill ${styles.container}`}>
      <iframe
        className={styles.frame}
        src={url}
        sandbox="allow-scripts allow-popups"
        frameBorder="0"
      />
    </div>
  );
};

registerVevComponent(Flourish, {
  name: 'Flourish',
  props: [
    {
      title: 'Flourish URL',
      name: 'formUrl',
      type: 'string',
      initialValue: 'https://flo.uri.sh/story/1767962/embed',
      component: (context) => {
        return (
          <TextFieldColumn
            name="formUrl"
            title="Flourish URL"
            placeholder="https://flo.uri.sh/story/example"
            value={context.value}
            onChange={context.onChange}
            type="text"
          />
        );
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
  type: 'both',
});

export default Flourish;
