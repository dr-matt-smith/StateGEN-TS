import { Connector } from "./Connector.ts";
import type { ConnectorEnd } from "./ConnectorEnd.ts";
import { ChoicePoint } from "./ChoicePoint.ts";
import { DiagramState } from "./DiagramState.ts";
import { FinalPoint, InitialPoint, TerminatePoint } from "./Pseudostates.ts";
import { Compass, distance, type Point, upperCaseUnderScored } from "./geometry.ts";

/** Which part of a connector is near the mouse. */
export type ConnectorPart = "start" | "end" | "center";

export interface ConnectorHit {
  connector: Connector;
  part: ConnectorPart;
}

/**
 * The state diagram being drawn: all the states and connectors ("game.states" and "game.connectorArray" in
 * the Flash version), plus the searches the editor needs (what is near the mouse? which compass point
 * should this connector end snap to?).
 */
export class Diagram {
  /** how close (pixels) the mouse must be to a connector end or center to pick it ("game.minDistance") */
  static readonly PICK_DISTANCE = 20;
  /** how close (pixels) a connector end must be to a compass point to snap to it (10 in the Flash version) */
  static readonly SNAP_DISTANCE = 20;
  /** how far apart (pixels) the curves of arrows between the same two states bend (son-of-fungus: 90) */
  static readonly CURVE_STEP = 60;
  /** how far an arrow from a state back to itself bends out */
  static readonly LOOP_BEND = 80;

  readonly states: DiagramState[] = [];
  readonly connectors: Connector[] = [];
  /**
   * NEW: the game.xml version. 2 if the file said <game version='2'> - or if the diagram uses anything only
   * version 2 has (screens, state properties, a mouse area): then the XML is written with <action call/>s.
   * 3 (TDDs/version03.md) if the file said <game version='3'>, or an event has no version 1/2 id.
   */
  version: 1 | 2 | 3 = 1;
  /**
   * NEW (version 2): the id of the HTML element mouse DOWN events count on, e.g. "diagram" (empty: the whole
   * page). Mouse moves and ups always count anywhere, so a drag that leaves the element carries on.
   */
  mouseArea = "";
  private stateNum = 1;
  private choiceNum = 1;
  private initialNum = 1;
  private finalNum = 1;
  private terminateNum = 1;

  /** Add a new state, named "state1", "state2", ... - newStateButtonActions() in the Flash version. */
  addState(p: Point): DiagramState {
    const state = new DiagramState("state" + this.stateNum++, p.x, p.y);
    this.states.push(state);
    return state;
  }

  /** Add a new choice (decision) diamond, named "choice1", "choice2", ... (NEW) */
  addChoice(p: Point): ChoicePoint {
    const choice = new ChoicePoint("choice" + this.choiceNum++, p.x, p.y);
    this.states.push(choice);
    return choice;
  }

  /** Add a new initial (start) dot, named "initial1", ... (NEW) */
  addInitial(p: Point): InitialPoint {
    const initial = new InitialPoint("initial" + this.initialNum++, p.x, p.y);
    this.states.push(initial);
    return initial;
  }

  /** Add a new final (end) bullseye, named "final1", ... (NEW) */
  addFinal(p: Point): FinalPoint {
    const final = new FinalPoint("final" + this.finalNum++, p.x, p.y);
    this.states.push(final);
    return final;
  }

  /** Add a new terminate X, named "terminate1", ... (NEW) */
  addTerminate(p: Point): TerminatePoint {
    const terminate = new TerminatePoint("terminate" + this.terminateNum++, p.x, p.y);
    this.states.push(terminate);
    return terminate;
  }

  /** Add a new connector - newConnectorObject() in the Flash version. */
  addConnector(start: Point, end: Point): Connector {
    const connector = new Connector(start, end);
    this.connectors.push(connector);
    return connector;
  }

  /** how far down and right a duplicate is put (NEW, Ctrl/Cmd-D) */
  static readonly DUPLICATE_OFFSET = 30;

  /**
   * NEW: a copy of a state (or choice, initial dot or final bullseye), a little down and right of it, with
   * the same frame name, screen, behaviours and properties. A state you have named gets the next free
   * name - "NO COIN" -> "NO COIN 2" - since each state's XML id must be different. No arrows are copied.
   */
  duplicateState(original: DiagramState): DiagramState {
    const p = { x: original.x + Diagram.DUPLICATE_OFFSET, y: original.y + Diagram.DUPLICATE_OFFSET };
    const copy = original.isChoice
      ? this.addChoice(p)
      : original.isInitial
      ? this.addInitial(p)
      : original.isFinal
      ? this.addFinal(p)
      : original.isTerminate
      ? this.addTerminate(p)
      : this.addState(p);
    if (original.stateName !== original.instanceId) copy.stateName = this.unusedName(original.stateName);
    copy.frameName = original.frameName;
    copy.screen = original.screen;
    copy.enterActions = [...original.enterActions];
    copy.doActions = [...original.doActions];
    copy.exitActions = [...original.exitActions];
    copy.properties = original.properties.map((property) => ({ ...property }));
    copy.resizeTo(original.boxSize.width, original.boxSize.height);
    return copy;
  }

