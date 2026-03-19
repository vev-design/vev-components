import React, { useEffect, useRef, useState } from "react";
import {
  SilkeBox,
  SilkeSlider,
  SilkeTextSmall,
  SilkeTextMicro,
  SilkeButton,
} from "@vev/silke";
import s from "./LayerField.module.css";

// ─── Types & constants ──────────────────────────────────────────────────────

export type LayerSettings = {
  speed: number;
};

const LAYER_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const SPEED_MIN = -2;
const SPEED_MAX = 2;
const SPEED_SNAP_THRESHOLD = 0.1;
const PREVIEW_CYCLE_MS = 3000;
const PREVIEW_MAX_SHIFT_PX = 12;

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatSpeed(speed: number): string {
  if (speed === 0) return "0\u00d7";
  const abs = Math.abs(speed).toFixed(1).replace(/\.0$/, "");
  return `${speed > 0 ? "+" : "\u2212"}${abs}\u00d7`;
}

/** Default speed for a layer: back layers (index 0) move most, front layers least. */
export function defaultSpeedForLayer(index: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round((1 - index / (count - 1)) * 15) / 10;
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

/** Map speed range to 0–1 slider value */
function speedToSlider(speed: number): number {
  return (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
}

/** Map 0–1 slider value to speed, with snap-to-zero */
function sliderToSpeed(v: number): number {
  let speed = v * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;
  if (Math.abs(speed) < SPEED_SNAP_THRESHOLD) speed = 0;
  return Math.round(speed * 10) / 10;
}

// ─── Preview ────────────────────────────────────────────────────────────────

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
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      setAngle(((now - startRef.current) / PREVIEW_CYCLE_MS) * Math.PI * 2);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const count = layers.length;
  const minSize = { w: 46, h: 26 };
  const maxSize = { w: 70, h: 40 };
  const stepW = count > 1 ? (maxSize.w - minSize.w) / (count - 1) : 0;
  const stepH = count > 1 ? (maxSize.h - minSize.h) / (count - 1) : 0;
  const isMouse = mode === "mouse";

  return (
    <div>
      <div className={s.preview}>
        <div className={s.previewInner}>
          {layers.map((layer, i) => {
            const color = LAYER_COLORS[i % LAYER_COLORS.length];
            const speed = layer.speed ?? 0;
            const shiftX = isMouse ? speed * Math.cos(angle) * PREVIEW_MAX_SHIFT_PX : 0;
            const shiftY = speed * Math.sin(angle) * PREVIEW_MAX_SHIFT_PX;

            return (
              <div
                key={i}
                className={s.previewLayer}
                style={{
                  width: minSize.w + i * stepW,
                  height: minSize.h + i * stepH,
                  borderColor: color,
                  background: `${color}18`,
                  zIndex: i,
                  transform: `translate(${shiftX}px, ${shiftY}px)`,
                }}
              >
                <span className={s.previewLabel} style={{ color }}>
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <SilkeBox
        vAlign="center"
        gap="xs"
        style={{ justifyContent: "center", padding: "4px 0 0" }}
      >
        <SilkeTextMicro color="neutral-50">
          Layers move at different speeds to create depth
        </SilkeTextMicro>
        {hasChanges && (
          <SilkeButton icon="redo" size="s" kind="ghost" onClick={onReset} />
        )}
      </SilkeBox>
    </div>
  );
}

// ─── Layer card ─────────────────────────────────────────────────────────────

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
  onChange: (speed: number) => void;
  onReset: () => void;
}) {
  const speed = settings.speed ?? 0;
  const isModified = speed !== defaultSpeedForLayer(index, totalCount);
  const color = LAYER_COLORS[index % LAYER_COLORS.length];

  return (
    <SilkeBox column className={s.card} bg="surface-1" rounded="small">
      <div className={s.cardHeader}>
        <div className={s.layerDot} style={{ background: color }} />
        <SilkeTextSmall weight="strong" style={{ flex: 1 }}>
          Layer {index + 1}
        </SilkeTextSmall>
        {isModified && (
          <SilkeButton icon="redo" size="s" kind="ghost" onClick={onReset} />
        )}
      </div>
      <div className={s.cardBody}>
        <div className={s.sliderRow}>
          <span className={s.sliderLabel}>Speed</span>
          <div className={s.sliderTrack}>
            <SilkeSlider
              value={speedToSlider(speed)}
              onChange={(v: number) => onChange(sliderToSpeed(v))}
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

export function LayerField({
  value,
  numberOfLayers,
  mode,
  onChange,
}: LayerFieldProps) {
  if (numberOfLayers <= 0) return null;

  const defaults = getDefaults(numberOfLayers);
  const layers = Array.from(
    { length: numberOfLayers },
    (_, i) => (Array.isArray(value) ? value : [])[i] || defaults[i]
  );
  const hasChanges = !isDefaultSettings(layers, numberOfLayers);

  const updateSpeed = (index: number, speed: number) => {
    const next = [...layers];
    next[index] = { speed };
    onChange(next);
  };

  const resetLayer = (index: number) => {
    const next = [...layers];
    next[index] = defaults[index];
    onChange(next);
  };

  return (
    <SilkeBox column gap="s">
      <LayerPreview
        layers={layers}
        mode={mode}
        hasChanges={hasChanges}
        onReset={() => onChange(defaults)}
      />
      {layers.map((layer, i) => (
        <LayerCard
          key={i}
          index={i}
          totalCount={numberOfLayers}
          settings={layer}
          onChange={(speed) => updateSpeed(i, speed)}
          onReset={() => resetLayer(i)}
        />
      ))}
    </SilkeBox>
  );
}
