import { Tracking } from '@vev/react';

export function createTracker(disable?: boolean) {
  if (disable) () => {};
  return (action: string, label?: string, value?: any, nonInteractive?: boolean) => {
    Tracking.send('video', 'HTML5 Video', action, label, value, nonInteractive);
  };
}

export function getNameFromUrl(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1].split('.')[0];
}

export const isIE = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const hasUa = (name: string): boolean => ua.indexOf(name) > -1;
  return hasUa('msie ') || hasUa('trident/');
};
