import React from 'react';
import styles from './Instagram.module.css';
import { registerVevComponent } from '@vev/react';
import TextFieldColumn from '../../shared-components/text-field-column';

const INSTA_PREFIX = 'https://www.instagram.com/p/';
const INSTA_POSTFIX = '/embed';
const INSTA_CAPTION = '/captioned';

function buildUrl(id, includeCaptions) {
  return INSTA_PREFIX + stripUrl(id) + INSTA_POSTFIX + (includeCaptions ? INSTA_CAPTION : '');
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
    return (
      <iframe
        className={styles.iframe}
        src={buildUrl(url, isCaptioned)}
        frameBorder="0"
        scrolling="no"
      />
    );
  }

  return (
    <div className={styles.invalidUrl}>
      <img
        className={styles.logo}
        src="https://cdn.vev.design/pkg/SIAdXLhqHdJDShjirotC/Instagram_Glyph_Black.png"
      ></img>
      <div>This URL doesn't seem correct</div>
    </div>
  );
};

registerVevComponent(Instagram, {
  name: 'Instagram',
  description: 'Add your Instagram post on your canvas.',
  props: [
    {
      title: 'Instagram URL',
      name: 'url',
      type: 'string',
      initialValue: 'https://www.instagram.com/p/CpAQZfDDseY',
      component: (context) => {
        return (
          <TextFieldColumn
            name="url"
            title="Instagram URL"
            placeholder="https://instagram.com/example"
            value={context.value}
            onChange={context.onChange}
            type="text"
          />
        );
      },
    },
    {
      title: 'Captions',
      name: 'isCaptioned',
      type: 'boolean',
      initialValue: false,
    },
  ],
  type: 'standard',
});

export default Instagram;
