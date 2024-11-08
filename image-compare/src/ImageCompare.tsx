import React, { ReactNode, useEffect, useState } from 'react';
import styles from './ImageCompare.module.css';
import { registerVevComponent, Image } from '@vev/react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { ObjectFitEditor } from './object-fit-editor';

export const DEFAULT_LEFT_IMAGE =
  'https://cdn.vev.design/cdn-cgi/image/f=auto,q=82,w=1280/private/sSh27nYTPBc9oijoH3onf2eolMH2/image/7XbxPUdRtgw';
export const DEFAULT_RIGHT_IMAGE =
  'https://cdn.vev.design/cdn-cgi/image/f=auto,q=82,w=1280/private/an2K3NyIunQ4E5tG3LwwGhVDbi23/image/trees-moss-forest-sunlight-sunrays-3294681';

const DEFAULT_ICON_LEFT: IconProp = {
  key: 'angle-left-solid',
  name: 'angle-left solid',
  path: [
    256,
    512,
    'M31.7 239l136-136c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9L127.9 256l96.4 96.4c9.4 9.4 9.4 24.6 0 33.9L201.7 409c-9.4 9.4-24.6 9.4-33.9 0l-136-136c-9.5-9.4-9.5-24.6-.1-34z',
  ],
};

const DEFAULT_ICON_RIGHT: IconProp = {
  key: 'angle-right-solid',
  name: 'angle-right solid',
  path: [
    256,
    512,
    'M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z',
  ],
};

export type ImageProp = { key: string; url: string; xPercent: number; yPercent: number };
export type IconProp = { path: [number, number, string]; key: string; name: string };

type Props = {
  left?: ImageProp;
  right?: ImageProp;
  horizontal?: boolean;
  handles?: {
    leftIcon?: IconProp;
    rightIcon?: IconProp;
    hideHandle?: boolean;
  };
  animation?: {
    animate?: boolean;
  };
};

function Handle({
  leftIcon,
  rightIcon,
  hideHandle,
}: {
  leftIcon: IconProp;
  rightIcon: IconProp;
  hideHandle: boolean;
}) {
  return (
    <div className={styles.handle}>
      {leftIcon && !hideHandle && (
        <div className={styles.iconWrapper}>
          <svg className={styles.icon} viewBox={`0 0 ${leftIcon.path[0]} ${leftIcon.path[1]}`}>
            <path d={leftIcon.path[2]} />
          </svg>
        </div>
      )}
      <div className={styles.handleBar} />
      {rightIcon && !hideHandle && (
        <div className={styles.iconWrapper}>
          <svg className={styles.icon} viewBox={`0 0 ${rightIcon.path[0]} ${rightIcon.path[1]}`}>
            <path d={rightIcon.path[2]} />
          </svg>
        </div>
      )}
    </div>
  );
}

const ImageCompare = ({
  left,
  right,
  horizontal = false,
  handles = { hideHandle: false },
  animation = { animate: false },
}: Props) => {
  const [position, setPosition] = useState(50);
  const [disableAnimation, setDisableAnimation] = useState(false);
  const actualLeft = left?.url || DEFAULT_LEFT_IMAGE;
  const actualRight = right?.url || DEFAULT_RIGHT_IMAGE;
  const animate = animation.animate && !disableAnimation;
  const actualIconLeft = handles?.leftIcon || DEFAULT_ICON_LEFT;
  const actualIconRight = handles?.rightIcon || DEFAULT_ICON_RIGHT;

  useEffect(() => {
    if (animate) {
      const interval = setInterval(() => {
        const newPosition = Math.floor(Math.random() * 25 + 40);
        setPosition(newPosition);
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }

    setPosition(50);
  }, [animate]);

  function disableAnimationHandler() {
    setDisableAnimation(true);
    setPosition(50);
  }

  return (
    <div
      className={styles.wrapper}
      onClick={disableAnimationHandler}
      onMouseEnter={disableAnimationHandler}
    >
      <ReactCompareSlider
        position={position}
        transition={animate ? '1s ease-in-out' : '.3s ease-in-out'}
        portrait={horizontal}
        handle={
          <Handle
            leftIcon={actualIconLeft}
            rightIcon={actualIconRight}
            hideHandle={handles.hideHandle}
          />
        }
        style={{ height: '100%' }}
        itemOne={
          <img
            className={styles.image}
            src={actualLeft}
            style={{
              objectPosition: `${(left?.xPercent || 0.5) * 100}% ${(left?.yPercent || 0.5) * 100}%`,
            }}
          />
        }
        itemTwo={
          <img
            className={styles.image}
            src={actualRight}
            style={{
              objectPosition: `${(right?.xPercent || 0.5) * 100}% ${
                (right?.yPercent || 0.5) * 100
              }%`,
            }}
          />
        }
      />
    </div>
  );
};

registerVevComponent(ImageCompare, {
  name: 'ImageCompare',
  props: [
    {
      name: 'left',
      title: 'Left Image',
      type: 'image',
      component: (props) => {
        const value = props.value as ImageProp;
        return (
          <ObjectFitEditor
            name="left"
            title="Left image"
            value={value || { url: DEFAULT_LEFT_IMAGE, xPercent: 0.5, yPercent: 0.5, key: '' }}
            onChange={props.onChange}
            context={props.context}
          />
        );
      },
    },
    {
      name: 'right',
      title: 'Right Image',
      type: 'image',
      component: (props) => {
        const value = props.value as ImageProp;
        return (
          <ObjectFitEditor
            name="left"
            title="Left image"
            value={value || { url: DEFAULT_RIGHT_IMAGE, xPercent: 0.5, yPercent: 0.5, key: '' }}
            onChange={props.onChange}
            context={props.context}
          />
        );
      },
    },
    {
      name: 'handles',
      title: 'Handles',
      type: 'object',
      fields: [
        {
          name: 'leftIcon',
          title: 'Left handle',
          type: 'icon',
        },
        {
          name: 'rightIcon',
          title: 'Right handle',
          type: 'icon',
        },
        {
          name: 'hideHandle',
          title: 'Hide handles',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
    {
      name: 'animation',
      title: 'Animation',
      type: 'object',
      fields: [
        {
          name: 'animate',
          title: 'Animate handle',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
  ],
  editableCSS: [
    {
      title: 'Icon',
      selector: styles.icon,
      properties: ['color'],
    },
    {
      title: 'Container',
      selector: styles.wrapper,
      properties: ['border', 'border-radius'],
    },
  ],
  type: 'both',
});

export default ImageCompare;
