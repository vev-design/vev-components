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

function getLayerSpeed(
  layerSettings: LayerSettings[] | undefined,
  index: number,
  totalCount: number
): number {
  return (
    layerSettings?.[index]?.speed ?? defaultSpeedForLayer(index, totalCount)
  );
}

const PREVIEW_DEBOUNCE_MS = 150;
const PREVIEW_DURATION_MS = 2000;

// Attempt smooth ease-in-out by remapping linear t through a sine curve
function easeInOut(t: number): number {
  return 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
}

const Parallax3D = ({
  children = [],
  hostRef,
  mode = "scroll",
  autoScale = true,
  layerSettings,
}: Props) => {
  const { disabled: editorDisabled, activeContentChild } = useEditorState();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationRef = useRef<number | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const previewCancelledRef = useRef(false);

  const applyTransform = useCallback(
    (normalizedX: number, normalizedY: number) => {
      const wrapper = wrapperRef.current;
      children.forEach((childKey, index) => {
        const el = layerRefs.current[index];
        if (!el) return;

        // Skip the actively edited layer — keep it at identity transform
        if (
          editorDisabled &&
          activeContentChild &&
          childKey === activeContentChild
        ) {
          el.style.transform = "";
          return;
        }

        const speed = getLayerSpeed(layerSettings, index, children.length);
        // Scroll mode: vertical only. Mouse mode: both axes.
        const maxPx = 50;
        const moveX = mode === "mouse" ? speed * normalizedX * maxPx : 0;
        const moveY = speed * normalizedY * maxPx;

        if (autoScale && wrapper && Math.abs(speed) > 0) {
          // Scale up just enough so edges stay hidden at max displacement
          const maxMoveX = mode === "mouse" ? Math.abs(speed) * maxPx : 0;
          const maxMoveY = Math.abs(speed) * maxPx;
          const scaleX =
            wrapper.offsetWidth > 0
              ? 1 + (maxMoveX * 2) / wrapper.offsetWidth
              : 1;
          const scaleY =
            wrapper.offsetHeight > 0
              ? 1 + (maxMoveY * 2) / wrapper.offsetHeight
              : 1;
          const scale = Math.max(scaleX, scaleY);
          el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(${scale})`;
        } else {
          el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        }
      });
    },
    [
      children,
      layerSettings,
      mode,
      autoScale,
      editorDisabled,
      activeContentChild,
    ]
  );

  // Cancel any running editor preview animation
  const cancelPreview = useCallback(() => {
    previewCancelledRef.current = true;
    if (previewDebounceRef.current !== null) {
      clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = null;
    }
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
  }, []);

  // Editor preview: animate from max → center → min → center when settings change
  useEffect(() => {
    if (!editorDisabled) return;

    cancelPreview();
    previewCancelledRef.current = false;

    previewDebounceRef.current = setTimeout(() => {
      previewDebounceRef.current = null;
      const start = performance.now();

      const tick = (now: number) => {
        if (previewCancelledRef.current) return;

        const elapsed = now - start;
        const t = Math.min(elapsed / PREVIEW_DURATION_MS, 1);
        const angle = t * Math.PI * 2;

        if (mode === "mouse") {
          // Circular motion: cos/sin offset by 90° for X/Y
          applyTransform(Math.cos(angle), Math.sin(angle));
        } else {
          // Scroll mode: vertical sweep with ease-in-out
          const eased = easeInOut(t);
          applyTransform(0, 1 - 2 * eased);
        }

        if (t < 1) {
          previewRafRef.current = requestAnimationFrame(tick);
        } else {
          previewRafRef.current = null;
          // Reset to neutral
          applyTransform(0, 0);
        }
      };

      previewRafRef.current = requestAnimationFrame(tick);
    }, PREVIEW_DEBOUNCE_MS);

    return cancelPreview;
  }, [editorDisabled, layerSettings, mode, applyTransform, cancelPreview]);

  // Mouse-based parallax
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (!wrapper || mode !== "mouse") return;

      const rect = wrapper.getBoundingClientRect();
      const centerX = Math.max(
        -1,
        Math.min(1, -((e.clientX - rect.left) / rect.width - 0.5) * 2)
      );
      const centerY = Math.max(
        -1,
        Math.min(1, -((e.clientY - rect.top) / rect.height - 0.5) * 2)
      );

      applyTransform(centerX, centerY);
    },
    [mode, applyTransform]
  );

  // Scroll-based parallax
  const updateScrollParallax = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || mode !== "scroll") return;

    const rect = wrapper.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const elementCenter = rect.top + rect.height / 2;
    const viewportCenter = viewportHeight / 2;
    const progress = Math.max(
      -1,
      Math.min(1, ((viewportCenter - elementCenter) / viewportHeight) * 2)
    );

    applyTransform(0, progress);
  }, [mode, applyTransform]);

  // Scroll handler with rAF throttling
  const handleScroll = useCallback(() => {
    if (animationRef.current !== null) return;
    animationRef.current = requestAnimationFrame(() => {
      updateScrollParallax();
      animationRef.current = null;
    });
  }, [updateScrollParallax]);

  useEffect(() => {
    if (editorDisabled) return;

    if (mode === "mouse") {
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }

    if (mode === "scroll") {
      updateScrollParallax();
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [
    mode,
    handleMouseMove,
    handleScroll,
    updateScrollParallax,
    editorDisabled,
  ]);

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
            opacity:
              editorDisabled && activeContentChild
                ? childKey === activeContentChild
                  ? 1
                  : 0.2
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
  name: "3D Parallax",
  transform: {
    height: "auto",
  },
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
      component: ({ value, onChange, context }) => {
        return (
          <LayerField
            value={value as any}
            numberOfLayers={context.value?.children?.length || 0}
            mode={context.value?.mode || "scroll"}
            onChange={onChange}
          />
        );
      },
      of: [{ type: "string", name: "speed" }],
    },
  ],
  children: {
    name: "Layer",
  },
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background", "border", "filter"],
    },
  ],
  type: "both",
});
