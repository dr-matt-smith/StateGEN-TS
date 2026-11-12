import type { Point } from "../model/geometry.ts";
import type { Box } from "./labels.ts";

// Which part of the diagram is on screen: how far it is panned, and how much it is zoomed. NEW - the Flash
// version had a zoom icon but no code. This only changes how the diagram is SHOWN: the states keep their
// diagram coordinates, so dragging, snapping, tidy up and game.xml work exactly as before.
//
//   screen = diagram * scale + pan        diagram = (screen - pan) / scale
//
// Screen points are relative to the top-left corner of the <svg>.

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4;
/** how much one press of the zoom +/- buttons zooms by */
export const ZOOM_STEP = 1.25;
/** the space left round the diagram by "fit" (screen pixels) */
const FIT_MARGIN = 40;

export class Viewport {
  scale = 1;
  panX = 0;
  panY = 0;

  /** The SVG transform that draws diagram coordinates at their place on screen. */
  get transform(): string {
    return `translate(${this.panX} ${this.panY}) scale(${this.scale})`;
  }

  toDiagram(screen: Point): Point {
    return { x: (screen.x - this.panX) / this.scale, y: (screen.y - this.panY) / this.scale };
  }

  toScreen(p: Point): Point {
    return { x: p.x * this.scale + this.panX, y: p.y * this.scale + this.panY };
  }

  /** Move the whole diagram by (dx, dy) screen pixels - dragging with the middle mouse button. */
  panBy(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
  }

  /** Pan (keeping the zoom) so diagram point `p` is in the middle of a width x height screen - the minimap. */
  centerOn(p: Point, width: number, height: number): void {
    this.panX = width / 2 - p.x * this.scale;
    this.panY = height / 2 - p.y * this.scale;
  }

  /** Zoom by `factor`, keeping the diagram point under `screen` (the mouse, or the middle) where it is. */
  zoomAt(screen: Point, factor: number): void {
    this.zoomTo(this.scale * factor, screen);
  }

  /** Zoom to `scale` (1 = 100%), keeping the diagram point under `screen` where it is. */
  zoomTo(scale: number, screen: Point): void {
    const fixed = this.toDiagram(screen);
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    this.panX = screen.x - fixed.x * this.scale;
    this.panY = screen.y - fixed.y * this.scale;
  }

  /**
   * Zoom as far in as possible (up to `maxScale`) with all of `bounds` (diagram coordinates) on a
   * `width` x `height` screen, and center it. `keepClear` is screen space down the right (the Tools palette).
   */
  fit(bounds: Box | null, width: number, height: number, keepClear = 0, maxScale = MAX_SCALE): void {
    if (!bounds) {
      this.scale = 1;
      this.panX = this.panY = 0;
      return;
    }
    const roomX = Math.max(1, width - keepClear - 2 * FIT_MARGIN);
    const roomY = Math.max(1, height - 2 * FIT_MARGIN);
    const scale = Math.min(roomX / Math.max(1, bounds.width), roomY / Math.max(1, bounds.height));
    this.scale = Math.min(maxScale, MAX_SCALE, Math.max(MIN_SCALE, scale));
    this.panX = (width - keepClear) / 2 - bounds.x * this.scale;
    this.panY = height / 2 - bounds.y * this.scale;
  }
}

/** The box (by its center) round everything in `boxes`, or null if there's nothing. */
export function boundsOf(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.x - b.width / 2));
  const right = Math.max(...boxes.map((b) => b.x + b.width / 2));
  const top = Math.min(...boxes.map((b) => b.y - b.height / 2));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height / 2));
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
}
