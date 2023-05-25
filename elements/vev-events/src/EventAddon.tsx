import React, { useCallback } from 'react';
import { registerVevComponent } from '@vev/react';

const EventAction = ({ events, children, hostRef }) => {
  const handleClick = useCallback(() => {
    for (const event of events) {
      if (!event) return;
      const [contentKey, eventType] = event.split(':');

      const vevEvent = new CustomEvent('@@vev', {
        detail: {
          type: eventType,
          contentKey,
        },
      });
      window.dispatchEvent(vevEvent);
    }
  }, [events]);

  React.useEffect(() => {
    if (hostRef) {
      hostRef.current.addEventListener('click', handleClick);
      hostRef.current.style.cursor = 'pointer';
    }
  }, []);

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
  ],
});

export default EventAction;
