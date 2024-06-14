import React from 'react';
import styles from './Instagram.module.css';
import { registerVevComponent } from '@vev/react';

const INSTA_PREFIX = 'https://www.instagram.com/';
const INSTA_POSTFIX = '/embed';
const INSTA_CAPTION = '/captioned';

const POST_REGEX = /(?:https:\/\/)?(?:www\.)?instagram\.com\/p\/(\d*\w*)(?:\/)?/gm;
const PROFILE_REGEX = /(?:https:\/\/)?(?:www\.)?instagram\.com\/([.\w]*)/gm;

function buildUrl(url, includeCaptions) {
  if (url.match(POST_REGEX)) {
    const [_, postId] = POST_REGEX.exec(url);
    return INSTA_PREFIX + 'p/' + postId + INSTA_POSTFIX + (includeCaptions ? INSTA_CAPTION : '');
  } else if (url.match(PROFILE_REGEX)) {
    const [_, postId] = PROFILE_REGEX.exec(url);
    return INSTA_PREFIX + postId + INSTA_POSTFIX;
  }
}

function stripUrl(url) {
  if (url.indexOf('/') === -1) {
    // most likely just image id
    return url;
  }

  if (url.indexOf('<') !== -1) {
    // trying find instagram url and match until end quote (")
    const matches = url.match(/instagram.com\/p\/.+?(")/);
    if (!matches.length) return '';
    url = matches[0];
    url = 'https://' + url.substr(0, url.length - 2);
  }

  if (url.indexOf('instagram.com/p/') !== -1) {
    // most likely whole url

    // remove all arguments
    const i = url.indexOf('?');
    if (i !== -1) url = url.substring(0, i);

    const [, , stripped] = url.replace(/^http(s)?:\/\//, '').split('/');

    return stripped;
  }

  return url;
}

type Props = {
  url?: string;
  isCaptioned: boolean;
};

const Instagram = ({
  url = 'https://www.instagram.com/p/CpAQZfDDseY',
  isCaptioned = false,
}: Props) => {
  if (url) {
    const src = buildUrl(url, isCaptioned);
    console.log('srv', src);
    return <iframe className={styles.iframe} src={src} frameBorder="0" scrolling="no" />;
  }
};

registerVevComponent(Instagram, {
  name: 'Instagram',
  description: 'Add your Instagram post on your canvas.',
  type: 'standard',
  emptyState: {
    linkText: 'Add URL',
    description: 'to your Instagram component',
    checkProperty: 'url',
    action: 'OPEN_PROPERTIES',
  },
  props: [
    {
      title: 'Instagram URL',
      name: 'url',
      type: 'string',
      options: {
        type: 'text',
        multiline: true,
      },
    },
    {
      title: 'Captions',
      name: 'isCaptioned',
      type: 'boolean',
      initialValue: false,
    },
  ],
  editableCSS: [
    {
      selector: styles.iframe,
      title: 'Container',
      properties: ['border', 'opacity', 'filter'],
    },
  ],
});

export default Instagram;
