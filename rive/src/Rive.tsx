import React, { useEffect, useRef } from 'react';
import styles from './Rive.module.css';
import { registerVevComponent, useVevEvent } from '@vev/react';
import { EventType, Rive as RiveCanvas } from '@rive-app/canvas';
import { Interactions } from './events';

type Props = {
  file: { url: string };
  url: string;
  animations: string;
  artboard: string;
  statemachine: string;
  hostRef: React.RefObject<HTMLDivElement>;
};

function debounce(cb: () => void, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      cb();
    }, ms);
  };
}

const Rive = ({ hostRef, file, artboard, animations, statemachine }: Props) => {
  console.log('animations', animations);
  const ref = useRef<HTMLCanvasElement>(null);
  const riveCanvasRef = useRef<RiveCanvas>(null);

  useEffect(() => {
    if (!file) {
      if (riveCanvasRef.current) {
        // Clean up Rive
        riveCanvasRef.current.cleanup();

        // Clear canvas if in editor and removed animation
        ref.current.getContext('2d').clearRect(0, 0, 10000, 10000);
      }

      return;
    }

    // Setup rive
    const riveCanvas = new RiveCanvas({
      src: file?.url,
      canvas: ref.current,
      artboard,
      animations,
      autoplay: true,
      onLoad: (event) => {
        riveCanvas.resizeDrawingSurfaceToCanvas();
        console.log('Autoplay');
      },
    });

    riveCanvas.on(EventType.RiveEvent, (event) => {
      console.log('event', event);
    });

    riveCanvasRef.current = riveCanvas;

    const debouncedResize = debounce(riveCanvas.resizeDrawingSurfaceToCanvas.bind(riveCanvas), 0);

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    resizeObserver.observe(hostRef.current);

    return () => {
      if (hostRef.current) {
        resizeObserver.unobserve(hostRef.current);
      }
    };
  }, [file, artboard, animations, statemachine]);

  useVevEvent(Interactions.PLAY, () => {
    if (riveCanvasRef.current) {
      riveCanvasRef.current.play();
    }
  });

  useVevEvent(Interactions.PAUSE, () => {
    if (riveCanvasRef.current) {
      riveCanvasRef.current.pause();
    }
  });

  useVevEvent(Interactions.STOP, () => {
    if (riveCanvasRef.current) {
      riveCanvasRef.current.stop();
    }
  });

  return (
    <div className={styles.wrapper}>
      <canvas className={styles.canvas} ref={ref} />
    </div>
  );
};

registerVevComponent(Rive, {
  name: 'Rive',
  emptyState: {
    action: 'OPEN_PROPERTIES',
    checkProperty: 'file',
    linkText: 'Upload file or add URL',
    description: 'to your Rive animation',
  },
  props: [
    { name: 'file', type: 'upload' },
    {
      name: 'artboard',
      title: 'Artboard',
      type: 'select',
      options: {
        display: 'autocomplete',
        async items(context) {
          if (!context.value.file?.url) {
            return [];
          }
          return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const riveCanvas = new RiveCanvas({
              src: context.value.file?.url,
              canvas,
              onLoad: () => {
                resolve(
                  riveCanvas.contents.artboards.map((artboard) => {
                    return { label: artboard.name, value: artboard.name };
                  }),
                );
              },
            });
          });
        },
      },
      hidden: (context) => {
        return !context.value.file;
      },
    },
    {
      name: 'animations',
      title: 'Animation',
      type: 'select',
      options: {
        // multiselect: true,
        display: 'autocomplete',
        async items(context) {
          if (!context.value.file?.url) {
            return [];
          }
          return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const riveCanvas = new RiveCanvas({
              src: context.value.file?.url,
              canvas,
              onLoad: (event) => {
                const artboard = riveCanvas.contents.artboards.find(
                  (value) => value.name === context.value.artboard,
                );

                resolve(
                  artboard.animations.map((animation) => {
                    return { label: animation, value: animation };
                  }),
                );
              },
            });
          });
        },
      },
      hidden: (context) => {
        return !context.value.file || !context.value.artboard;
      },
    },
    // {
    //  name: 'statemachine',
    //  title: 'State machines',
    //  type: 'select',
    //  options: {
    //    multiselect: true,
    //    async items(context) {
    //      return new Promise((resolve) => {
    //        const canvas = document.createElement('canvas');
    //        const riveCanvas = new RiveCanvas({
    //          src: context.value.file?.url,
    //          canvas,
    //          onLoad: (event) => {
    //            const artboard = riveCanvas.contents.artboards.find(
    //              (value) => value.name === context.value.artboard,
    //            );
    //
    //            resolve(
    //              artboard.stateMachines.map((statemachine) => {
    //                return { label: statemachine.name, value: statemachine.name };
    //              }),
    //            );
    //          },
    //        });
    //      });
    //    },
    //  },
    //  hidden: (context) => {
    //    return !context.value.file || !context.value.artboard;
    //  },
    // },
  ],
  interactions: [
    {
      type: Interactions.PLAY,
      description: 'Play',
    },
    {
      type: Interactions.PAUSE,
      description: 'Pause',
    },
    {
      type: Interactions.STOP,
      description: 'Stop animation',
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background'],
    },
  ],
  type: 'both',
});

export default Rive;
