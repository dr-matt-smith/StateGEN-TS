import type { PropertyType, StateProperty } from "../model/Actions.ts";
import type { Connector } from "../model/Connector.ts";
import type { Diagram } from "../model/Diagram.ts";
import type { DiagramState } from "../model/DiagramState.ts";
import { ALL_COMPASS_POINTS, Compass, type Point } from "../model/geometry.ts";
import { tidyUp } from "../model/Layout.ts";
import { webEventFor } from "../model/TransitionEvents.ts";
import { normalizeMod } from "../model/WebEvents.ts";

// Builds a diagram from a stateGEN "game.xml" file.
//
// NEW: this was on the Flash version's TODO list (readme.txt: "construct state diagram from game.xml file"),
// and the toolbar had an import button, but it was never written.
//
// A game.xml saved by this editor has the layout in it (x/y on each <state>, and any compass points the
// arrows were snapped to - see XmlExporter.ts), so everything goes back where it was. The Flash version's
// files have no positions, so the states are put on a grid and then tidied up (see Layout.ts). Arrows are attached to the CENTER of their states unless the file says otherwise, so they follow
// the states round as you move them.
//
// NEW, version 2 (<game version='2'>, see TDDs/version02.md): actions are lists of <action call='name'/>
// instead of code, a state can have screen='...' and <property .../>s, and <mouseArea id='...'/> says where
// mouse down events count. A version 1 file still imports as before - and its action code may now be
// several calls ("drawScene(); findHover();"), which become a list.
//
// NEW, version 3 (<game version='3'>, see TDDs/version03.md): an <event> says what it is with attributes
// (on='click' target='playButton', after='2000', custom='GAME_OVER' ...) instead of an id, and there are
// no declaration lists. The old ids are converted as they are read - a button release is a click, a key
// code is a key name, and so on - so every version ends up as the same events in the editor.
//
// The XML is simple and regular, so a few regular expressions are enough (and they work in Deno's tests,
// where there is no browser DOMParser).

/** Where things go on the diagram, from the layout attributes (all optional). */
interface ParsedLayout {
  fromPoint: Compass;
  toPoint: Compass;
  to: Point | null;
  choice: Point | null;
  choiceInPoint: Compass;
  choiceOutPoint: Compass;
  final: Point | null;
  terminate: Point | null;
}

interface ParsedEvent {
  /** the version 1/2 id - or, for version 3, the event's attributes (e.g. "on=click target=playButton") */
  id: string;
  /** version 3: the <event>'s attributes */
  attributes: Record<string, string>;
  newState: string | null;
  guard: string;
  body: string;
  /** final='true': this event ends the state machine (an arrow to the final bullseye) */
  final: boolean;
  /** NEW: terminate='true': this event deletes the object (an arrow to the terminate X) */
  terminate: boolean;
  layout: ParsedLayout;
}

interface ParsedState {
  id: string;
  frameName: string;
  screen: string;
  properties: StateProperty[];
  enter: string;
  /** NEW: <doStateActions> */
  do: string;
  exit: string;
  events: ParsedEvent[];
  position: Point | null;
  /** NEW (version 2): width='..' height='..' - a resized state (as x = width, y = height) */
  size: Point | null;
}

/**
 * <initialState newState='...' x='..' y='..' fromPoint='..' toPoint='..'/> (NEW) - or, NEW, pointing at a
 * choice diamond: <initialState x='..' y='..' choiceX='..' choiceY='..'> with a guarded <event> for each way
 * out of it </initialState>
 */
interface ParsedInitial {
  newState: string | null;
  position: Point | null;
  fromPoint: Compass;
  toPoint: Compass;
  choice: Point | null;
  choiceInPoint: Compass;
  /** the ways out of the choice diamond (empty: no diamond) */
  events: ParsedEvent[];
}

const GRID_ORIGIN: Point = { x: 220, y: 130 };
const GRID_SPACING: Point = { x: 330, y: 230 };

/**
 * Replace the contents of `diagram` with the states and transitions in `xml`.
 * Returns a list of warnings about anything that could not be represented exactly.
 */
