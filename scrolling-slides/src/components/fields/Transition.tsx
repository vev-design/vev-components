import { SilkeAutocompleteField, SilkeBox, SilkeButton, SilkeSelectField, SilkeTextSmall } from '@vev/silke';
import React from 'react';

type TransitionPreset = {
  label: string;
  value: string;
  type: string;
  settings?: { [key: string]: any };
};

type TransitionCategory = {
  label: string;
  value: string;
  variants: TransitionPreset[];
};

// Categories with their variants
export const TRANSITION_CATEGORIES: TransitionCategory[] = [
  {
    label: 'Horizontal scroll',
    value: 'scroll',
    variants: [
      { label: 'Default', value: 'scroll', type: 'scroll' },
      { label: 'Reverse', value: 'scroll-reverse', type: 'scroll', settings: { reverse: true } },
      { label: 'Zoom', value: 'scroll-zoom', type: 'scroll', settings: { zoomScroll: true } },
      {
        label: 'Zoom reverse',
        value: 'scroll-zoom-reverse',
        type: 'scroll',
        settings: { zoomScroll: true, reverse: true },
      },
      { label: 'Blur', value: 'scroll-blur', type: 'scroll', settings: { blurScroll: true } },
      { label: 'Blur reverse', value: 'scroll-blur-reverse', type: 'scroll', settings: { blurScroll: true, reverse: true } },
    ],
  },
  {
    label: 'Fade in',
    value: 'fade',
    variants: [
      { label: 'Default', value: 'fade', type: 'fade' },
      { label: 'With fade out', value: 'fade-in-out', type: 'fade', settings: { fadeOut: true } },
      { label: 'Small zoom', value: 'fade-zoom-small', type: 'fade', settings: { scale: 0.05 } },
      { label: 'Small zoom + fade out', value: 'fade-zoom-small-in-out', type: 'fade', settings: { scale: 0.05, fadeOut: true } },
      { label: 'Medium zoom', value: 'fade-zoom', type: 'fade', settings: { scale: 0.15 } },
      { label: 'Medium zoom + fade out', value: 'fade-zoom-in-out', type: 'fade', settings: { scale: 0.15, fadeOut: true } },
      { label: 'Large zoom', value: 'fade-zoom-large', type: 'fade', settings: { scale: 0.5 } },
      { label: 'Large zoom + fade out', value: 'fade-zoom-large-in-out', type: 'fade', settings: { scale: 0.5, fadeOut: true } },
      { label: 'Extreme zoom', value: 'fade-zoom-extreme', type: 'fade', settings: { scale: 1.5 } },
      { label: 'Extreme zoom + fade out', value: 'fade-zoom-extreme-in-out', type: 'fade', settings: { scale: 1.5, fadeOut: true } },
      { label: 'Blur', value: 'fade-blur', type: 'fade', settings: { blur: 40 } },
      { label: 'Blur + fade out', value: 'fade-blur-in-out', type: 'fade', settings: { blur: 40, fadeOut: true } },
      { label: 'Blur zoom', value: 'fade-blur-zoom', type: 'fade', settings: { blur: 40, scale: 0.15 } },
      { label: 'Blur zoom + fade out', value: 'fade-blur-zoom-in-out', type: 'fade', settings: { blur: 40, scale: 0.15, fadeOut: true } },
    ],
  },
  {
    label: 'Fade out',
    value: 'fade-out',
    variants: [
      { label: 'Default', value: 'fade-out', type: 'fade', settings: { fadeDirection: 'out' } },
      { label: 'With fade in', value: 'fade-out-in', type: 'fade', settings: { fadeDirection: 'out', fadeOut: true } },
      { label: 'Small zoom', value: 'fade-out-zoom-small', type: 'fade', settings: { fadeDirection: 'out', scale: 0.05 } },
      { label: 'Small zoom + fade in', value: 'fade-out-zoom-small-in', type: 'fade', settings: { fadeDirection: 'out', scale: 0.05, fadeOut: true } },
      { label: 'Medium zoom', value: 'fade-out-zoom', type: 'fade', settings: { fadeDirection: 'out', scale: 0.15 } },
      { label: 'Medium zoom + fade in', value: 'fade-out-zoom-in', type: 'fade', settings: { fadeDirection: 'out', scale: 0.15, fadeOut: true } },
      { label: 'Large zoom', value: 'fade-out-zoom-large', type: 'fade', settings: { fadeDirection: 'out', scale: 0.5 } },
      { label: 'Large zoom + fade in', value: 'fade-out-zoom-large-in', type: 'fade', settings: { fadeDirection: 'out', scale: 0.5, fadeOut: true } },
      { label: 'Extreme zoom', value: 'fade-out-zoom-extreme', type: 'fade', settings: { fadeDirection: 'out', scale: 1.5 } },
      { label: 'Extreme zoom + fade in', value: 'fade-out-zoom-extreme-in', type: 'fade', settings: { fadeDirection: 'out', scale: 1.5, fadeOut: true } },
      { label: 'Blur', value: 'fade-out-blur', type: 'fade', settings: { fadeDirection: 'out', blur: 40 } },
      { label: 'Blur + fade in', value: 'fade-out-blur-in', type: 'fade', settings: { fadeDirection: 'out', blur: 40, fadeOut: true } },
      { label: 'Blur zoom', value: 'fade-out-blur-zoom', type: 'fade', settings: { fadeDirection: 'out', blur: 40, scale: 0.15 } },
      { label: 'Blur zoom + fade in', value: 'fade-out-blur-zoom-in', type: 'fade', settings: { fadeDirection: 'out', blur: 40, scale: 0.15, fadeOut: true } },
    ],
  },
  {
    label: 'Reveal',
    value: 'reveal',
    variants: [
      {
        label: 'From right',
        value: 'reveal',
        type: 'reveal',
      },
      {
        label: 'From left',
        value: 'reveal-left',
        type: 'reveal',
        settings: {
          revealDirection:
            'polygon(0 0, calc( 100% * var(--slide-offset)) 0, calc( 100% * var(--slide-offset)) 100%, 0% 100%)',
        },
      },
      {
        label: 'From top',
        value: 'reveal-top',
        type: 'reveal',
        settings: {
          revealDirection:
            'polygon(0 0, 100% 0, 100% calc(var(--slide-offset) * 100%), 0% calc(var(--slide-offset) * 100%))',
        },
      },
      {
        label: 'From top left',
        value: 'reveal-top-left',
        type: 'reveal',
        settings: {
          revealDirection:
            'polygon(-100% -100%, calc((25% + 100% * var(--slide-offset) / 2) * 4) -100%, -100% calc((25% + 100% * var(--slide-offset) / 2) * 4))',
        },
      },
      {
        label: 'From top right',
        value: 'reveal-top-right',
        type: 'reveal',
        settings: {
          revealDirection:
            'polygon(100% -100%, 100% calc((25% + 100% * var(--slide-offset) / 2) * 4), -100% calc((25% + 100% * var(--slide-offset) / 2) * 4))',
        },
      },
    ],
  },
  {
    label: 'Stack',
    value: 'stack',
    variants: [
      { label: 'Up', value: 'stack', type: 'stack' },
      { label: 'Down', value: 'stack-down', type: 'stack', settings: { stackDirection: 'down' } },
      { label: 'Left', value: 'stack-left', type: 'stack', settings: { stackDirection: 'left' } },
      {
        label: 'Right',
        value: 'stack-right',
        type: 'stack',
        settings: { stackDirection: 'right' },
      },
    ],
  },
  {
    label: 'Mask',
    value: 'mask',
    variants: [
      {
        label: 'Circle',
        value: 'mask-circle',
        type: 'mask',
        settings: {
          maskShape:
            'circle(calc(var(--slide-offset) * 150%) at calc(var(--mask-x) * 100%) calc(var(--mask-y) * 100%))',
        },
      },
      {
        label: 'Rectangle',
        value: 'mask-rectangle',
        type: 'mask',
        settings: {
          maskShape:
            'inset(calc(var(--mask-y) * (1 - var(--slide-offset)) * 100% ) calc((1 - var(--mask-x)) * (1 - var(--slide-offset)) * 100% ) calc((1 - var(--mask-y)) * (1 - var(--slide-offset)) * 100% ) calc(var(--mask-x) * (1 - var(--slide-offset)) * 100% ))',
        },
      },
    ],
  },
  {
    label: '3D',
    value: '3d',
    variants: [
      { label: 'Flip horizontal', value: 'flip', type: 'flip' },
      {
        label: 'Flip vertical',
        value: 'flip-vertical',
        type: 'flip',
        settings: { flipDirection: 'vertical' },
      },
      { label: 'Cube horizontal', value: 'cube', type: 'cube' },
      {
        label: 'Cube vertical',
        value: 'cube-vertical',
        type: 'cube',
        settings: { cubeDirection: 'vertical' },
      },
      { label: 'Cover Flow', value: 'coverflow', type: 'coverflow' },
    ],
  },
  {
    label: 'None',
    value: 'none',
    variants: [{ label: 'Instant', value: 'none', type: 'none' }],
  },
];

