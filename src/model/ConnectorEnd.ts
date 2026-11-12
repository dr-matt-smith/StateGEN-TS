import type { DiagramState } from "./DiagramState.ts";
import { Compass, type Point } from "./geometry.ts";

/**
 * One end (start or end) of a connector - "ConnectorPoint" in the Flash version.
 *
 * An end is either FLOATING at a point on the diagram, or snapped to one of the compass points of a state
 * (or to its CENTER).
 * The Flash version stored the state's *instance name* here, which caused the "anonymous STATE_" bug in
 * readme.txt when a state was deleted; here we keep a reference to the DiagramState object instead
 * (the fix the programmer's notes suggested).
 */
export class ConnectorEnd {
  private floatingAt: Point;
  private snappedTo: { state: DiagramState; compass: Compass } | null = null;
  /** the connector's other end - a CENTER end needs it to know which way to point */
  otherEnd: ConnectorEnd | null = null;
  /** NEW: where a curved connector bends towards (null: it's straight) - a CENTER end points that way */
  curveControl: () => Point | null = () => null;

  constructor(p: Point) {
    this.floatingAt = { x: p.x, y: p.y };
  }

  /**
   * Where this end is drawn right now. A CENTER end is drawn where the line crosses the state's outline,
   * so the arrow head isn't hidden under the state (and the end can still be grabbed).
   */
  get point(): Point {
    if (!this.snappedTo) return this.floatingAt;
    const { state, compass } = this.snappedTo;
    if (compass !== Compass.CENTER) return state.compassPoint(compass);
    const other = this.curveControl() ?? this.otherEnd?.aimPoint ?? { x: state.x + 1, y: state.y };
    return state.outlinePointToward(other);
  }

  /** The point the other end should aim at: a CENTER end aims at its state's center. */
  get aimPoint(): Point {
    if (this.snappedTo?.compass === Compass.CENTER) return this.snappedTo.state.compassPoint(Compass.CENTER);
    return this.point;
  }

  /** The state this end is attached to, or null if floating. */
  get state(): DiagramState | null {
    return this.snappedTo?.state ?? null;
  }

  get compass(): Compass | null {
    return this.snappedTo?.compass ?? null;
  }

  get isFloating(): boolean {
    return this.snappedTo === null;
  }

  floatAt(p: Point): void {
    this.floatingAt = { x: p.x, y: p.y };
    this.snappedTo = null;
  }

  /** Attach to a compass point of `state` - or its CENTER, if that shape has no such point (e.g. the dots). */
  snapTo(state: DiagramState, compass: Compass): void {
    if (compass !== Compass.CENTER && !state.snapPoints.includes(compass)) compass = Compass.CENTER;
    this.snappedTo = { state, compass };
  }

  /** Leave a snapped end floating where it is now - updateConnectorPoints() in the Flash version. */
  unsnap(): void {
    this.floatAt(this.point);
  }

  moveBy(dx: number, dy: number): void {
    const p = this.point;
    this.floatAt({ x: p.x + dx, y: p.y + dy });
  }
}