  /** "NO COIN" -> "NO COIN 2" (or 3, ...): the first name no state has. "NO COIN 2" -> "NO COIN 3". */
  private unusedName(name: string): string {
    const base = name.replace(/ \d+$/, "");
    const taken = (candidate: string) =>
      this.states.some((s) => s.xmlId === upperCaseUnderScored("STATE_" + candidate));
    let n = 2;
    while (taken(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }

  /**
   * NEW: a copy of a connector, with the same event, guard and actions, attached to the same states at
   * the same points. (Two arrows between the same states curve apart - see updateBends() - so the copy can
   * be told from the original. An end that isn't attached is put a little down and right.)
   */
  duplicateConnector(original: Connector): Connector {
    const offset = (end: ConnectorEnd) => ({
      x: end.point.x + Diagram.DUPLICATE_OFFSET,
      y: end.point.y + Diagram.DUPLICATE_OFFSET,
    });
    const copy = this.addConnector(offset(original.start), offset(original.end));
    for (const [from, to] of [[original.start, copy.start], [original.end, copy.end]]) {
      if (from.state && from.compass !== null) to.snapTo(from.state, from.compass);
    }
    copy.eventGroup = original.eventGroup;
    Object.assign(copy.frameEvent, original.frameEvent);
    Object.assign(copy.timeEvent, original.timeEvent);
    Object.assign(copy.webEvent, original.webEvent);
    Object.assign(copy.customEvent, original.customEvent);
    copy.actions = [...original.actions];
    copy.guard = original.guard;
    return copy;
  }

  /**
   * Remove a state. Any connector ends snapped to it are left floating where they were
   * (the Flash version left them pointing at a missing state - the "anonymous STATE_" bug).
   */
  removeState(state: DiagramState): void {
    for (const c of this.connectors) {
      if (c.start.state === state) c.start.unsnap();
      if (c.end.state === state) c.end.unsnap();
    }
    this.states.splice(this.states.indexOf(state), 1);
  }

  removeConnector(connector: Connector): void {
    this.connectors.splice(this.connectors.indexOf(connector), 1);
  }

  /** The state under the mouse, or null - findNearestStateMovieClip(). (Later states are on top, so win.) */
  findStateAt(p: Point): DiagramState | null {
    let found: DiagramState | null = null;
    for (const state of this.states) {
      if (state.contains(p)) found = state;
    }
    return found;
  }

  /**
   * NEW: the connector whose label is under the mouse, or null. (Labels are drawn on top of everything,
   * later ones on top of earlier ones, so the last one found wins.)
   */
  findLabelAt(p: Point): Connector | null {
    let found: Connector | null = null;
    for (const connector of this.connectors) {
      const box = connector.labelBox;
      if (box && Math.abs(p.x - box.x) <= box.width / 2 && Math.abs(p.y - box.y) <= box.height / 2) {
        found = connector;
      }
    }
    return found;
  }

  /**
   * NEW (after son-of-fungus-JS): curve the arrows that would otherwise sit on top of each other.
   *   - one arrow between two states: straight
   *   - N arrows between the same two states (either way round): curves, CURVE_STEP apart, spread evenly
   *     either side of the straight line
   *   - an arrow from a state back to itself: a loop, bending away from the state
   * Called before drawing and picking, so it is always up to date however the arrows were changed.
   */
  updateBends(): void {
    const pairs = new Map<string, Connector[]>();
    for (const c of this.connectors) {
      c.bend = 0;
      const a = c.start.state;
      const b = c.end.state;
      if (!a || !b) continue;
      const [i, j] = [this.states.indexOf(a), this.states.indexOf(b)].sort((x, y) => x - y);
      const key = `${i}-${j}`;
      pairs.set(key, [...(pairs.get(key) ?? []), c]);
    }
    for (const group of pairs.values()) {
      const a = group[0].start.state!;
      const b = group[0].end.state!;
      if (a === b) {
        group.forEach((c, n) => this.bendLoop(c, Diagram.LOOP_BEND + n * Diagram.CURVE_STEP));
        continue;
      }
      if (group.length < 2) continue;
      // the same side for A->B and B->A: measured from the state that comes first in the diagram
      const [first, second] = this.states.indexOf(a) < this.states.indexOf(b) ? [a, b] : [b, a];
      const side = rightAngle({ x: second.x - first.x, y: second.y - first.y });
      group.forEach((c, n) => {
        c.bend = (n - (group.length - 1) / 2) * Diagram.CURVE_STEP;
        c.bendSide = side;
      });
    }
  }

  /** a loop: bend at right angles to the line between the ends, away from the state's center */
  private bendLoop(c: Connector, bend: number): void {
    const p1 = c.start.aimPoint;
    const p2 = c.end.aimPoint;
    const state = c.start.state!;
    let side = rightAngle({ x: p2.x - p1.x, y: p2.y - p1.y });
    const out = { x: (p1.x + p2.x) / 2 - state.x, y: (p1.y + p2.y) / 2 - state.y };
    if (side.x * out.x + side.y * out.y < 0) side = { x: -side.x, y: -side.y };
    c.bend = bend;
    c.bendSide = side;
  }

  /** The connector whose start, end or center is near the mouse, or null - findNearestConnector(). */
  findConnectorNear(p: Point): ConnectorHit | null {
    this.updateBends();
    let found: ConnectorHit | null = null;
    for (const connector of this.connectors) {
      const near = (q: Point) => distance(p, q) < Diagram.PICK_DISTANCE;
      if (near(connector.center)) found = { connector, part: "center" };
      else if (near(connector.end.point)) found = { connector, part: "end" };
      else if (near(connector.start.point)) found = { connector, part: "start" };
    }
    return found;
  }

  /**
   * Put a connector end at the mouse position, then snap it (the big 8-way copy-and-paste loop in
   * CONNECTOR_DRAGonMouseMove()):
   *   - near one of a state's 8 compass points (within SNAP_DISTANCE)? snap to the closest one
   *   - otherwise, inside a state? snap to its CENTER (NEW)
   * (Inside a small round shape - the initial dot or final bullseye - always means its CENTER: every point
   * in it is that close to a compass point.)
   *   - otherwise leave the end floating at the mouse.
   * Returns true if it snapped.
   */
  dragEndTo(end: ConnectorEnd, p: Point): boolean {
    end.floatAt(p);
    let closest = Diagram.SNAP_DISTANCE;
    let snapped = false;
    for (const state of this.states) {
      for (const compass of state.snapPoints) {
        const d = distance(p, state.compassPoint(compass));
        if (d < closest) {
          closest = d;
          end.snapTo(state, compass);
          snapped = true;
        }
      }
    }
    if (snapped) return true;

    const inside = this.findStateAt(p);
    if (inside) {
      end.snapTo(inside, Compass.CENTER);
      return true;
    }
    return false;
  }

  /** Index number of a connector, used for its "e0", "e1" label and "stateTransition_0" instance ID. */
  indexOf(connector: Connector): number {
    return this.connectors.indexOf(connector);
  }

  clear(): void {
    this.states.length = 0;
    this.connectors.length = 0;
    this.stateNum = 1;
    this.choiceNum = 1;
    this.initialNum = 1;
    this.finalNum = 1;
    this.terminateNum = 1;
    this.version = 1;
    this.mouseArea = "";
  }

  /**
   * The XML version this diagram is written as: 3 if it was read from a version 3 file, or any event can
   * only be written in version 3 (e.g. ended on a video); otherwise 2 or 1, as before - so an old example
   * that has only been moved about still saves in its old format.
   */
  get xmlVersion(): 1 | 2 | 3 {
    if (this.version === 3) return 3;
    const ownEvent = this.connectors.filter((c) => c.start.state?.isRealState);
    if (ownEvent.some((c) => c.event.legacyId(this.mouseArea) === null)) return 3;
    return this.isVersion2 ? 2 : 1;
  }

  /** true if this diagram is written as version 2 of the XML: it uses screens, state properties, DO behaviours, resized states or a mouse area */
  get isVersion2(): boolean {
    return this.version >= 2 || this.mouseArea !== "" ||
      this.states.some((s) =>
        s.screen !== "" || s.properties.length > 0 || s.doActions.length > 0 || s.isResized || s.isTerminate
      ) ||
      // (arrows from the initial dot or out of a choice don't write their own event, so don't count)
      this.connectors.some((c) => c.eventGroup === "completion" && !c.leavesInitial && !c.leavesChoice);
  }
}

/** A unit vector at right angles to `v` (pointing up the page for a line going right). Straight up if v is 0. */
function rightAngle(v: Point): Point {
  const length = Math.hypot(v.x, v.y);
  return length === 0 ? { x: 0, y: -1 } : { x: v.y / length, y: -v.x / length };
}
