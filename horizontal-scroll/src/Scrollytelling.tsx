// import React, { useEffect, useRef } from 'react';
enum Transitions {
  fade = "fade",
  horizontalScroll = "horizontalScroll",
  stack = "stack",
  clip = "clip",
}

// type ScrollytellingProps = {};

// export function Scrollytelling({}:ScrollytellingProps) {
//  return ();
// }

// function Slide({
//   id,
//   disabled,
//   selected,
//   index,
//   transition,
//   timeline,
//   totalCount,
// }: {
//   id: string;
//   disabled: boolean;
//   selected: boolean;
//   transition: Transitions;
//   index: number;
//   totalCount: number;
//   timeline: ViewTimeline;
// }) {
//   const ref = useRef<HTMLDivElement>();
//   useEffect(() => {
//     const el = ref.current;
//     console.log("#########", index, transition, timeline);
//     if (!timeline || !el) return;

//     const enterCrossing = {
//       rangeName: "entry-crossing",
//       offset: CSS.percent(100),
//     };

//     const exitCrossing = {
//       rangeName: "exit-crossing",
//       offset: CSS.percent(0),
//     };
//     const isLessThanViewport = false;
//     const keyframes: Keyframe[] = [];

//     if (transition === Transitions.fade && index > 0) {
//       keyframes.push(
//         {
//           offset: index / 3,
//           opacity: 0,
//         },
//         {
//           offset: (index + 1) / 3,
//           opacity: 1,
//         }
//       );
//     } else if (transition === Transitions.clip && index > 0) {
//       const clipPath = CLIP_PATHS_FRAMES["rectBottom"];
//       const startOffset = index / totalCount;
//       const endOffset = (index + 1) / totalCount;
//       const stepSize = (endOffset - startOffset) / clipPath.length;

//       keyframes.push(
//         ...clipPath.map((clip, offsetIndex) => ({
//           offset: startOffset + stepSize * offsetIndex,
//           clipPath: clip,
//         }))
//       );
//       if (keyframes[0].offset !== 0)
//         keyframes.unshift({ offset: 0, clipPath: clipPath[0] });
//       if (keyframes[keyframes.length - 1].offset !== 1)
//         keyframes.push({ clipPath: clipPath[clipPath.length], offset: 1 });
//     }
//     if (keyframes.length === 0) return;

//     const animation = el.animate(keyframes, {
//       fill: "both",
//       timeline,
//       duration: "auto",
//       easing: "linear",
//       rangeStart: isLessThanViewport ? enterCrossing : exitCrossing,
//       rangeEnd: isLessThanViewport ? exitCrossing : enterCrossing,
//     });
//     return () => {
//       animation.cancel();
//     };
//   }, [transition, index, timeline, totalCount]);

//   const fixedPos =
//     transition === Transitions.clip || transition === Transitions.fade;

//   return (
//     <div
//       ref={ref}
//       key={id}
//       className={styles.content}
//       style={{
//         // marginTop: fixedPos ? -index * 100 + "vh" : null,
//         // marginTop: transition === Transitions.stack ? `${index * 100}vh` : null,
//         zIndex: index,
//         filter: !disabled || selected ? null : "blur(4px)",
//         opacity: !disabled || selected ? null : 0.5,
//         position: disabled ? "static" : null,
//       }}
//     >
//       <WidgetNode id={id} />
//     </div>
//   );
// }

// registerVevComponent(HorizontalScroll, {
//   name: "HorizontalScroll",
//   props: [
//     {
//       name: "transition",
//       type: "select",
//       initialValue: Transitions.horizontalScroll,
//       options: {
//         items: [
//           { label: "Horizontal", value: Transitions.horizontalScroll },
//           { label: "Fade", value: Transitions.fade },
//           { label: "Stack", value: Transitions.stack },
//           { label: "Clip", value: Transitions.clip },
//         ],
//       },
//     },
//   ],
//   children: {
//     name: "Slide",
//   },
//   editableCSS: [
//     {
//       selector: styles.wrapper,
//       properties: ["background"],
//     },
//   ],
//   type: "section",
// });

// const CLIP_PATHS_FRAMES = {
//   circle: ["circle(0% at 50% 50%)", "circle(100% at 50% 50%)"],
//   rhombus: [
//     "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)",
//     "polygon(50% -50%, 150% 50%, 50% 150%, -50% 50%)",
//   ],
//   rectBottom: ["inset(100% 0 0 0)", "inset(0 0 0 0)"],
//   rectTop: ["inset(0 0 100% 0)", "inset(0 0 0 0)"],
//   rectLeft: ["inset(0 100% 0 0)", "inset(0 0 0 0)"],
//   rectRight: ["inset(0 0 0 100%)", "inset(0 0 0 0)"],
//   rectCenter: ["inset(50% 0 50% 0)", "inset(0 0 0 0)"],
//   hexagon: [
//     "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)",
//     "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)",
//     "polygon(50% 0%, 100% 0, 100% 60%, 100% 100%, 0 100%, 0% 60%, 0 0)",
//   ],
// };
