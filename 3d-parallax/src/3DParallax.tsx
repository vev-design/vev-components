import React, { useCallback, useEffect, useRef } from "react";
import styles from "./3DParallax.module.css";
import { registerVevComponent, useEditorState, WidgetNode } from "@vev/react";
import { LayerField, LayerSettings, defaultSpeedForLayer } from "./LayerField";

type ParallaxMode = "scroll" | "mouse";

type Props = {
  children: string[];
  hostRef: React.RefObject<HTMLDivElement>;
  mode: ParallaxMode;
  autoScale: boolean;
  layerSettings?: LayerSettings[];
};

const MAX_DISPLACEMENT_PX = 50;
const PREVIEW_DEBOUNCE_MS = 150;
const PREVIEW_DURATION_MS = 2000;
const INACTIVE_LAYER_OPACITY = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getLayerSpeed(
  layerSettings: LayerSettings[] | undefined,
  index: number,
  totalCount: number
): number {
  return (
    layerSettings?.[index]?.speed ?? defaultSpeedForLayer(index, totalCount)
  );
}

function calculateAutoScale(
  speed: number,
  mode: ParallaxMode,
  wrapperWidth: number,
  wrapperHeight: number
): number {
  const absSpeed = Math.abs(speed);
  const maxMoveX = mode === "mouse" ? absSpeed * MAX_DISPLACEMENT_PX : 0;
  const maxMoveY = absSpeed * MAX_DISPLACEMENT_PX;
  const scaleX = wrapperWidth > 0 ? 1 + (maxMoveX * 2) / wrapperWidth : 1;
  const scaleY = wrapperHeight > 0 ? 1 + (maxMoveY * 2) / wrapperHeight : 1;
  return Math.max(scaleX, scaleY);
}

/** Sine-based easing for a full 0→1→0 cycle */
function easeFullCycle(t: number): number {
  return 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
}

const Parallax3D = ({
  children = [],
  mode = "scroll",
  autoScale = true,
  layerSettings,
}: Props) => {
  const { disabled: editorDisabled, activeContentChild } = useEditorState();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRafRef = useRef<number | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const previewCancelledRef = useRef(false);

  const applyTransform = useCallback(
    (normalizedX: number, normalizedY: number) => {
      const wrapper = wrapperRef.current;
      children.forEach((childKey, index) => {
        const el = layerRefs.current[index];
        if (!el) return;

        if (
          editorDisabled &&
          activeContentChild &&
          childKey === activeContentChild
        ) {
          el.style.transform = "";
          return;
        }

        const speed = getLayerSpeed(layerSettings, index, children.length);
        const moveX =
          mode === "mouse" ? speed * normalizedX * MAX_DISPLACEMENT_PX : 0;
        const moveY = speed * normalizedY * MAX_DISPLACEMENT_PX;

        if (autoScale && wrapper && speed !== 0) {
          const scale = calculateAutoScale(
            speed,
            mode,
            wrapper.offsetWidth,
            wrapper.offsetHeight
          );
          el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(${scale})`;
        } else {
          el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        }
      });
    },
    [children, layerSettings, mode, autoScale, editorDisabled, activeContentChild]
  );

  // ── Editor preview animation ──────────────────────────────────────────────

  const cancelPreview = useCallback(() => {
    previewCancelledRef.current = true;
    if (previewTimerRef.current !== null) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!editorDisabled) return;

    cancelPreview();
    previewCancelledRef.current = false;

    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      const start = performance.now();

      const tick = (now: number) => {
        if (previewCancelledRef.current) return;

        const t = Math.min((now - start) / PREVIEW_DURATION_MS, 1);
        const angle = t * Math.PI * 2;

        if (mode === "mouse") {
          applyTransform(Math.cos(angle), Math.sin(angle));
        } else {
          applyTransform(0, 1 - 2 * easeFullCycle(t));
        }

        if (t < 1) {
          previewRafRef.current = requestAnimationFrame(tick);
        } else {
          previewRafRef.current = null;
          applyTransform(0, 0);
        }
      };

      previewRafRef.current = requestAnimationFrame(tick);
    }, PREVIEW_DEBOUNCE_MS);

    return cancelPreview;
  }, [editorDisabled, layerSettings, mode, applyTransform, cancelPreview]);

  // ── Live parallax ─────────────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (!wrapper || mode !== "mouse") return;

      const rect = wrapper.getBoundingClientRect();
      const x = clamp(-((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      const y = clamp(-((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);

      applyTransform(x, y);
    },
    [mode, applyTransform]
  );

  const updateScrollParallax = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || mode !== "scroll") return;

    const rect = wrapper.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const elementCenter = rect.top + rect.height / 2;
    const progress = clamp(
      ((viewportCenter - elementCenter) / window.innerHeight) * 2,
      -1,
      1
    );

    applyTransform(0, progress);
  }, [mode, applyTransform]);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      updateScrollParallax();
      scrollRafRef.current = null;
    });
  }, [updateScrollParallax]);

  useEffect(() => {
    if (editorDisabled) return;

    if (mode === "mouse") {
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }

    updateScrollParallax();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [mode, handleMouseMove, handleScroll, updateScrollParallax, editorDisabled]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isEditing = editorDisabled && !!activeContentChild;

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      {children.map((childKey, index) => (
        <div
          key={childKey}
          className={styles.layer}
          ref={(el) => {
            layerRefs.current[index] = el;
          }}
          style={{
            zIndex: index,
            opacity: isEditing
              ? childKey === activeContentChild ? 1 : INACTIVE_LAYER_OPACITY
              : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <WidgetNode id={childKey} />
        </div>
      ))}
    </div>
  );
};

export default Parallax3D;

registerVevComponent(Parallax3D, {
  name: "Layered Parallax",
  transform: { height: "auto" },
  props: [
    {
      type: "select",
      name: "mode",
      title: "Parallax mode",
      initialValue: "scroll",
      options: {
        display: "dropdown",
        items: [
          { label: "Scroll", value: "scroll" },
          { label: "Mouse", value: "mouse" },
        ],
      },
    },
    {
      type: "boolean",
      name: "autoScale",
      title: "Auto scale layers",
      description:
        "Scale layers up to prevent edges from showing during movement",
      initialValue: true,
    },
    {
      type: "array",
      name: "layerSettings",
      title: "Layer settings",
      component: ({ value, onChange, context }) => (
        <LayerField
          value={value as any}
          numberOfLayers={context.value?.children?.length || 0}
          mode={context.value?.mode || "scroll"}
          onChange={onChange}
        />
      ),
      of: [{ type: "string", name: "speed" }],
    },
  ],
  children: { name: "Layer" },
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background", "border", "filter"],
    },
  ],
  type: "both",
});
