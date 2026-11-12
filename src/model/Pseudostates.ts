import { DiagramState, type ShapeKind } from "./DiagramState.ts";
import { Compass, type Point } from "./geometry.ts";

/**
 * A round shape on the diagram: the UML initial dot and final bullseye. NEW - the Flash version's toolbar
 * had icons for these ("new initial state", "new terminal state") but no code behind them.
 *
 * Like ChoicePoint, these are subclasses of DiagramState so that dragging, snapping connectors to them and
 * deleting them all work unchanged. Only the shape (a circle) is different.
 */
abstract class RoundPoint extends DiagramState {
  /** (width and height are set by each subclass: the circle's diameter) */
  get radius(): number {
    return this.width / 2;
  }

  /** inside the circle - or nearly: it's small, so it's given a few pixels more to make it easy to hit */
  override contains(p: Point): boolean {
    return Math.hypot(p.x - this.x, p.y - this.y) <= this.radius + 10;
  }

  /** no edge points: an arrow always attaches to the CENTER, and is drawn from the edge facing the other end */
  override get snapPoints(): readonly Compass[] {
    return [];
  }

  /** the 8 compass points are spread evenly round the circle */
  override compassPoint(compass: Compass): Point {
    if (compass === Compass.CENTER) return { x: this.x, y: this.y };
    const angles: Record<string, number> = {
      EAST: 0,
      SOUTH_EAST: 45,
      SOUTH: 90,
      SOUTH_WEST: 135,
      WEST: 180,
      NORTH_WEST: 225,
      NORTH: 270,
      NORTH_EAST: 315,
    };
    const angle = (angles[compass] * Math.PI) / 180;
    return { x: this.x + Math.cos(angle) * this.radius, y: this.y + Math.sin(angle) * this.radius };
  }

  override outlinePointToward(target: Point): Point {
    const length = Math.hypot(target.x - this.x, target.y - this.y);
    if (length === 0) return this.compassPoint(Compass.NORTH);
    return {
      x: this.x + ((target.x - this.x) / length) * this.radius,
      y: this.y + ((target.y - this.y) / length) * this.radius,
    };
  }
}

/**
 * The UML initial pseudostate: a filled dot, with one arrow out of it to the state the game starts in.
 * The arrow has no event - it happens as soon as the game starts.
 */
export class InitialPoint extends RoundPoint {
  override get width(): number {
    return 22;
  }
  override get height(): number {
    return 22;
  }

  override get kind(): ShapeKind {
    return "initial";
  }
}

/**
 * The UML final state: a bullseye. An arrow into it means "on this event, the state machine ends" - from
 * then on it ignores every event.
 */
export class FinalPoint extends RoundPoint {
  override get width(): number {
    return 28;
  }
  override get height(): number {
    return 28;
  }

  override get kind(): ShapeKind {
    return "final";
  }
}

/**
 * NEW: the UML terminate pseudostate: an X. An arrow into it means "on this event, the object is deleted" -
 * unlike the final state (where it stays, finished), the state machine is gone. (It is round underneath,
 * so it is picked and snapped to like the bullseye: only its drawing is an X.)
 */
export class TerminatePoint extends RoundPoint {
  override get width(): number {
    return 24;
  }
  override get height(): number {
    return 24;
  }

  override get kind(): ShapeKind {
    return "terminate";
  }
}