// Flat list of all presets (for resolvePreset and backwards compat)
export const TRANSITION_PRESETS: TransitionPreset[] = TRANSITION_CATEGORIES.flatMap(
  (c) => c.variants,
);

const PRESET_MAP = new Map(TRANSITION_PRESETS.map((p) => [p.value, p]));

// Map preset value -> category value
const PRESET_TO_CATEGORY = new Map<string, string>();
for (const cat of TRANSITION_CATEGORIES) {
  for (const v of cat.variants) {
    PRESET_TO_CATEGORY.set(v.value, cat.value);
  }
}

export function resolvePreset(presetValue: string): {
  type: string;
  settings: { [key: string]: any };
} {
  const preset = PRESET_MAP.get(presetValue);
  if (preset) {
    return { type: preset.type, settings: preset.settings || {} };
  }
  // Backwards compat: if value matches a type directly, use it
  return { type: presetValue || 'scroll', settings: {} };
}

// Build flat autocomplete items with groupLabel for category grouping
function buildAutocompleteItems(includeDefault?: boolean) {
  const items: { label: string; value: string; groupLabel?: string }[] = [];
  if (includeDefault) {
    items.push({ label: 'Default', value: '' });
  }
  // Top-level shortcuts: first variant of each category, no groupLabel
  for (const cat of TRANSITION_CATEGORIES) {
    const first = cat.variants[0];
    if (first) {
      items.push({ label: cat.label, value: first.value });
    }
  }
  // All variants grouped by category, prefixed with category name
  for (const cat of TRANSITION_CATEGORIES) {
    for (const v of cat.variants) {
      items.push({ label: `${cat.label} — ${v.label}`, value: v.value, groupLabel: cat.label });
    }
  }
  return items;
}

