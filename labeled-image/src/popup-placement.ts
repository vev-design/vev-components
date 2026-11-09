interface Size {
  width: number;
  height: number;
}

interface PlacePopupArgs {
  /** Centre of the hotspot, relative to the component's top-left */
  anchor: { x: number; y: number };
  hotspot: Size;
  popup: Size;
  /** The component box. The popup must stay inside it, or the component clips it. */
  box: Size;
  gap?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Top-left of a popup next to its hotspot, never on top of it: below, else above, else right,
 * else left. If no side fits, the side with the most room is used and the popup is clamped
 * into the box.
 */
export function placePopup({ anchor, hotspot, popup, box, gap = 8 }: PlacePopupArgs) {
  const maxX = Math.max(0, box.width - popup.width);
  const maxY = Math.max(0, box.height - popup.height);
  const centredX = clamp(anchor.x - popup.width / 2, 0, maxX);
  const centredY = clamp(anchor.y - popup.height / 2, 0, maxY);

  const sides = [
    {
      room: box.height - (anchor.y + hotspot.height / 2 + gap),
      size: popup.height,
      pos: { x: centredX, y: anchor.y + hotspot.height / 2 + gap },
    },
    {
      room: anchor.y - hotspot.height / 2 - gap,
      size: popup.height,
      pos: { x: centredX, y: anchor.y - hotspot.height / 2 - gap - popup.height },
    },
    {
      room: box.width - (anchor.x + hotspot.width / 2 + gap),
      size: popup.width,
      pos: { x: anchor.x + hotspot.width / 2 + gap, y: centredY },
    },
    {
      room: anchor.x - hotspot.width / 2 - gap,
      size: popup.width,
      pos: { x: anchor.x - hotspot.width / 2 - gap - popup.width, y: centredY },
    },
  ];

  const side =
    sides.find((s) => s.room >= s.size) ||
    sides.reduce((best, s) => (s.room / s.size > best.room / best.size ? s : best));

  return { x: clamp(side.pos.x, 0, maxX), y: clamp(side.pos.y, 0, maxY) };
}
