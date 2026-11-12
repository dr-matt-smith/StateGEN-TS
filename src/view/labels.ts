import type { Point } from "../model/geometry.ts";

// Where to draw the arrows' labels, so they don't sit on top of each other. NEW.
//
// A label's usual place is just above the middle of its arrow. If that would overlap a label already
// placed, it slides along its own arrow (so it still clearly belongs to it), or drops just below the
// arrow, a step at a time, until it is clear. Two parallel arrows (A->B and B->A) then get their labels
// one above the other instead of on top of each other. It also tries not to cover a state.

/** A label to place: the arrow it belongs to, and how big it is. */
export interface LabelRequest {
  from: Point;
  to: Point;
  width: number;
  height: number;
}

/** A box, by its center. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** how far above (or below) the arrow's middle a label's center goes */
const ABOVE = 17;
/** how far a label slides along its arrow in one step */
const STEP = 12;
const GAP = 2;

/** The center of each label, in the same order as the requests. `avoid` boxes (the states) are avoided if possible. */
export function placeLabels(requests: LabelRequest[], avoid: Box[] = []): Point[] {
  const placed: Box[] = [];
  return requests.map((r) => {
    const dx = r.to.x - r.from.x;
    const dy = r.to.y - r.from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const middle = { x: (r.from.x + r.to.x) / 2, y: (r.from.y + r.to.y) / 2 };
    // stay on the middle part of the arrow, away from its ends
    const reach = Math.max(0, length / 2 - 16);

    let best = null as { box: Box; cost: number } | null;
    for (let step = 0; step * STEP <= reach; step++) {
      for (const along of step === 0 ? [0] : [step * STEP, -step * STEP]) {
        for (const below of [false, true]) {
          const box = {
            x: middle.x + ux * along,
            y: middle.y + uy * along + (below ? ABOVE : -ABOVE),
            width: r.width,
            height: r.height,
          };
          if (placed.some((p) => overlaps(p, box))) continue;
          const cost = Math.abs(along) + (below ? 20 : 0) + (avoid.some((a) => overlaps(a, box)) ? 1000 : 0);
          if (!best || cost < best.cost) best = { box, cost };
        }
      }
      if (best && best.cost < (step + 1) * STEP) break; // nothing further along could be nearer
    }
    // nowhere clear: leave it in the usual place
    const box = best?.box ?? { x: middle.x, y: middle.y - ABOVE, width: r.width, height: r.height };
    placed.push(box);
    return { x: box.x, y: box.y };
  });
}

function overlaps(a: Box, b: Box): boolean {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + GAP && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + GAP;
}
