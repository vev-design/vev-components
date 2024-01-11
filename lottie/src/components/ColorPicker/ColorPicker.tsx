import React, { useEffect, useState } from 'react';
import { getColors } from 'lottie-colorify';
import { SchemaFieldProps, SchemaFieldTypes } from '@vev/react';
import { LottieColor, LottieColorReplacement } from '../../types';
import defaultAnimation from '../../constants/defaultAnimation';
import sortLottieColors from '../../utils/sortLottieColors';
import {
  SilkeBox,
  SilkeColorPickerButton,
  SilkeButton,
  SilkeText,
  SilkeTextField,
} from '@vev/silke';

const ColorPicker = ({
  context,
  value = [],
  onChange,
}: SchemaFieldProps<SchemaFieldTypes['array']>) => {
  const [json, setJson] = useState();
  const [lottieColors, setLottieColors] = useState<LottieColor[]>([]);
  const filePath = context.value?.file?.url || defaultAnimation;

  // Fetch json data when file url changes
  useEffect(() => {
    const fetchJson = async () => {
      try {
        const response = await fetch(filePath);
        if (response.ok) {
          const result = await response.json();
          setJson(result);
        }
      } catch (e) {
        setJson(undefined);
      }
    };

    fetchJson();
  }, [filePath]);

  // Get colors from json
  useEffect(() => {
    const getLottieColors = () => {
      try {
        const result = getColors(json) as LottieColor[];

        const uniqueResult = Array.from(new Map(result.map((c) => [`${c.join()}`, c])).values());
        const sortedResult = sortLottieColors(uniqueResult);

        setLottieColors(sortedResult);
      } catch (e) {
        setLottieColors([]);
      }
    };

    getLottieColors();
  }, [json]);

  // Handle color input
  const onChangeColor = (oldColor: LottieColor, newColor: string) => {
    // Filter out existing change if same color
    const newColors = (value ? [...value] : []).filter((oldChange) => {
      const isSameCol = String(oldChange.oldColor) === String(oldColor);

      return !isSameCol;
    }) as LottieColorReplacement[];

    // Lottie crashes on short hex values like #fff
    if (newColor.length < 7) {
      newColor = `${newColor}${newColor.substring(1)}`;
    }

    newColors.push({ oldColor, newColor });
    onChange(newColors);
  };

  const onReset = () => {
    onChange([]);
  };

  return (
    <SilkeBox column flex gap="s">
      <SilkeBox flex gap="m" hAlign="spread" vAlign="center">
        <SilkeText weight="strong" size="small">
          Colors
        </SilkeText>
        <SilkeButton size="base" icon="undo" kind="ghost" onClick={onReset} />
      </SilkeBox>
      <SilkeBox column flex gap="m" hPad="s" style={{ paddingLeft: '84px', paddingBottom: '8px' }}>
        {lottieColors?.map((color, index) => {
          const replacement = value.find(
            (v) => String(v.oldColor) === String(color),
          ) as LottieColorReplacement;

          const rgb = replacement
            ? replacement.newColor
            : `rgb(${color[0]},${color[1]},${color[2]})`;

          return (
            <SilkeBox key={`${index}-${color}`} vAlign="center" flex gap="xs">
              <SilkeColorPickerButton
                value={rgb}
                kind="ghost"
                size="s"
                noVariables
                noTransparency
                onChange={(newColor) => onChangeColor(color, newColor)}
              />
              <SilkeTextField
                value={rgb}
                onChange={(newColor: string) => onChangeColor(color, newColor)}
              />
            </SilkeBox>
          );
        })}
      </SilkeBox>
    </SilkeBox>
  );
};

export default ColorPicker;
