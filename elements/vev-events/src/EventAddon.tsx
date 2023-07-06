import React, { useCallback, RefObject, ReactElement } from 'react';
import { registerVevComponent, VevProps } from '@vev/react';

export type Props = {
  hostRef: RefObject<any>;
  children: ReactElement;
  trigger: 'click' | 'hover';
  events: { key: string; args: VevProps[] }[];
};
const EventAction = ({ events, children, hostRef, trigger }: Props) => {
  const handleClick = useCallback(() => {
    for (const event of events) {
      if (!event) continue;
      const [contentKey, eventType] = event?.key ? event.key.split(':') : (event as any).split(':');
      const vevEvent = new CustomEvent('@@vev', {
        detail: {
          type: eventType,
          contentKey,
          payload: event.args,
        },
      });
      window.dispatchEvent(vevEvent);
    }
  }, [events]);

  React.useEffect(() => {
    const curr = hostRef.current;
    const type =
      {
        click: 'click',
        hover: 'mouseover',
      }[trigger] || 'click';

    if (curr) {
      curr.addEventListener(type, handleClick);
      curr.style.cursor = 'pointer';
    }

    return () => {
      if (!curr) return;
      curr.removeEventListener(type, handleClick);
    };
  }, [handleClick, hostRef]);

  return children;
};

registerVevComponent(EventAction, {
  name: 'Events',
  type: 'action',
  props: [
    {
      name: 'events',
      type: 'event',
    },
    {
      name: 'trigger',
      type: 'select',
      initialValue: 'click',
      options: {
        display: 'radio',
        items: [
          { label: 'Click', value: 'click' },
          { label: 'Hover', value: 'hover' },
        ],
      },
    },
  ],
});

export default EventAction;
