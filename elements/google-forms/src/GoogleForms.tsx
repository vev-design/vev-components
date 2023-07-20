import React, { useEffect, useRef, useState } from 'react';
import styles from './GoogleForms.module.css';
import { registerVevComponent, useEditorState } from '@vev/react';

type Props = {
  formUrl: string;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

const GoogleForms = ({ formUrl, hostRef }: Props) => {
  const { disabled } = useEditorState();
  const [url, setUrl] = useState<string>('');
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (formUrl) {
      const params = new URLSearchParams(formUrl);
      if (!params.get('embedded')) {
        setUrl(formUrl + (formUrl.indexOf('?') === -1 ? '?' : '&') + 'embedded=true');
      } else {
        setUrl(formUrl);
      }
    }
  }, [formUrl]);

  useEffect(() => {
    const scriptTags: HTMLScriptElement[] = [];
    hostRef.current.querySelectorAll('script').forEach((script) => {
      const scriptElement = document.createElement('script');
      if (script.src) scriptElement.src = script.src;
      else scriptElement.text = script.innerText || '';

      const integrity = script.getAttribute('integrity');
      const crossorigin = script.getAttribute('crossorigin');
      if (integrity) scriptElement.setAttribute('integrity', integrity);
      if (crossorigin) scriptElement.setAttribute('crossorigin', crossorigin);

      document.body.appendChild(scriptElement);
      scriptTags.push(scriptElement);
    });
    return () => {
      scriptTags.forEach((tag) => tag.remove());
    };
  }, [formUrl, disabled, hostRef]);

  const handleFormSubmit = () => {
    console.log('google forms submittedd');
  };
  const formsLoaded = () => {
    const form = frameRef.current.contentWindow.document.querySelector('form');
    console.log('google forms loaded', form);
    form.addEventListener('submit', handleFormSubmit);
  };
  console.log('url', url);
  if (url === '' || !url) {
    return (
      <div className={styles.instructions}>
        <div>
          <h3>Double-click this Element to add your Google Forms URL</h3>
          <p>Note: Click on Send in Google forms to get the share link.</p>
        </div>
      </div>
    );
  }

  if (!url.includes('google')) {
    return (
      <div className={styles.instructions}>
        <div>
          <h3>Invalid forms URL</h3>
          <p>Note: Click on Send in Google forms to get the share link.</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      ref={frameRef}
      className={styles.wrapper}
      frameBorder={0}
      marginHeight={0}
      marginWidth={0}
      onLoad={() => {
        formsLoaded();
      }}
    >
      Loading form…
    </iframe>
  );
};

registerVevComponent(GoogleForms, {
  name: 'GoogleForms',
  description:
    "Embed Google Forms into your Vev project by simply copying the form's URL and inserting it into the form element. [Read documentation](https://help.vev.design/en/articles/6288851-google-forms)",
  props: [{ title: 'Form URL', name: 'formUrl', type: 'string' }],
  type: 'both',
});

export default GoogleForms;
