import {
  SilkeBox,
  SilkeButton,
  SilkeCheckbox,
  SilkePopover,
  SilkeSelectField,
  SilkeTextSmall,
} from '@vev/silke';
import React, { useRef, useState, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransitionEffects = {
  reverse?: boolean;
  blur?: string;
  zoom?: string;
  fadeMode?: string;
  revealDirection?: string;
  stackDirection?: string;
  maskShape?: string;
  threeDType?: string;
};

export type TransitionValue = {
  primary: string;
  effects?: TransitionEffects;
};

export type TransitionOverride = {
  type: string;
  speed?: string;
  effects?: TransitionEffects;
};

// ─── Transition definitions ──────────────────────────────────────────────────

const BASE_TRANSITIONS: { label: string; value: string; type: string }[] = [
  { label: 'Horizontal scroll', value: 'scroll', type: 'scroll' },
  { label: 'Fade', value: 'fade', type: 'fade' },
  { label: 'Reveal', value: 'reveal', type: 'reveal' },
  { label: 'Stack', value: 'stack', type: 'stack' },
  { label: 'Mask', value: 'mask', type: 'mask' },
  { label: '3D', value: '3d', type: 'flip' },
  { label: 'None', value: 'none', type: 'none' },
];

const BASE_MAP = new Map(BASE_TRANSITIONS.map((t) => [t.value, t]));

const SELECT_ITEMS = BASE_TRANSITIONS.map((t) => ({ label: t.label, value: t.value }));
const OVERRIDE_SELECT_ITEMS = [{ label: 'Default', value: '' }, ...SELECT_ITEMS];

// ─── Settings: which fields each transition exposes ──────────────────────────

type SettingsConfig = {
  fields: {
    key: keyof TransitionEffects;
    label: string;
    type: 'select' | 'checkbox';
    options?: { label: string; value: string }[];
    defaultValue?: string;
  }[];
};

const SETTINGS_CONFIG: Record<string, SettingsConfig> = {
  scroll: {
    fields: [
      { key: 'reverse', label: 'Reverse', type: 'checkbox' },
      {
        key: 'blur',
        label: 'Blur',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Subtle', value: 'subtle' },
          { label: 'Medium', value: 'medium' },
          { label: 'Strong', value: 'strong' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
      {
        key: 'zoom',
        label: 'Zoom',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
    ],
  },
  fade: {
    fields: [
      {
        key: 'fadeMode',
        label: 'Mode',
        type: 'select',
        defaultValue: 'in',
        options: [
          { label: 'Fade in', value: 'in' },
          { label: 'Fade out', value: 'out' },
          { label: 'Fade in & out', value: 'in-out' },
        ],
      },
      {
        key: 'blur',
        label: 'Blur',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Subtle', value: 'subtle' },
          { label: 'Medium', value: 'medium' },
          { label: 'Strong', value: 'strong' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
      {
        key: 'zoom',
        label: 'Zoom',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
    ],
  },
  reveal: {
    fields: [
      {
        key: 'revealDirection',
        label: 'Direction',
        type: 'select',
        defaultValue: 'right',
        options: [
          { label: 'From right', value: 'right' },
          { label: 'From left', value: 'left' },
          { label: 'From top', value: 'top' },
          { label: 'From top left', value: 'top-left' },
          { label: 'From top right', value: 'top-right' },
        ],
      },
      {
        key: 'blur',
        label: 'Blur',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Subtle', value: 'subtle' },
          { label: 'Medium', value: 'medium' },
          { label: 'Strong', value: 'strong' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
      {
        key: 'zoom',
        label: 'Zoom',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
    ],
  },
  stack: {
    fields: [
      {
        key: 'stackDirection',
        label: 'Direction',
        type: 'select',
        defaultValue: 'up',
        options: [
          { label: 'Up', value: 'up' },
          { label: 'Down', value: 'down' },
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
        ],
      },
      {
        key: 'blur',
        label: 'Blur',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Subtle', value: 'subtle' },
          { label: 'Medium', value: 'medium' },
          { label: 'Strong', value: 'strong' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
      {
        key: 'zoom',
        label: 'Zoom',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
    ],
  },
  mask: {
    fields: [
      {
        key: 'maskShape',
        label: 'Shape',
        type: 'select',
        defaultValue: 'circle',
        options: [
          { label: 'Circle', value: 'circle' },
          { label: 'Rectangle', value: 'rectangle' },
        ],
      },
      {
        key: 'blur',
        label: 'Blur',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Subtle', value: 'subtle' },
          { label: 'Medium', value: 'medium' },
          { label: 'Strong', value: 'strong' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
      {
        key: 'zoom',
        label: 'Zoom',
        type: 'select',
        options: [
          { label: 'None', value: '' },
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
          { label: 'Extreme', value: 'extreme' },
        ],
      },
    ],
  },
  '3d': {
    fields: [
      {
        key: 'threeDType',
        label: 'Type',
        type: 'select',
        defaultValue: 'flip',
        options: [
          { label: 'Flip horizontal', value: 'flip' },
          { label: 'Flip vertical', value: 'flip-vertical' },
          { label: 'Cube horizontal', value: 'cube' },
          { label: 'Cube vertical', value: 'cube-vertical' },
          { label: 'Cover Flow', value: 'coverflow' },
        ],
      },
    ],
  },
};

// ─── Resolve transition for slide components ─────────────────────────────────

export const ZOOM_SCALE_MAP: Record<string, number> = {
  small: 0.05,
  medium: 0.15,
  large: 0.5,
  extreme: 1.5,
};

export const BLUR_AMOUNT_MAP: Record<string, number> = {
  subtle: 8,
  medium: 20,
  strong: 40,
  extreme: 80,
};

const REVEAL_CLIP_PATHS: Record<string, string> = {
  left: 'polygon(0 0, calc(100% * var(--slide-offset)) 0, calc(100% * var(--slide-offset)) 100%, 0% 100%)',
  top: 'polygon(0 0, 100% 0, 100% calc(var(--slide-offset) * 100%), 0% calc(var(--slide-offset) * 100%))',
  'top-left':
    'polygon(-100% -100%, calc((25% + 100% * var(--slide-offset) / 2) * 4) -100%, -100% calc((25% + 100% * var(--slide-offset) / 2) * 4))',
  'top-right':
    'polygon(100% -100%, 100% calc((25% + 100% * var(--slide-offset) / 2) * 4), -100% calc((25% + 100% * var(--slide-offset) / 2) * 4))',
};

const MASK_CLIP_PATHS: Record<string, string> = {
  circle:
    'circle(calc(var(--slide-offset) * 150%) at calc(var(--mask-x) * 100%) calc(var(--mask-y) * 100%))',
  rectangle:
    'inset(calc(var(--mask-y) * (1 - var(--slide-offset)) * 100%) calc((1 - var(--mask-x)) * (1 - var(--slide-offset)) * 100%) calc((1 - var(--mask-y)) * (1 - var(--slide-offset)) * 100%) calc(var(--mask-x) * (1 - var(--slide-offset)) * 100%))',
};

export function resolveTransition(
  base: string,
  effects?: TransitionEffects,
): { type: string; settings: Record<string, any> } {
  const settings: Record<string, any> = {};

  // Determine component type
  let type: string;
  if (base === '3d') {
    const variant = effects?.threeDType || 'flip';
    // flip-vertical and cube-vertical use the same component with a direction setting
    if (variant === 'flip-vertical') {
      type = 'flip';
      settings.flipDirection = 'vertical';
    } else if (variant === 'cube-vertical') {
      type = 'cube';
      settings.cubeDirection = 'vertical';
    } else {
      type = variant;
    }
  } else {
    type = BASE_MAP.get(base)?.type || base || 'scroll';
  }

  // Defaults when no effects are set
  if (!effects) {
    if (base === 'mask') settings.maskShape = MASK_CLIP_PATHS.circle;
    return { type, settings };
  }

  // Common effects
  if (effects.reverse) settings.reverse = true;
  if (effects.blur && BLUR_AMOUNT_MAP[effects.blur] !== undefined) {
    if (base === 'scroll') {
      settings.blurScroll = BLUR_AMOUNT_MAP[effects.blur];
    } else {
      settings.blur = BLUR_AMOUNT_MAP[effects.blur];
    }
  }
  if (effects.zoom && ZOOM_SCALE_MAP[effects.zoom] !== undefined) {
    if (base === 'scroll') {
      settings.zoomScroll = ZOOM_SCALE_MAP[effects.zoom];
    } else {
      settings.scale = ZOOM_SCALE_MAP[effects.zoom];
    }
  }

  // Per-type settings
  if (base === 'fade') {
    const mode = effects.fadeMode || 'in';
    if (mode === 'out') settings.fadeDirection = 'out';
    if (mode === 'in-out') settings.fadeOut = true;
  }
  if (base === 'reveal') {
    const dir = effects.revealDirection || 'right';
    if (REVEAL_CLIP_PATHS[dir]) settings.revealDirection = REVEAL_CLIP_PATHS[dir];
  }
  if (base === 'stack') {
    const dir = effects.stackDirection || 'up';
    if (dir !== 'up') settings.stackDirection = dir;
  }
  if (base === 'mask') {
    const shape = effects.maskShape || 'circle';
    settings.maskShape = MASK_CLIP_PATHS[shape] || MASK_CLIP_PATHS.circle;
  }

  return { type, settings };
}

// ─── Speed options ───────────────────────────────────────────────────────────

export const SPEED_OPTIONS = [
  { label: 'Smooth', value: 'linear' },
  { label: 'Slow', value: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
  { label: 'Medium', value: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' },
  { label: 'Fast', value: 'cubic-bezier(0.7, 0, 0.3, 1)' },
  { label: 'Snappy', value: 'cubic-bezier(0.85, 0, 0.15, 1)' },
];

const SPEED_ITEMS = [{ label: 'Default', value: '' }, ...SPEED_OPTIONS];

// ─── Settings popover ────────────────────────────────────────────────────────

function SettingsPopover({
  base,
  effects,
  onChange,
  anchorRef,
  openTrigger,
}: {
  base: string;
  effects: TransitionEffects;
  onChange: (effects: TransitionEffects) => void;
  anchorRef: React.RefObject<HTMLElement>;
  openTrigger?: number;
}) {
  const [open, setOpen] = useState(false);
  const config = SETTINGS_CONFIG[base];
  const hasEffects = Object.values(effects).some(Boolean);

  useEffect(() => {
    if (openTrigger && openTrigger > 0) setOpen(true);
  }, [openTrigger]);

  return (
    <>
      <SilkeButton
        icon="settings"
        size="s"
        kind="ghost"
        selected={hasEffects}
        disabled={!config}
        onClick={() => config && setOpen(!open)}
      />
      <SilkePopover
        anchor={anchorRef}
        hide={!open}
        onRequestClose={() => setOpen(false)}
        offsetX={-8}
        anchorOrigin="top-left"
        targetOrigin="top-right"
        shadow="level3"
      >
        <SilkeBox column pad="m" gap="m" bg="neutral-10" rounded="small" style={{ width: 200 }}>
          <SilkeTextSmall weight="strong">Transition settings</SilkeTextSmall>
          <SilkeBox column gap="s">
            {config?.fields.map((field) =>
              field.type === 'checkbox' ? (
                <SilkeCheckbox
                  key={field.key}
                  label={field.label}
                  value={!!effects[field.key]}
                  onChange={(v: boolean) =>
                    onChange({ ...effects, [field.key]: v || undefined })
                  }
                />
              ) : (
                <SilkeSelectField
                  key={field.key}
                  label={field.label}
                  value={(effects[field.key] as string) || field.defaultValue || ''}
                  items={field.options!}
                  onChange={(v: string) =>
                    onChange({ ...effects, [field.key]: v || undefined })
                  }
                />
              ),
            )}
          </SilkeBox>
        </SilkeBox>
      </SilkePopover>
    </>
  );
}

// ─── Transition select + settings row (shared layout) ────────────────────────

function TransitionRow({
  base,
  items,
  effects,
  onBaseChange,
  onEffectsChange,
}: {
  base: string;
  items: { label: string; value: string }[];
  effects: TransitionEffects;
  onBaseChange: (value: string) => void;
  onEffectsChange: (effects: TransitionEffects) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [openTrigger, setOpenTrigger] = useState(0);

  const handleBaseChange = (v: string) => {
    onBaseChange(v);
    if (SETTINGS_CONFIG[v]) setOpenTrigger((n) => n + 1);
  };

  return (
    <SilkeBox ref={rowRef} gap="xs" vAlign="end">
      <div style={{ flex: 1 }}>
        <SilkeSelectField
          label="Transition"
          value={base}
          items={items}
          onChange={handleBaseChange}
        />
      </div>
      <SettingsPopover
        base={base}
        anchorRef={rowRef as React.RefObject<HTMLElement>}
        effects={effects}
        onChange={onEffectsChange}
        openTrigger={openTrigger}
      />
    </SilkeBox>
  );
}

// ─── Default transition picker ───────────────────────────────────────────────

type TransitionPickerProps = {
  value: TransitionValue | string;
  onChange: (value: TransitionValue) => void;
};

export function TransitionPicker({ value, onChange }: TransitionPickerProps) {
  const resolved: TransitionValue =
    typeof value === 'string' ? { primary: value, effects: {} } : value;

  return (
    <TransitionRow
      base={resolved.primary || 'scroll'}
      items={SELECT_ITEMS}
      effects={resolved.effects || {}}
      onBaseChange={(v) => onChange({ primary: v, effects: {} })}
      onEffectsChange={(effects) => onChange({ ...resolved, effects })}
    />
  );
}

// ─── Per-slide override field ────────────────────────────────────────────────

type TransitionFieldProps = {
  value: TransitionOverride[];
  numberOfSlides: number;
  onChange: (value: TransitionOverride[]) => void;
};

export function TransitionField({ value, numberOfSlides, onChange }: TransitionFieldProps) {
  const overrides = Array.isArray(value) ? value : [];
  const transitionCount = numberOfSlides - 1;

  if (transitionCount <= 0) return null;

  const update = (index: number, patch: Partial<TransitionOverride>) => {
    const next = [...overrides];
    while (next.length <= index) next.push({ type: '' });
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const reset = (index: number) => {
    if (index < overrides.length) {
      const next = [...overrides];
      next[index] = { type: '', speed: '', effects: undefined };
      onChange(next);
    }
  };

  return (
    <SilkeBox column gap="s">
      {Array.from({ length: transitionCount }, (_, i) => {
        const o = overrides[i];
        const isOverridden =
          !!o?.type || !!o?.speed || (!!o?.effects && Object.values(o.effects).some(Boolean));

        return (
          <SilkeBox key={i} column gap="xs" pad="s" bg="surface-1" rounded="small">
            <SilkeBox vAlign="center" gap="xs">
              <SilkeTextSmall style={{ flex: 1 }}>{`Slide ${i + 1} → ${i + 2}`}</SilkeTextSmall>
              {isOverridden && (
                <SilkeButton icon="redo" size="s" kind="ghost" onClick={() => reset(i)} />
              )}
            </SilkeBox>
            <TransitionRow
              base={o?.type || ''}
              items={OVERRIDE_SELECT_ITEMS}
              effects={o?.effects || {}}
              onBaseChange={(v) => update(i, { type: v, effects: {} })}
              onEffectsChange={(effects) => update(i, { effects })}
            />
            <SilkeSelectField
              label="Speed"
              value={o?.speed || ''}
              items={SPEED_ITEMS}
              onChange={(v: string) => update(i, { speed: v })}
            />
          </SilkeBox>
        );
      })}
    </SilkeBox>
  );
}
