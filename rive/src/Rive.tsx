import React, { useEffect, useRef } from 'react';
import styles from './Rive.module.css';
import { registerVevComponent, useVevEvent } from '@vev/react';
import {
  Alignment,
  EventType,
  Fit,
  Layout,
  Rive as RiveCanvas,
  StateMachineInputType,
} from '@rive-app/canvas';
import { Interactions } from './events';
import { debounce, getRiveContent } from './util';

type Props = {
  file: { url: string };
  url: string;
  artboard: string;
  statemachine: string;
  layout?: {
    fit?: Fit;
    alignment?: Alignment;
  };
  scrollEnabled: boolean;
  hostRef: React.RefObject<HTMLDivElement>;
};

const Rive = ({ hostRef, file, artboard, statemachine, layout, scrollEnabled = false }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const riveCanvasRef = useRef<RiveCanvas>(null);

  useEffect(() => {
    if (riveCanvasRef.current) {
      // Clean up Rive
      riveCanvasRef.current.cleanup();
      riveCanvasRef.current.deleteRiveRenderer();
      riveCanvasRef.current.cleanupInstances();
    }
    if (!file) {
      if (riveCanvasRef.current) {
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
      stateMachines: statemachine,
      autoplay: true,
      isTouchScrollEnabled: scrollEnabled,
      layout: new Layout({
        fit: layout?.fit || Fit.Cover,
        alignment: layout?.alignment || Alignment.Center,
      }),
      onLoad: () => {
        riveCanvas.resizeDrawingSurfaceToCanvas();
      },
    });

    riveCanvasRef.current = riveCanvas;

    const debouncedResize = debounce(riveCanvas.resizeDrawingSurfaceToCanvas.bind(riveCanvas), 0);

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    resizeObserver.observe(hostRef.current);

    return () => {
      if (riveCanvas) {
        // Clean up Rive
        riveCanvas.cleanup();
        riveCanvas.deleteRiveRenderer();
        riveCanvas.cleanupInstances();
      }
      if (hostRef.current) {
        resizeObserver.unobserve(hostRef.current);
      }
    };
  }, [file, artboard, statemachine, hostRef, layout]);

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

  useVevEvent(Interactions.SET_STATE_MACHINE, (args: { statemachine: string | string[] }) => {
    riveCanvasRef.current.play(args.statemachine);
  });

  useVevEvent(
    Interactions.FIRE_INPUT,
    (args: {
      input: string;
      input_boolean?: boolean;
      input_number?: number;
      input_boolean_toggle?: boolean;
    }) => {
      if (!args.input) return;
      const inputArgs: { name: string; type: StateMachineInputType } = JSON.parse(args.input);

      const inputs = riveCanvasRef.current.stateMachineInputs(statemachine);
      const inputObj = inputs.find((input) => input.name === inputArgs.name);

      switch (inputArgs.type) {
        case StateMachineInputType.Trigger:
          inputObj.fire();
          break;
        case StateMachineInputType.Number:
          inputObj.value = args.input_number;
          break;
        case StateMachineInputType.Boolean:
          if (args.input_boolean_toggle) {
            inputObj.value = !inputObj.value;
          } else {
            inputObj.value = args.input_boolean;
          }
          break;
      }
    },
  );

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
    linkText: 'Upload a file ',
    description: 'to embed your Rive animation.',
  },
  props: [
    {
      name: 'file',
      type: 'upload',
      maxSize: 75000,
      accept: '.riv',
      clearProps: ['artboard', 'statemachine'],
    },
    {
      name: 'artboard',
      title: 'Artboard',
      type: 'select',
      clearProps: ['statemachine'],
      options: {
        display: 'autocomplete',
        async items(context) {
          const contents = await getRiveContent(context.value.file);
          if (contents) {
            return contents.artboards.map((artboard) => {
              return { label: artboard.name, value: artboard.name };
            });
          }

          return [];
        },
      },
      hidden: (context) => {
        return !context.value.file;
      },
    },
    {
      name: 'statemachine',
      title: 'State machine',
      type: 'select',
      options: {
        multiselect: false,
        display: 'dropdown',
        async items(context) {
          const contents = await getRiveContent(context.value.file);
          if (contents) {
            const artboard = contents.artboards.find(
              (value) => value.name === context.value.artboard,
            );

            if (!artboard) return [];

            return [
              { label: 'None', value: null },
              ...artboard.stateMachines.map((statemachine) => {
                return { label: statemachine.name, value: statemachine.name };
              }),
            ];
          }

          return [];
        },
      },
      hidden: (context) => {
        return !context.value.file || !context.value.artboard;
      },
    },
    {
      name: 'scrollEnabled',
      title: 'Touch scroll',
      description:
        'Allows scrolling behavior to still occur on when a touch/drag action is performed on touch-enabled devices',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'layout',
      title: 'Layout',
      type: 'object',
      fields: [
        {
          name: 'fit',
          title: 'Fit',
          type: 'select',
          initialValue: Fit.Cover,
          options: {
            display: 'dropdown',
            items: () => {
              return Object.entries(Fit).map(([label, value]) => {
                return { label, value };
              });
            },
          },
        },
        {
          name: 'alignment',
          title: 'Alignment',
          type: 'select',
          initialValue: Alignment.Center,
          options: {
            display: 'dropdown',
            items: () => {
              return Object.entries(Alignment).map(([label, value]) => {
                return { label, value };
              });
            },
          },
        },
      ],
    },
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
      type: Interactions.SET_STATE_MACHINE,
      description: 'Set state machine',
      args: [
        {
          name: 'statemachine',
          title: 'State machine',
          type: 'select',
          options: {
            display: 'dropdown',
            async items(context) {
              const contents = await getRiveContent(context.value.widgetForm.file);
              if (contents) {
                const artboard = contents.artboards.find(
                  (value) => value.name === context.value.widgetForm.artboard,
                );
                if (!artboard) return [];

                return [
                  { label: 'None', value: null },
                  ...artboard.stateMachines.map((statemachine) => {
                    return { label: statemachine.name, value: statemachine.name };
                  }),
                ];
              }

              return [];
            },
          },
          hidden: (context) => {
            return !context.value.widgetForm.file || !context.value.widgetForm.artboard;
          },
        },
      ],
    },
    {
      type: Interactions.FIRE_INPUT,
      description: 'Fire input',
      args: [
        {
          name: 'input',
          title: 'Input',
          type: 'select',
          options: {
            display: 'dropdown',
            async items(context) {
              const contents = await getRiveContent(context.value.widgetForm.file);
              if (contents) {
                const artboard = contents.artboards.find(
                  (value) => value.name === context.value.widgetForm.artboard,
                );
                if (!artboard) return [];

                const statemachine = artboard.stateMachines.find(
                  (value) => value.name === context.value.widgetForm.statemachine,
                );

                if (!statemachine) return [];

                return [
                  { label: 'None', value: null },
                  ...statemachine.inputs.map((input) => {
                    return {
                      label: input.name,
                      value: JSON.stringify({ name: input.name, type: input.type }),
                    };
                  }),
                ];
              }

              return [];
            },
          },
          hidden: (context) => {
            return !context.value.widgetForm.file || !context.value.widgetForm.artboard;
          },
        },
        {
          name: 'input_boolean_toggle',
          title: 'Toggle value',
          type: 'boolean',
          hidden: (context: any) => {
            if (!context.value?.interactionForm?.input) return true;
            const input: { name: string; type: StateMachineInputType } = JSON.parse(
              context.value?.interactionForm?.input,
            );
            return input.type !== StateMachineInputType.Boolean;
          },
        },
        {
          name: 'input_boolean',
          title: 'Value',
          type: 'boolean',
          initialValue: false,
          hidden: (context: any) => {
            if (!context.value?.interactionForm?.input) return true;
            const input: { name: string; type: StateMachineInputType } = JSON.parse(
              context.value?.interactionForm?.input,
            );
            if (input.type !== StateMachineInputType.Boolean) return true;
            return context.value.interactionForm?.input_boolean_toggle;
          },
        },
        {
          name: 'input_number',
          title: 'Value',
          type: 'number',
          hidden: (context: any) => {
            if (!context.value?.interactionForm?.input) return true;
            const input: { name: string; type: StateMachineInputType } = JSON.parse(
              context.value?.interactionForm?.input,
            );
            return input.type !== StateMachineInputType.Number;
          },
        },
      ],
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
