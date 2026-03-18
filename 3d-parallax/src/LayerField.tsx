import React, { useEffect, useRef, useState } from 'react';
import {
  SilkeBox,
  SilkeSlider,
  SilkeTextSmall,
  SilkeTextMicro,
  SilkeButton,
} from '@vev/silke';
import s from './LayerField.module.css';

export type LayerSettings = {
  speed: number;
};

const LAYER_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

function formatSpeed(speed: number): string {
  if (speed === 0) return '0\u00d7';
  const sign = speed > 0 ? '+' : '';
  // Show one decimal, drop trailing zero
  const val = Math.abs(speed).toFixed(1).replace(/\.0$/, '');
  return `${sign}${speed < 0 ? '-' : ''}${val}\u00d7`;
}

// Calculate default speed for a layer based on its position in the stack.
// Layer 0 (furthest back) gets the most movement, last layer (front) gets 0.
export function defaultSpeedForLayer(index: number, count: number): number {
  if (count <= 1) return 0;
  const t = 1 - index / (count - 1);
  return Math.round(t * 15) / 10; // 0 to 1.5
}

function getDefaults(count: number): LayerSettings[] {
  return Array.from({ length: count }, (_, i) => ({
    speed: defaultSpeedForLayer(i, count),
  }));
}

function isDefaultSettings(layers: LayerSettings[], count: number): boolean {
  const defaults = getDefaults(count);
  return layers.every((l, i) => (l.speed ?? 0) === defaults[i].speed);
}

// ─── Combined preview showing all layers ────────────────────────────────────

function LayerPreview({
  layers,
  mode,
  hasChanges,
  onReset,
}: {
  layers: LayerSettings[];
  mode: string;
  hasChanges: boolean;
  onReset: () => void;
}) {
  const [angle, setAngle] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      // Full rotation over 3 seconds
      const t = (now - startRef.current) / 3000;
      setAngle(t * Math.PI * 2);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const count = layers.length;
  // Layer 0 (back) is smallest, last layer (front) is largest
  const minW = 46;
  const maxW = 70;
  const minH = 26;
  const maxH = 40;
  const growW = count > 1 ? (maxW - minW) / (count - 1) : 0;
  const growH = count > 1 ? (maxH - minH) / (count - 1) : 0;

  return (
    <div>
      <div className={s.preview}>
        <div className={s.previewInner}>
          {layers.map((layer, i) => {
            const color = LAYER_COLORS[i % LAYER_COLORS.length];
            const w = minW + i * growW;
            const h = minH + i * growH;
            const speed = layer.speed ?? 0;
            const maxShift = 12;
            const shiftX = mode === 'mouse' ? speed * Math.cos(angle) * maxShift : 0;
            const shiftY = speed * Math.sin(angle) * maxShift;

            return (
              <div
                key={i}
                className={s.previewLayer}
                style={{
                  width: w,
                  height: h,
                  borderColor: color,
                  background: `${color}18`,
                  zIndex: i,
                  transform: `translate(${shiftX}px, ${shiftY}px)`,
                  transition: 'none',
                }}
              >
                <span className={s.previewLabel} style={{ color }}>{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
      <SilkeBox vAlign="center" gap="xs" style={{ justifyContent: 'center', padding: '4px 0 0' }}>
        <SilkeTextMicro color="neutral-50">
          Layers move at different speeds to create depth
        </SilkeTextMicro>
        {hasChanges && <SilkeButton icon="redo" size="s" kind="ghost" onClick={onReset} />}
      </SilkeBox>
    </div>
  );
}

// ─── Individual layer card ──────────────────────────────────────────────────

function LayerCard({
  index,
  totalCount,
  settings,
  onChange,
  onReset,
}: {
  index: number;
  totalCount: number;
  settings: LayerSettings;
  onChange: (patch: Partial<LayerSettings>) => void;
  onReset: () => void;
}) {
  const speed = settings.speed ?? 0;
  const defSpeed = defaultSpeedForLayer(index, totalCount);
  const isModified = speed !== defSpeed;
  const color = LAYER_COLORS[index % LAYER_COLORS.length];

  // Map speed (-2 to 2) → slider (0 to 1) where 0.5 = no movement
  const sliderValue = (speed + 2) / 4;

  return (
    <SilkeBox column className={s.card} bg="surface-1" rounded="small">
      <div className={s.cardHeader}>
        <div className={s.layerDot} style={{ background: color }} />
        <SilkeTextSmall weight="strong" style={{ flex: 1 }}>
          Layer {index + 1}
        </SilkeTextSmall>
        {isModified && <SilkeButton icon="redo" size="s" kind="ghost" onClick={onReset} />}
      </div>
      <div className={s.cardBody}>
        <div className={s.sliderRow}>
          <span className={s.sliderLabel}>Speed</span>
          <div className={s.sliderTrack}>
            <SilkeSlider
              value={sliderValue}
              onChange={(v: number) => {
                // Map slider (0-1) → speed (-2 to 2), snap to 0 near center
                let newSpeed = v * 4 - 2;
                if (Math.abs(newSpeed) < 0.1) newSpeed = 0;
                onChange({ speed: Math.round(newSpeed * 10) / 10 });
              }}
            />
          </div>
          <span className={s.speedReadout}>{formatSpeed(speed)}</span>
        </div>
      </div>
    </SilkeBox>
  );
}

// ─── Main field ─────────────────────────────────────────────────────────────

type LayerFieldProps = {
  value: LayerSettings[];
  numberOfLayers: number;
  mode: string;
  onChange: (value: LayerSettings[]) => void;
};

export function LayerField({ value, numberOfLayers, mode, onChange }: LayerFieldProps) {
  const settings = Array.isArray(value) ? value : [];

  if (numberOfLayers <= 0) return null;

  const defaults = getDefaults(numberOfLayers);
  const allLayers = Array.from(
    { length: numberOfLayers },
    (_, i) => settings[i] || defaults[i],
  );
  const hasChanges = !isDefaultSettings(allLayers, numberOfLayers);

  const update = (index: number, patch: Partial<LayerSettings>) => {
    const next = [...allLayers];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const resetLayer = (index: number) => {
    const next = [...allLayers];
    next[index] = defaults[index];
    onChange(next);
  };

  const resetAll = () => {
    onChange(defaults);
  };

  return (
    <SilkeBox column gap="s">
      <LayerPreview layers={allLayers} mode={mode} hasChanges={hasChanges} onReset={resetAll} />
      {allLayers.map((layer, i) => (
        <LayerCard
          key={i}
          index={i}
          totalCount={numberOfLayers}
          settings={layer}
          onChange={(patch) => update(i, patch)}
          onReset={() => resetLayer(i)}
        />
      ))}
    </SilkeBox>
  );
}