export function importXml(xml: string, diagram: Diagram): string[] {
  const warnings: string[] = [];
  const parsed = parseStates(xml, warnings);
  if (parsed.length === 0) throw new Error("No <state> elements found - is this a stateGEN game.xml file?");
  const hasLayout = parsed.every((p) => p.position !== null);

  diagram.clear();
  const game = xml.replace(/<!--[\s\S]*?-->/g, "");
  const version = attribute(game.match(/<game\b([^>]*)>/)?.[1] ?? "", "version");
  if (version === "2") diagram.version = 2;
  if (version === "3") diagram.version = 3;
  diagram.mouseArea = attribute(game.match(/<mouseArea\b([^>]*?)\/?>/)?.[1] ?? "", "id") ?? "";

  // 1. the states: where the file says, or on a grid
  const columns = Math.ceil(Math.sqrt(parsed.length));
  const byId = new Map<string, DiagramState>();
  parsed.forEach((p, i) => {
    const state = diagram.addState(
      hasLayout ? p.position! : {
        x: GRID_ORIGIN.x + (i % columns) * GRID_SPACING.x,
        y: GRID_ORIGIN.y + Math.floor(i / columns) * GRID_SPACING.y,
      },
    );
    state.stateName = p.id.replace(/^STATE_/, "").replaceAll("_", " ");
    state.frameName = p.frameName;
    state.screen = p.screen;
    state.properties = p.properties;
    state.enterActions = actionList(p.enter, `${p.id} <enterStateActions>`, warnings);
    state.doActions = actionList(p.do, `${p.id} <doStateActions>`, warnings);
    state.exitActions = actionList(p.exit, `${p.id} <exitStateActions>`, warnings);
    if (p.size) state.resizeTo(p.size.x, p.size.y);
    byId.set(p.id, state);
  });

  // the final bullseyes: one per position in the file (or just one, if the file has no positions for them)
  const finals = new Map<string, DiagramState>();
  const finalFor = (at: Point | null, near: DiagramState): DiagramState => {
    const key = at ? `${at.x},${at.y}` : "";
    let final = finals.get(key);
    if (!final) {
      final = diagram.addFinal(at ?? { x: near.x + GRID_SPACING.x / 2, y: near.y });
      finals.set(key, final);
    }
    return final;
  };
  // the terminate Xs, the same way
  const terminates = new Map<string, DiagramState>();
  const terminateFor = (at: Point | null, near: DiagramState): DiagramState => {
    const key = at ? `${at.x},${at.y}` : "";
    let x = terminates.get(key);
    if (!x) {
      x = diagram.addTerminate(at ?? { x: near.x + GRID_SPACING.x / 2, y: near.y + GRID_SPACING.y / 2 });
      terminates.set(key, x);
    }
    return x;
  };

  // the choice diamonds, by position: an arrow into a diamond that is already there (e.g. one shared by a
  // state and the initial dot) goes to that one, and only adds the ways out of it that aren't there yet
  const choices = new Map<string, { choice: DiagramState; outs: Set<string> }>();
  const choiceFor = (at: Point | null, otherwise: Point) => {
    const key = at ? `${at.x},${at.y}` : null;
    const found = key ? choices.get(key) : undefined;
    if (found) return found;
    const made = { choice: diagram.addChoice(at ?? otherwise), outs: new Set<string>() };
    if (key) choices.set(key, made);
    return made;
  };
  /** an arrow out of a choice diamond, unless the diamond already has one the same */
  const choiceOut = (
    c: { choice: DiagramState; outs: Set<string> },
    e: ParsedEvent,
    to: DiagramState | null,
    actions: string[],
  ): void => {
    const key = `${e.newState ?? ""}|${e.final}|${e.terminate}|${e.guard}`;
    if (c.outs.has(key)) return;
    c.outs.add(key);
    const out = connect(diagram, c.choice, e.layout.choiceOutPoint, to, e.layout.toPoint, e.layout.to);
    out.guard = e.guard;
    out.actions = actions;
  };

  // 2. a connector for each <event>
  const targetOf = (p: ParsedState, e: ParsedEvent): DiagramState | null => {
    if (e.final) return finalFor(e.layout.final, byId.get(p.id)!);
    if (e.terminate) return terminateFor(e.layout.terminate, byId.get(p.id)!);
    const to = e.newState ? byId.get(e.newState) ?? null : null;
    if (e.newState && !to) {
      warnings.push(`${p.id}: ${eventName(e)} goes to unknown state ${e.newState}`);
    }
    return to;
  };

  for (const p of parsed) {
    const from = byId.get(p.id)!;
    let choiceCount = 0;
    for (const group of groupById(p.events).values()) {
      if (group.length > 1 && group.some((e) => e.guard)) {
        // the same event, with different guards: that was a choice diamond, so make one again
        const layout = group[0].layout;
        const c = choiceFor(layout.choice, {
          x: from.x + GRID_SPACING.x / 2,
          y: from.y + GRID_SPACING.y / 2 + choiceCount++ * 80,
        });
        const into = connect(diagram, from, layout.fromPoint, c.choice, layout.choiceInPoint, null);
        setEvent(into, group[0], diagram.mouseArea, warnings);
        // actions every way out shares were on the arrow INTO the diamond: put them back there, so another
        // arrow into the same diamond (e.g. from the initial dot) doesn't pick them up
        const lists = group.map((e) => actionList(e.body, `${p.id} ${eventName(e)}`, warnings));
        const shared = lists.every((l) => l.join("\n") === lists[0].join("\n"));
        if (shared) into.actions = lists[0];
        group.forEach((e, i) => choiceOut(c, e, targetOf(p, e), shared ? [] : lists[i]));
      } else {
        for (const e of group) {
          const connector = connect(diagram, from, e.layout.fromPoint, targetOf(p, e), e.layout.toPoint, e.layout.to);
          setEvent(connector, e, diagram.mouseArea, warnings);
          connector.actions = actionList(e.body, `${p.id} ${eventName(e)}`, warnings);
          connector.guard = e.guard;
        }
      }
    }
  }

  // 3. the initial dot, with its arrow to the first state - or (NEW) to a choice diamond
  const initial = parseInitial(xml);
  if (initial && initial.events.length > 0) {
    const at = initial.position ?? GRID_ORIGIN;
    const dot = diagram.addInitial(at);
    const c = choiceFor(initial.choice, { x: at.x + 130, y: at.y });
    connect(diagram, dot, initial.fromPoint, c.choice, initial.choiceInPoint, null);
    for (const e of initial.events) {
      let to: DiagramState | null = null;
      if (e.final) to = finalFor(e.layout.final, c.choice);
      else if (e.terminate) to = terminateFor(e.layout.terminate, c.choice);
      else if (e.newState) {
        to = byId.get(e.newState) ?? null;
        if (!to) warnings.push(`<initialState> goes to unknown state ${e.newState}`);
      }
      choiceOut(c, e, to, actionList(e.body, "<initialState>", warnings));
    }
  } else if (initial) {
    const first = initial.newState ? byId.get(initial.newState) ?? null : null;
    if (initial.newState && !first) warnings.push(`<initialState> goes to unknown state ${initial.newState}`);
    const at = initial.position ?? (first ? { x: first.x - 130, y: first.y } : GRID_ORIGIN);
    const dot = diagram.addInitial(at);
    if (first) connect(diagram, dot, initial.fromPoint, first, initial.toPoint, null);
  }

  // 4. no layout in the file: tidy up the grid, so arrows cross as little as possible
  if (!hasLayout) tidyUp(diagram);
  return [...new Set(warnings)]; // (each warning once)
}