const AUTOCOMPLETE_ITEMS = buildAutocompleteItems();
const OVERRIDE_AUTOCOMPLETE_ITEMS = buildAutocompleteItems(true);

export const SPEED_OPTIONS: { label: string; value: string }[] = [
  { label: 'Smooth', value: 'linear' },
  { label: 'Slow', value: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
  { label: 'Medium', value: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' },
  { label: 'Fast', value: 'cubic-bezier(0.7, 0, 0.3, 1)' },
  { label: 'Snappy', value: 'cubic-bezier(0.85, 0, 0.15, 1)' },
];

const SPEED_ITEMS = [{ label: 'Default', value: '' }, ...SPEED_OPTIONS];

export type TransitionOverride = {
  type: string;
  speed?: string;
};

// --- Default transition picker (single autocomplete) ---

type TransitionPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TransitionPicker({ value, onChange }: TransitionPickerProps) {
  return (
    <SilkeAutocompleteField
      label="Transition"
      value={value || 'scroll'}
      items={AUTOCOMPLETE_ITEMS as any}
      onChange={onChange}
      disableSearch={false}
      minChars={0}
    />
  );
}

// --- Per-slide override field ---

type TransitionFieldProps = {
  value: TransitionOverride[];
  numberOfSlides: number;
  onChange: (value: TransitionOverride[]) => void;
};

export function TransitionField({ value, numberOfSlides, onChange }: TransitionFieldProps) {
  const overrides = Array.isArray(value) ? value : [];
  const transitionCount = numberOfSlides - 1;

  if (transitionCount <= 0) return null;

  const ensureLength = (arr: TransitionOverride[], index: number) => {
    const next = [...arr];
    while (next.length <= index) next.push({ type: '' });
    return next;
  };

  const handleTransitionChange = (index: number, preset: string) => {
    const next = ensureLength(overrides, index);
    next[index] = { ...next[index], type: preset };
    onChange(next);
  };

  const handleSpeedChange = (index: number, speed: string) => {
    const next = ensureLength(overrides, index);
    next[index] = { ...next[index], speed };
    onChange(next);
  };

  const handleReset = (index: number) => {
    const next = [...overrides];
    if (index < next.length) {
      next[index] = { type: '', speed: '' };
      onChange(next);
    }
  };

  return (
    <SilkeBox column gap="s">
      {Array.from({ length: transitionCount }, (_, i) => {
        const override = overrides[i];
        const isOverridden = !!override?.type || !!override?.speed;

        return (
          <SilkeBox key={i} column gap="xs" pad="s" bg="surface-1" rounded="small">
            <SilkeBox vAlign="center" gap="xs">
              <SilkeTextSmall style={{ flex: 1 }}>{`Slide ${i + 1} → ${i + 2}`}</SilkeTextSmall>
              {isOverridden && (
                <SilkeButton icon="redo" size="s" kind="ghost" onClick={() => handleReset(i)} />
              )}
            </SilkeBox>
            <SilkeAutocompleteField
              label="Transition"
              value={override?.type || ''}
              items={OVERRIDE_AUTOCOMPLETE_ITEMS as any}
              onChange={(v: string) => handleTransitionChange(i, v)}
              disableSearch={false}
              minChars={0}
            />
            <SilkeSelectField
              label="Speed"
              value={override?.speed || ''}
              items={SPEED_ITEMS}
              onChange={(v: string) => handleSpeedChange(i, v)}
            />
          </SilkeBox>
        );
      })}
    </SilkeBox>
  );
}
