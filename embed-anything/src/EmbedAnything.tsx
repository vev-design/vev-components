import React, { useEffect, useRef, useState } from 'react';
import styles from './EmbedAnything.module.css';
import { registerVevComponent, useEditorState, useModel, useVisible } from '@vev/react';

type Props = {
  html: string;
  encapsulate: boolean;
  renderOnVisible: boolean;
  isStatic: boolean;
  allowScroll: boolean;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

function StaticHTML({ html, allowScroll }) {
  return (
    <div
      className="fill"
      style={{ overflow: allowScroll ? 'auto' : 'hidden' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function EmbedAnything({
  html,
  encapsulate = false,
  allowScroll = false,
  isStatic = false,
  renderOnVisible = false,
  hostRef,
}: Props) {
  const { disabled } = useEditorState();

  if (disabled) {
    return (
      <div className={styles.instructions + ' ' + styles.wrapper}>
        <h3>Embedded code will run in preview and on published site</h3>
        <p>
          If you want more coding flexibility, we recommend using a coded element created in the
          Code Editor.
        </p>
      </div>
    );
  }

  if (encapsulate) return <EmbedIframe html={html} />;
  if (isStatic) return <StaticHTML html={html} allowScroll={allowScroll} />;

  return (
    <EmbedScript
      html={html}
      hostRef={hostRef}
      allowScroll={allowScroll}
      renderOnVisible={renderOnVisible}
    />
  );
}

function EmbedIframe({ html }: { html: string }) {
  const { key: messageFrom } = useModel() || { key: 'none' };
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState('auto');

  useEffect(() => {
    function handleIframeMessage(event) {
      if (event.data.iframeHeight && event.data.messageFrom === messageFrom) {
        setIframeHeight(`${event.data.iframeHeight}px`);
      }
    }

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, []);

  function handleIframeLoad() {
    const iframeDocument = iframeRef.current.contentDocument;
    const iframeBody = iframeDocument.body;
    const newHeight = iframeBody.scrollHeight;
    setIframeHeight(newHeight);
  }

  return (
    <iframe
      className={styles.wrapper}
      ref={iframeRef}
      title="Auto-resizing iframe"
      srcDoc={`<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>html,body{margin:0;padding:0;height:auto;overflow:hidden;}</style>
      </head>
      <body>
       <script>
          let prevHeight = 0;
          function postHeight() {
            const height = document.body.scrollHeight;
            if(prevHeight !== height){
              prevHeight = height;
              window.parent.postMessage({ iframeHeight: height, messageFrom: '${messageFrom}' }, '*');
            }
          }

          window.addEventListener('resize', postHeight);

          const observer = new ResizeObserver(postHeight);
          observer.observe(document.body);
          postHeight();
          setInterval(postHeight,500);
        </script>
        ${html}
       
      </body>
      </html>`}
      style={{
        height: iframeHeight,
        width: '100%',
        background: 'transparent',
        border: 'none',
      }}
      onLoad={handleIframeLoad}
    />
  );
}

function EmbedScript({
  html,
  hostRef,
  allowScroll,
  renderOnVisible,
}: Pick<Props, 'hostRef' | 'html' | 'allowScroll' | 'renderOnVisible'>) {
  const [loaded, setLoaded] = useState<boolean>(false);
  const visible = useVisible(hostRef);

  useEffect(() => {
    if (!renderOnVisible || visible) setLoaded(true);
  }, [visible, renderOnVisible]);

  useEffect(() => {
    if (!loaded) return;
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
  }, [hostRef.current, html]);

  if (!loaded) return null;

  if (!html)
    return (
      <div className={styles.instructions + ' ' + styles.wrapper}>
        <h3>Double-click this widget to add your HTML inside</h3>
        <p>
          Note: Not all embed codes will only run on published site, as it may behave differently in
          the editor
        </p>
      </div>
    );
  return (
    <div
      className={styles.wrapper}
      style={{ overflow: allowScroll ? 'auto' : 'hidden' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

registerVevComponent(EmbedAnything, {
  name: 'Embed Anything',
  emptyState: {
    action: 'OPEN_PROPERTIES',
    linkText: 'Add embed code',
    description: ' to your embed component',
    checkProperty: 'html',
  },
  props: [
    {
      title: 'Embed HTML',
      name: 'html',
      type: 'string',
      options: {
        type: 'text',
        multiline: true,
      },
    },
    {
      title: 'Encapsulate',
      name: 'encapsulate',
      type: 'boolean',
      description: 'Contain the embed code within its own browser instance',
      initialValue: false,
    },
    {
      title: 'Render on visible',
      name: 'renderOnVisible',
      type: 'boolean',
      initialValue: false,
      description: 'Do not render the embed code until the component is visible',
      hidden: (context) => {
        return context.value.encapsulate || context.value.static;
      },
    },
    {
      title: 'Static HTML',
      name: 'isStatic',
      type: 'boolean',
      description: 'Static HTML (mounted directly)',
      initialValue: false,
      hidden: (context) => {
        return context.value.encapsulate;
      },
    },
    {
      title: 'Allow inner scroll',
      name: 'allowScroll',
      type: 'boolean',
      initialValue: false,
    },
  ],
  editableCSS: [
    {
      title: 'Container',
      selector: styles.wrapper,
      properties: ['background', 'border-radius', 'border', 'filter', 'padding', 'margin'],
    },
  ],
  type: 'both',
});

export default EmbedAnything;