/** The events, grouped by id (in the order each id first appears). */
function groupById(events: ParsedEvent[]): Map<string, ParsedEvent[]> {
  const groups = new Map<string, ParsedEvent[]>();
  for (const e of events) groups.set(e.id, [...(groups.get(e.id) ?? []), e]);
  return groups;
}

/**
 * A new connector from `from` to `to` (null: to no state - it ends at `toAt`, or just to the right).
 * Its ends go to the given compass points - CENTER unless the file said otherwise.
 */
function connect(
  diagram: Diagram,
  from: DiagramState,
  fromPoint: Compass,
  to: DiagramState | null,
  toPoint: Compass,
  toAt: Point | null,
): Connector {
  const connector = diagram.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  if (to === from && fromPoint === Compass.CENTER && toPoint === Compass.CENTER) {
    // a transition back to the same state: center to center would be no line at all, so use two corners
    connector.start.snapTo(from, Compass.NORTH_EAST);
    connector.end.snapTo(from, Compass.SOUTH_EAST);
    return connector;
  }
  connector.start.snapTo(from, fromPoint);
  if (to) connector.end.snapTo(to, toPoint);
  else connector.end.floatAt(toAt ?? { x: from.x + from.width / 2 + 80, y: from.y - 30 });
  return connector;
}

/** How a warning names an event: its id, its version 3 attributes, or "completion transition". */
function eventName(e: ParsedEvent): string {
  return e.id || "completion transition";
}

/** Set a connector's event from an <event> element: version 3 attributes, or a version 1/2 id. */
function setEvent(connector: Connector, e: ParsedEvent, mouseArea: string, warnings: string[]): void {
  const a = e.attributes;
  if (a.on !== undefined || a.after !== undefined || a.custom !== undefined) {
    setVersion3Event(connector, a, warnings);
  } else {
    setLegacyEvent(connector, e.id, mouseArea, warnings);
  }
}

