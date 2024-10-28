import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { SilkeBox, SilkeButton, SilkeCssNumberField, SilkeTextSmall } from '@vev/silke';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function isNumber(val: any): val is number {
  return typeof val === 'number';
}

function isString(val: any): val is string {
  return typeof val === 'string';
}

type BackgroundEditorProps = {
  style?: CSSProperties;
  imageUrl?: string;
  x: number | string;
  y: number | string;
  disabled?: boolean;
  onChange: (xPercent: number, yPercent: number) => void;
};

export function BackgroundEditor({
  imageUrl,
  onChange,
  disabled,
  style,
  x,
  y,
}: BackgroundEditorProps) {
  const [drag, setDrag] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const changeRef = useRef<BackgroundEditorProps['onChange']>(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    if (imageUrl) {
      let cancel = false;
      const img = new Image();
      img.onload = () => {
        if (!cancel) setAspectRatio(img.naturalWidth / img.naturalHeight);
      };
      img.src = imageUrl.replace('url("', '').replace('")', '');

      return () => {
        cancel = true;
      };
    }
  }, [imageUrl]);

  const handleMouseMove = ({ pageX, pageY }: MouseEvent | React.MouseEvent) => {
    if (disabled) return;
    if (!drag) return;
    const el = ref.current;
    if (el) {
      const { left, top, height, width } = el.getBoundingClientRect();
      const x = clamp((pageX - left) / width, 0, 1);
      const y = clamp((pageY - top) / height, 0, 1);
      changeRef.current(x, y);
    }
  };

  style = { ...style, position: 'absolute', top: 0 };

  if (imageUrl) {
    style.backgroundImage = imageUrl.includes('url(') ? imageUrl : `url(${imageUrl})`;
    style.backgroundSize = 'contain';
    style.backgroundRepeat = 'no-repeat';
    style.backgroundPosition = 'center';
  }

  const focusPosition = {
    position: 'absolute',
    background: '#256CFAFF',
    borderRadius: '50%',
    border: '1px solid #FCFCFCFF',
    width: '16px',
    height: '16px',
    transform: 'translate(-50%,-50%)',
    left: isNumber(x) ? Math.round(x * 100) + '%' : x,
    top: isNumber(y) ? Math.round(y * 100) + '%' : y,
  };

  const containerStyle: CSSProperties = { position: 'relative' };
  if (aspectRatio > 4 / 3) {
    containerStyle.width = '100%';
    containerStyle.height = ((4 / 3) * 100) / aspectRatio + '%';
  } else {
    containerStyle.height = '100%';
    containerStyle.width = (3 / 4) * 100 * aspectRatio + '%';
  }

  return (
    <>
      {imageUrl && (
        <SilkeBox
          bg="neutral-0"
          rounded="small"
          overflow="hidden"
          aspectRatio="4:3"
          align="center"
          onMouseDown={() => {
            setDrag(true);
          }}
          onMouseUp={() => {
            setDrag(false);
          }}
          onMouseMove={handleMouseMove}
        >
          <div
            style={containerStyle}
            ref={ref}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            <div className="fill" style={style} />
            {/** @ts-expect-error ajo - works **/}
            {!disabled && <div style={focusPosition} />}
          </div>
        </SilkeBox>
      )}

      <SilkeBox gap="m" vAlign="center">
        <SilkeBox width="xl">
          <SilkeTextSmall weight="strong">Position</SilkeTextSmall>
        </SilkeBox>
        <SilkeBox gap="s">
          <SilkeCssNumberField
            label="X"
            min={0}
            max={100}
            width={68}
            value={isString(x) ? x : Math.round(x * 100) + '%'}
            onChange={(x) => onChange(parseFloat(x) / 100, y as number)}
          />

          <SilkeCssNumberField
            label="Y"
            min={0}
            max={100}
            width={68}
            value={isString(y) ? y : Math.round(y * 100) + '%'}
            onChange={(y) => onChange(x as number, parseFloat(y) / 100)}
          />
        </SilkeBox>
      </SilkeBox>
    </>
  );
}
