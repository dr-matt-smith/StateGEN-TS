import { DiagramState, type ShapeKind } from "./DiagramState.ts";
import { Compass, type Point } from "./geometry.ts";

/**
 * A UML choice (decision) point: the diamond. NEW - not in the Flash version.
 *
 * One arrow comes in (with an event, e.g. CRANK_TURNED), and several arrows go out, each with a guard
 * condition, e.g. [gumballs > 0] and [gumballs = 0] (or [else]). A choice isn't a real state - the game never
 * waits in it. When the diagram is exported, "event into the choice" + "guarded arrow out of it" become one
 * guarded transition straight from the state before the choice to the state after it (see Transitions.ts).
 *
 * It is a subclass of DiagramState so that everything that works on a state box - dragging, snapping
 * connectors to it, deleting it - works on a choice too. Only its shape is different.
 */
export class ChoicePoint extends DiagramState {
  static readonly CHOICE_WIDTH = 96;
  static readonly CHOICE_HEIGHT = 64;

  override get width(): number {
    return ChoicePoint.CHOICE_WIDTH;
  }
  override get height(): number {
    return ChoicePoint.CHOICE_HEIGHT;
  }

  override get kind(): ShapeKind {
    return "choice";
  }

  /** inside the diamond: |dx| / (w/2) + |dy| / (h/2) <= 1 */
  override contains(p: Point): boolean {
    return Math.abs(p.x - this.x) / (this.width / 2) + Math.abs(p.y - this.y) / (this.height / 2) <= 1;
  }

  /** N/S/E/W are the diamond's 4 corners; the diagonals are half way along its 4 sides. */
  override compassPoint(compass: Compass): Point {
    const w = this.width / 2;
    const h = this.height / 2;
    switch (compass) {
      case Compass.NORTH:
        return { x: this.x, y: this.y - h };
      case Compass.SOUTH:
        return { x: this.x, y: this.y + h };
      case Compass.EAST:
        return { x: this.x + w, y: this.y };
      case Compass.WEST:
        return { x: this.x - w, y: this.y };
      case Compass.NORTH_EAST:
        return { x: this.x + w / 2, y: this.y - h / 2 };
      case Compass.NORTH_WEST:
        return { x: this.x - w / 2, y: this.y - h / 2 };
      case Compass.SOUTH_EAST:
        return { x: this.x + w / 2, y: this.y + h / 2 };
      case Compass.SOUTH_WEST:
        return { x: this.x - w / 2, y: this.y + h / 2 };
      case Compass.CENTER:
        return { x: this.x, y: this.y };
    }
  }

  /** Where a line from the center toward `target` crosses the diamond's edge. */
  override outlinePointToward(target: Point): Point {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return this.compassPoint(Compass.NORTH);
    const ux = dx / length;
    const uy = dy / length;
    const t = 1 / (Math.abs(ux) / (this.width / 2) + Math.abs(uy) / (this.height / 2));
    return { x: this.x + t * ux, y: this.y + t * uy };
  }
}