/** Version 3: <event on='click' target='playButton'>, <event after='2000'>, <event custom='GAME_OVER'> */
function setVersion3Event(connector: Connector, a: Record<string, string>, warnings: string[]): void {
  if (a.after !== undefined) {
    const ms = Number(a.after);
    connector.eventGroup = "time";
    if (Number.isFinite(ms) && ms >= 0) connector.timeEvent.ms = Math.round(ms);
    else warnings.push(`after='${a.after}' is not a number of milliseconds - 1000 used`);
  } else if (a.custom !== undefined) {
    connector.eventGroup = "custom";
    connector.customEvent.eventName = a.custom;
  } else if (a.on === "animationframe") {
    connector.eventGroup = "frame";
    connector.frameEvent.onEnterFrame = true;
  } else {
    connector.eventGroup = "web";
    const w = connector.webEvent;
    w.on = a.on.trim();
    w.target = a.target?.trim() || "document";
    w.key = a.key ?? "";
    w.mod = normalizeMod(a.mod ?? "");
    w.keyCode = a.keyCode ?? null;
  }
}

/** Versions 1 and 2: work out the event from an id such as "EVENT_KEY_DOWN_LEFT". */
function setLegacyEvent(connector: Connector, id: string, mouseArea: string, warnings: string[]): void {
  let m: RegExpMatchArray | null;
  const web = webEventFor(id, mouseArea);
  if (id === "") {
    // NEW: an <event> with no id is a completion transition - followed as soon as the state is entered
    connector.eventGroup = "completion";
  } else if ((m = id.match(/^EVENT_AFTER_(\d+)$/))) {
    // NEW: a time event, after(ms)
    connector.eventGroup = "time";
    connector.timeEvent.ms = Number(m[1]);
  } else if (id === "EVENT_ON_ENTER_FRAME" || id === "EVENT_ON_LOAD") {
    connector.eventGroup = "frame";
    connector.frameEvent.onEnterFrame = id === "EVENT_ON_ENTER_FRAME";
  } else if (web) {
    // a button, the mouse or a key: a web event (click on playButton, keydown of ArrowLeft ...)
    connector.eventGroup = "web";
    Object.assign(connector.webEvent, web);
  } else if ((m = id.match(/^EVENT_USER_DEFINED_(.+)$/))) {
    connector.eventGroup = "custom";
    connector.customEvent.eventName = m[1];
  } else {
    // e.g. EVENT_GO_STATE_DRAG in stateGEN's own game.xml: the editor has no event type for these, so they
    // become custom events
    connector.eventGroup = "custom";
    connector.customEvent.eventName = id.replace(/^EVENT_/, "");
    warnings.push(`${id} is not a stateGEN event type - imported as a custom event`);
  }
}

/**
 * The actions in an <event>, <enterStateActions>, <doStateActions> or <exitStateActions>:
 *   version 2:  <action call='drawScene'/> <action call='findHover(p)'/>  -> ["drawScene", "findHover(p)"]
 *   version 1:  drawScene(); findHover();                                   -> ["drawScene", "findHover"]
 * Any other code can't be shown in the editor, so it is left out (with a warning).
 */
function actionList(body: string, where: string, warnings: string[]): string[] {
  const calls = [...body.matchAll(/<action\b([^>]*?)\/?>/g)].map((m) => attribute(m[1], "call") ?? "");
  const code = body.replace(/<action\b[^>]*?\/?>(\s*<\/action>)?/g, "").replace(/\/\/.*$/gm, "").trim();
  if (code === "") return calls.filter((c) => c !== "");
  const call = /^([A-Za-z_$][\w$]*)\s*\(\s*(p?)\s*\)\s*;?/;
  const names: string[] = [];
  for (let rest = code; rest !== ""; rest = rest.trim()) {
    const m = rest.match(call);
    if (!m) {
      warnings.push(`${where}: action code is not just function calls - left out`);
      return calls.filter((c) => c !== "");
    }
    names.push(m[2] ? `${m[1]}(p)` : m[1]);
    rest = rest.slice(m[0].length);
  }
  return [...calls.filter((c) => c !== ""), ...names];
}

const PROPERTY_TYPES: PropertyType[] = ["boolean", "number", "string"];

/** <property name='highlightHover' type='boolean' value='true'/> (version 2) */
function parseProperties(inner: string, where: string, warnings: string[]): StateProperty[] {
  const properties: StateProperty[] = [];
  for (const m of inner.matchAll(/<property\b([^>]*?)\/?>/g)) {
    const name = attribute(m[1], "name") ?? "";
    const type = attribute(m[1], "type") ?? "string";
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      warnings.push(`${where}: <property name='${name}'> is not a valid name - left out`);
      continue;
    }
    if (!PROPERTY_TYPES.includes(type as PropertyType)) {
      warnings.push(`${where}: property ${name} has type '${type}' - must be boolean, number or string`);
    }
    properties.push({
      name,
      type: PROPERTY_TYPES.includes(type as PropertyType) ? type as PropertyType : "string",
      value: unescapeXml(attribute(m[1], "value") ?? ""),
    });
  }
  return properties;
}

