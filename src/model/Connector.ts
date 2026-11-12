import { ConnectorEnd } from "./ConnectorEnd.ts";
import { midpoint, type Point } from "./geometry.ts";
import {
  CompletionEvent,
  CustomNamedEvent,
  type EventGroup,
  FrameEvent,
  TimeEvent,
  type TransitionEvent,
  WebEvent,
} from "./TransitionEvents.ts";

/**
 * A connector (state transition) arrow on the diagram.
 *
 * Like the Flash version, a connector remembers the settings for ALL its event groups, so flicking between
 * the kinds of event in the Properties panel doesn't lose what you typed.
 */
export class Connector {
  readonly start: ConnectorEnd;
  readonly end: ConnectorEnd;

  readonly completionEvent = new CompletionEvent();
  readonly timeEvent = new TimeEvent();
  readonly frameEvent = new FrameEvent();
  /** NEW (version 3): a DOM event on a target - replaces the Flash button, mouse and key groups */
  readonly webEvent = new WebEvent();
  /** a custom event, fired by the page's code (version 1/2: "user defined") */
  readonly customEvent = new CustomNamedEvent();

  /**
   * which of the events above fires this transition. Default: none - a completion transition, as in UML,
   * where an arrow with no event is followed as soon as its state has been entered
   */
  eventGroup: EventGroup = "completion";

  /**
   * the functions to call, in order, when the transition happens (may be empty). A name written "name(p)"
   * is passed the mouse position (see Actions.ts). The Flash version had one function name here.
   */
  actions: string[] = [];

  /**
   * NEW: a guard condition, e.g. "gumballs > 0" - the transition only happens if it is true. Written
   * without the [ ] UML puts round it. "else" means "if none of the other guards is true".
   */
  guard = "";

  /**
   * NEW (after son-of-fungus-JS): how far the line bends out sideways, in pixels - 0 means straight. Two or
   * more arrows between the same two states bend apart so they don't sit on top of each other, and an arrow
   * from a state back to itself bends out into a loop. Set by Diagram.updateBends().
   */
  bend = 0;
  /** which way it bends: a unit vector at right angles to the line (set with `bend`) */
  bendSide: Point = { x: 0, y: 0 };

  /**
   * NEW: where its label (event [guard] / actions) was last drawn - a box, (x, y) being its center - so
   * clicking the label selects the connector. Set by the view each time it draws; null if no label.
   */
  labelBox: { x: number; y: number; width: number; height: number } | null = null;

  constructor(start: Point, end: Point) {
    this.start = new ConnectorEnd(start);
    this.end = new ConnectorEnd(end);
    this.start.otherEnd = this.end;
    this.end.otherEnd = this.start;
    const control = () => (this.bend === 0 ? null : this.bentControl());
    this.start.curveControl = control;
    this.end.curveControl = control;
  }

  get isCurved(): boolean {
    return this.bend !== 0;
  }

  /**
   * The control point of the curve (a quadratic Bezier curve: it starts towards this point, and ends
   * coming from it). For a straight connector, just the middle of the line.
   */
  get control(): Point {
    return this.bend === 0 ? midpoint(this.start.point, this.end.point) : this.bentControl();
  }

  /** the middle of the line between where the ends aim, moved `bend` pixels to the side */
  private bentControl(): Point {
    const m = midpoint(this.start.aimPoint, this.end.aimPoint);
    return { x: m.x + this.bendSide.x * this.bend, y: m.y + this.bendSide.y * this.bend };
  }

  /** The event currently chosen for this connector. */
  get event(): TransitionEvent {
    const events: Record<EventGroup, TransitionEvent> = {
      completion: this.completionEvent,
      time: this.timeEvent,
      frame: this.frameEvent,
      web: this.webEvent,
      custom: this.customEvent,
    };
    return events[this.eventGroup];
  }

  /** true if this connector leaves a choice diamond (so it has a guard, but no event of its own) */
  get leavesChoice(): boolean {
    return this.start.state?.isChoice ?? false;
  }

  /** true if this connector leaves the initial dot (so it has no event: it happens when the game starts) */
  get leavesInitial(): boolean {
    return this.start.state?.isInitial ?? false;
  }

  /** The text on the arrow: "EVENT [guard]", just "[guard]" out of a choice, nothing out of the initial dot. */
  labelText(): string {
    if (this.leavesInitial) return "";
    const guard = this.guard.trim() ? `[${this.guard.trim()}]` : "";
    if (this.leavesChoice) return guard;
    const event = this.event.label();
    return event && guard ? `${event} ${guard}` : event || guard;
  }

  /** The middle of the line (or curve) - where the little square you grab it by is drawn. */
  get center(): Point {
    const p1 = this.start.point;
    const p2 = this.end.point;
    if (this.bend === 0) return midpoint(p1, p2);
    const c = this.control; // half way along a quadratic Bezier curve
    return { x: 0.25 * p1.x + 0.5 * c.x + 0.25 * p2.x, y: 0.25 * p1.y + 0.5 * c.y + 0.25 * p2.y };
  }

  /** Move the whole connector (both ends become floating) - CONNECTOR_MOVEonMouseMove() in the Flash version. */
  moveCenterTo(p: Point): void {
    const c = this.center;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    if (dx === 0 && dy === 0) return;
    this.start.moveBy(dx, dy);
    this.end.moveBy(dx, dy);
  }
}
