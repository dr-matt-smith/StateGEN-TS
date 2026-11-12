import type { Diagram } from "../model/Diagram.ts";
import { Compass, type Point } from "../model/geometry.ts";
import type { Box } from "./labels.ts";
import { boundsOf, type Viewport } from "./Viewport.ts";

// The minimap (NEW, after son-of-fungus-JS's minimap.js): a small picture of the whole diagram in the
// bottom-right corner, with a red box showing the part that is on screen. Click or drag on it to move the
// view there. Like pan and zoom, it only changes how the diagram is SHOWN, so it isn't part of the editor's
// state machine.

/** the minimap's size on screen (pixels) - its <svg> in index.html is this size */
export const MINIMAP_WIDTH = 200;
export const MINIMAP_HEIGHT = 150;
/** space (diagram pixels) left round the diagram on the minimap */
const PADDING = 60;

/** How the minimap shows the diagram:  minimap point = diagram point * scale + (x, y) */
export interface MinimapMapping {
  scale: number;
  x: number;
  y: number;
}

/** Fit `bounds` (plus some space round it) into a width x height minimap, centered. */
export function minimapMapping(bounds: Box, width: number, height: number): MinimapMapping {
  const w = bounds.width + 2 * PADDING;
  const h = bounds.height + 2 * PADDING;
  const scale = Math.min(width / w, height / h);
  return { scale, x: width / 2 - bounds.x * scale, y: height / 2 - bounds.y * scale };
}

/** a point on the minimap -> the diagram point it shows */
export function minimapToDiagram(m: MinimapMapping, p: Point): Point {
  return { x: (p.x - m.x) / m.scale, y: (p.y - m.y) / m.scale };
}

export class Minimap {
  private mapping: MinimapMapping | null = null;

  /**
   * @param svg where to draw it
   * @param box what to hide while the diagram is empty (the minimap and its minimise button)
   */
  constructor(private readonly svg: SVGSVGElement, private readonly box: HTMLElement | SVGSVGElement = svg) {}

  /**
   * Draw the diagram, and the box showing what is on a screenWidth x screenHeight screen at the moment.
   * The minimap is hidden while the diagram is empty.
   */
  draw(diagram: Diagram, viewport: Viewport, screenWidth: number, screenHeight: number): void {
    const boxes: Box[] = [...diagram.states];
    for (const c of diagram.connectors) {
      for (const p of [c.start.point, c.end.point]) boxes.push({ x: p.x, y: p.y, width: 0, height: 0 });
    }
    const bounds = boundsOf(boxes);
    this.box.style.display = bounds ? "" : "none";
    if (!bounds) {
      this.mapping = null;
      return;
    }
    const m = minimapMapping(bounds, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    this.mapping = m;

    let s = "";
    for (const c of diagram.connectors) {
      const p1 = c.start.point;
      const p2 = c.end.point;
      const q = c.control;
      s += c.isCurved
        ? `<path class="mm-connector" d="M${p1.x} ${p1.y} Q${q.x} ${q.y} ${p2.x} ${p2.y}"/>`
        : `<path class="mm-connector" d="M${p1.x} ${p1.y} L${p2.x} ${p2.y}"/>`;
    }
    for (const state of diagram.states) {
      if (state.isChoice) {
        const points = [Compass.NORTH, Compass.EAST, Compass.SOUTH, Compass.WEST].map((c) => state.compassPoint(c));
        s += `<polygon class="mm-choice" points="${points.map((p) => `${p.x},${p.y}`).join(" ")}"/>`;
      } else if (state.isInitial) {
        s += `<circle class="mm-initial" cx="${state.x}" cy="${state.y}" r="${state.width / 2}"/>`;
      } else if (state.isTerminate) {
        const d = state.width * 0.35;
        s += `<path class="mm-terminate" d="M${state.x - d} ${state.y - d} L${state.x + d} ${state.y + d} ` +
          `M${state.x + d} ${state.y - d} L${state.x - d} ${state.y + d}"/>`;
      } else if (state.isFinal) {
        s += `<circle class="mm-final" cx="${state.x}" cy="${state.y}" r="${state.width / 2}"/>`;
      } else {
        s += `<rect class="mm-state" x="${state.x - state.width / 2}" y="${state.y - state.height / 2}" ` +
          `width="${state.width}" height="${state.height}" rx="${state.cornerRadius}"/>`;
      }
    }
    // what is on screen now
    const topLeft = viewport.toDiagram({ x: 0, y: 0 });
    const bottomRight = viewport.toDiagram({ x: screenWidth, y: screenHeight });
    s += `<rect class="mm-view" x="${topLeft.x}" y="${topLeft.y}" width="${bottomRight.x - topLeft.x}" ` +
      `height="${bottomRight.y - topLeft.y}"/>`;
    this.svg.innerHTML = `<g transform="translate(${m.x} ${m.y}) scale(${m.scale})">${s}</g>`;
  }

  /** The diagram point shown at a mouse event's position on the minimap (null if nothing is shown). */
  toDiagram(e: { clientX: number; clientY: number }): Point | null {
    if (!this.mapping) return null;
    const r = this.svg.getBoundingClientRect();
    return minimapToDiagram(this.mapping, { x: e.clientX - r.left, y: e.clientY - r.top });
  }
}
