import React, { useEffect, useRef, useState } from 'react';
import { registerVevComponent } from '@vev/react';
import { addVevClasses, inlinePlaceholders, textToDom } from './util';
import style from './Mailchimp.module.css';

const NO_EMBED_CODE_TEXT =
  'Double-click and put in the Mailchimp embed code as supplied from Mailchimp.';
const INVALID_EMBED_CODE =
  'Invalid Mailchimp embed code. please check the documentation for steps or contact Vev Support.';

type Props = {
  embedCode: string;
  autoCreatePlaceholders: boolean;
  styleWithVev: boolean;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

const Mailchimp = ({
  embedCode,
  autoCreatePlaceholders = true,
  styleWithVev = true,
  hostRef,
}: Props) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>(null);
  const [finalCode, setFinalCode] = useState<string>(null);

  useEffect(() => {
    const ownerDoc = hostRef?.current?.ownerDocument || document;
    if (hostRef.current && ownerDoc) {
      if (!embedCode || embedCode.indexOf(`mailchimp.com`) === -1) {
        setError(INVALID_EMBED_CODE);
        setFinalCode(null);
      } else if (embedCode) {
        // assume the user pasted it correctly and try to load
        setError(null);
        let finalHtml = embedCode;
        if (autoCreatePlaceholders) {
          const dom = textToDom(finalHtml, ownerDoc);
          finalHtml = inlinePlaceholders(dom).innerHTML;
        }
        if (styleWithVev) {
          const dom = textToDom(finalHtml, ownerDoc);
          finalHtml = addVevClasses(dom).innerHTML;
        }
        setFinalCode(finalHtml);
      }
    }
  }, [embedCode, hostRef, autoCreatePlaceholders, styleWithVev]);

  if (!finalCode || typeof finalCode === 'undefined' || error !== null) {
    return (
      <div className={style.info}>
        <h3>{!embedCode ? NO_EMBED_CODE_TEXT : error}</h3>
      </div>
    );
  }

  return (
    <div
      className={style.wrapper}
      dangerouslySetInnerHTML={{ __html: finalCode }}
      ref={formRef}
    ></div>
  );
};

registerVevComponent(Mailchimp, {
  name: 'Mailchimp',
  description:
    'Embed your Mailchimp Forms into your Vev project by simply copying the code of your Mailchimp Forms and inserting it into the element form. [Read documentation](https://help.vev.design/en/articles/6313710-mailchimp-forms)',
  props: [
    {
      name: 'autoCreatePlaceholders',
      title: 'Move labels from form into fields as placeholders',
      type: 'boolean',
      initialValue: true,
    },
    {
      hidden: true,
      name: 'styleWithVev',
      title: 'Turn this off to use the default Mailchimp styling',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'embedCode',
      title: 'Mailchimp embed code',
      valueType: '',
      type: 'string',
    },
  ],
  editableCSS: [
    {
      selector: '.vev-input',
      properties: ['background'],
    },
  ],
  type: 'both',
});

export default Mailchimp;