function attribute(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`));
  return m ? m[2] : null;
}

function parseInitial(xml: string): ParsedInitial | null {
  const m = xml.replace(/<!--[\s\S]*?-->/g, "").match(/<initialState\b([^>]*?)(\/>|>([\s\S]*?)<\/initialState>)/);
  if (!m) return null;
  return {
    newState: attribute(m[1], "newState"),
    position: pointAttributes(m[1], "x", "y"),
    fromPoint: compassAttribute(m[1], "fromPoint"),
    toPoint: compassAttribute(m[1], "toPoint"),
    choice: pointAttributes(m[1], "choiceX", "choiceY"),
    choiceInPoint: compassAttribute(m[1], "choiceInPoint"),
    events: parseEvents(m[3] ?? ""),
  };
}

/** e.g. fromPoint='EAST' -> Compass.EAST. Missing (or not a compass point): CENTER. */
function compassAttribute(tag: string, name: string): Compass {
  const value = attribute(tag, name);
  return ALL_COMPASS_POINTS.find((c) => c === value) ?? Compass.CENTER;
}

/** e.g. x='200' y='120' -> { x: 200, y: 120 }, or null if either is missing. */
function pointAttributes(tag: string, xName: string, yName: string): Point | null {
  const x = Number(attribute(tag, xName) ?? NaN);
  const y = Number(attribute(tag, yName) ?? NaN);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function unescapeXml(text: string): string {
  return text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&apos;", "'").replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

function parseStates(xml: string, warnings: string[]): ParsedState[] {
  const text = xml.replace(/<!--[\s\S]*?-->/g, "");
  const states: ParsedState[] = [];
  for (const m of text.matchAll(/<state\b([^>]*?)(\/>|>([\s\S]*?)<\/state>)/g)) {
    const inner = m[3] ?? "";
    const events = parseEvents(inner);
    const id = attribute(m[1], "id") ?? "STATE_";
    states.push({
      id,
      frameName: attribute(m[1], "frameName") ?? "",
      screen: attribute(m[1], "screen") ?? "",
      // (the events can't have properties, so take them out first)
      properties: parseProperties(inner.replace(/<event\b[^>]*?(\/>|>[\s\S]*?<\/event>)/g, ""), id, warnings),
      enter: inner.match(/<enterStateActions>([\s\S]*?)<\/enterStateActions>/)?.[1] ?? "",
      do: inner.match(/<doStateActions>([\s\S]*?)<\/doStateActions>/)?.[1] ?? "",
      exit: inner.match(/<exitStateActions>([\s\S]*?)<\/exitStateActions>/)?.[1] ?? "",
      events,
      position: pointAttributes(m[1], "x", "y"),
      size: pointAttributes(m[1], "width", "height"),
    });
  }
  return states;
}

/** The <event> elements in a <state> (or, NEW, an <initialState>). */
function parseEvents(inner: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  for (const e of inner.matchAll(/<event\b([^>]*?)(\/>|>([\s\S]*?)<\/event>)/g)) {
    const attributes: Record<string, string> = {};
    for (const name of ["on", "target", "key", "mod", "keyCode", "after", "custom"]) {
      const value = attribute(e[1], name);
      if (value !== null) attributes[name] = unescapeXml(value);
    }
    events.push({
      id: attribute(e[1], "id") ??
        Object.entries(attributes).map(([n, v]) => `${n}=${v}`).join(" "),
      attributes,
      newState: attribute(e[1], "newState"),
      guard: unescapeXml(attribute(e[1], "guard") ?? ""),
      body: e[3] ?? "",
      final: attribute(e[1], "final") === "true",
      terminate: attribute(e[1], "terminate") === "true",
      layout: {
        fromPoint: compassAttribute(e[1], "fromPoint"),
        toPoint: compassAttribute(e[1], "toPoint"),
        to: pointAttributes(e[1], "toX", "toY"),
        choice: pointAttributes(e[1], "choiceX", "choiceY"),
        choiceInPoint: compassAttribute(e[1], "choiceInPoint"),
        choiceOutPoint: compassAttribute(e[1], "choiceOutPoint"),
        final: pointAttributes(e[1], "finalX", "finalY"),
        terminate: pointAttributes(e[1], "terminateX", "terminateY"),
      },
    });
  }
  return events;
}
