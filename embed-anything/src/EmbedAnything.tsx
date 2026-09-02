import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './EmbedAnything.module.css';
import { registerVevComponent, useEditorState, useModel, useVisible } from '@vev/react';

type Props = {
  html: string;
  encapsulate: boolean;
  renderOnVisible: boolean;
  isStatic: boolean;
  allowScroll: boolean;
  showOverflow: boolean;
  fillContainer: boolean;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

function StaticHTML({
  html,
  allowScroll,
  showOverflow,
}: {
  html: string;
  allowScroll: boolean;
  showOverflow: boolean;
}) {
  return (
    <div
      className="fill"
      style={{ overflow: allowScroll ? 'auto' : showOverflow ? 'initial' : 'hidden' }}
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
  showOverflow = false,
  fillContainer = false,
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

  if (encapsulate)
    return <EmbedIframe html={html} showOverflow={showOverflow} fillContainer={fillContainer} />;
  if (isStatic)
    return <StaticHTML html={html} allowScroll={allowScroll} showOverflow={showOverflow} />;

  return (
    <EmbedScript
      html={html}
      hostRef={hostRef}
      allowScroll={allowScroll}
      renderOnVisible={renderOnVisible}
      showOverflow={showOverflow}
    />
  );
}

function EmbedIframe({
  html,
  showOverflow,
  fillContainer,
}: {
  html: string;
  showOverflow: boolean;
  fillContainer: boolean;
}) {
  const { key: messageFrom } = useModel() || { key: 'none' };
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<string | number>('auto');

  // srcDoc is same-origin, so we can always measure the embed ourselves.
  const measureIframe = useCallback(() => {
    const height = iframeRef.current?.contentDocument?.body?.scrollHeight;
    if (height) setIframeHeight(`${height}px`);
  }, []);

  useEffect(() => {
    if (fillContainer) return;

    function handleIframeMessage(event: MessageEvent) {
      if (event.data?.iframeHeight && event.data.messageFrom === messageFrom) {
        setIframeHeight(`${event.data.iframeHeight}px`);
      }
    }

    window.addEventListener('message', handleIframeMessage);

    // The iframe is server-rendered with its srcDoc inline, so it often finishes
    // loading — and posts its height — before we hydrate and attach the listener
    // above. Both the `load` event and that first message are then lost, and since
    // the embed only re-posts when its height *changes*, the iframe stays stuck at
    // the 150px default forever. Measure it directly and ask it to re-post, so a
    // height reported before hydration is recovered either way.
    measureIframe();
    iframeRef.current?.contentWindow?.postMessage({ requestHeight: true, messageFrom }, '*');

    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [fillContainer, measureIframe, messageFrom]);

  function handleIframeLoad() {
    if (fillContainer) return;
    measureIframe();
  }

  const fillSrcDoc = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>html,body{margin:0;padding:0;height:100%;width:100%;${
        showOverflow ? '' : 'overflow:hidden;'
      }}</style>
    </head>
    <body>
      ${html}
    </body>
    </html>`;

  const autoSrcDoc = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>html,body{margin:0;padding:0;height:auto;${
        showOverflow ? '' : 'overflow:hidden;'
      }}</style>
    </head>
    <body>
     <script>
        let prevHeight = 0;
        function sendHeight() {
          prevHeight = document.body.scrollHeight;
          window.parent.postMessage({ iframeHeight: prevHeight, messageFrom: '${messageFrom}' }, '*');
        }
        function postHeight() {
          if(prevHeight !== document.body.scrollHeight) sendHeight();
        }

        window.addEventListener('resize', postHeight);

        // The parent may hydrate after we have already posted our height, in which
        // case it missed the message. Re-send on request, bypassing the dedupe.
        window.addEventListener('message', function (event) {
          if(event.data && event.data.requestHeight && event.data.messageFrom === '${messageFrom}') sendHeight();
        });

        const observer = new ResizeObserver(postHeight);
        observer.observe(document.body);
        sendHeight();
        setInterval(postHeight,500);
      </script>
      ${html}
    </body>
    </html>`;

  return (
    <iframe
      className={styles.wrapper}
      data-show-overflow={showOverflow}
      ref={iframeRef}
      title={fillContainer ? 'Fill-container iframe' : 'Auto-resizing iframe'}
      srcDoc={fillContainer ? fillSrcDoc : autoSrcDoc}
      style={{
        height: fillContainer ? '100%' : iframeHeight,
        width: '100%',
        background: 'transparent',
        border: 'none',
        display: 'block',
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
  showOverflow,
}: Pick<Props, 'hostRef' | 'html' | 'allowScroll' | 'renderOnVisible' | 'showOverflow'>) {
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
      style={{ overflow: allowScroll ? 'auto' : showOverflow ? 'initial' : 'hidden' }}
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
    {
      title: 'Show overflow',
      name: 'showOverflow',
      type: 'boolean',
      initialValue: false,
      description: 'Show the overflow of the container',
      hidden: (context) => {
        return context.value.allowScroll;
      },
    },
    {
      title: 'Fill container',
      name: 'fillContainer',
      type: 'boolean',
      description: 'Embed will fill the container no matter what size it is',
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
