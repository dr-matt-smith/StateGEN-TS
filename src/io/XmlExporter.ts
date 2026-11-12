import { takesPoint } from "../model/Actions.ts";
import type { Connector } from "../model/Connector.ts";
import type { ConnectorEnd } from "../model/ConnectorEnd.ts";
import type { Diagram } from "../model/Diagram.ts";
import type { DiagramState } from "../model/DiagramState.ts";
import {
  guardCondition,
  initialTransitions,
  isElse,
  resolveTransitions,
  type Transition,
} from "../model/Transitions.ts";
import type { EventDeclarations } from "../model/TransitionEvents.ts";
import { Compass } from "../model/geometry.ts";

// Writes the diagram as a stateGEN "game.xml" file - generateXML() in tool_include1.as.
// The output is in the same format as the Flash version's, so it still works with xsl/gameCode.xsl -
// except for one NEW attribute: a transition with a guard condition gets guard='...' on its <event>
// (and a choice diamond isn't written at all: its arrows become guarded <event>s, see Transitions.ts).
//
// NEW: the LAYOUT is saved too, as extra attributes the XSL ignores, so an import puts everything back
// where it was:
//   <state ... x='200' y='120'>           where the state is (its center)
//   <event ... fromPoint='EAST'>          the arrow leaves its state at a compass point...
//   <event ... toPoint='WEST'>            ...and/or arrives at one. An end attached to a state's CENTER
//                                         isn't written: no fromPoint/toPoint means "the center".
//   <event ... toX='500' toY='90'>        an arrow to no state ends here
//   <event ... choiceX='450' choiceY='330' choiceInPoint='NORTH' choiceOutPoint='EAST'>
//                                         a transition through a choice diamond: where the diamond is, and
//                                         any compass points of the arrows into and out of it
//   <event ... finalX='600' finalY='400'> where the final bullseye is, for an event with final='true'
//
// NEW: the initial dot and final bullseye (UML pseudostates) are saved as:
//   <initialState newState='STATE_NO_COIN' x='100' y='60'/>   the state the game starts in (+ its layout)
//   NEW: an initial dot pointing at a choice diamond - the diamond's layout, and a guarded <event> for each
//   arrow out of it (the same attributes as a state's <event>s, but no event: the game starts at once):
//     <initialState x='80' y='280' choiceX='230' choiceY='280' choiceInPoint='WEST'>
//       <event newState='STATE_NO_COIN' guard='gumballs &gt; 0' choiceOutPoint='EAST'/>
//       <event newState='STATE_OUT_OF_GUMBALLS' guard='gumballs = 0'/>
//     </initialState>
//   <event id='...' final='true'/>                           this event ends the state machine
//   <event id='...' terminate='true'/>                       NEW: this event deletes the object (the X),
//                                                            at terminateX/terminateY
//
// NEW, version 3 (TDDs/version03.md) - <game version='3'>, only written when an event needs it: no
// declaration lists or <mouseArea>, and each <event> says what it is with attributes instead of an id:
//   <event on='click' target='playButton' ...>   <event on='keydown' key='d' mod='mod' ...>
//   <event after='2000' ...>   <event on='animationframe' ...>   <event custom='GAME_OVER' ...>
//
// NEW, version 2 (TDDs/version02.md) - written as <game version='2'> when the diagram uses any of it:
//   <mouseArea id='diagram'/>                      mouse down only counts on this HTML element
//   <state ... screen='export-screen'>             the HTML element to show when the state is entered
//   <property name='..' type='boolean' value='true'/>   a constant the view can read from the state
//   <action call='grabStateAt(p)'/>                 one action, in an <event> or <enter/exitStateActions>
//                                                   (version 1 writes the Flash way: grabStateAt(p);)

const NL = "\n";
const TAB = "\t";

/**
 * The whole XML file for a diagram.
 *
 * @example
 * ```ts
 * import { Diagram } from "../model/Diagram.ts";
 * const diagram = new Diagram();
 * diagram.addState({ x: 100, y: 100 }).stateName = "MAIN MENU";
 * generateXml(diagram); // contains <state id='STATE_MAIN_MENU'>
 * ```
 */
export function generateXml(diagram: Diagram): string {
  const transitions = resolveTransitions(diagram);
  const version = diagram.xmlVersion;
  const w: Writing = { version, mouseArea: diagram.mouseArea };
  let s = "<?xml version='1.0'?>" + NL + (version === 1 ? "<game>" : `<game version='${version}'>`);
  if (version < 3) {
    // version 3 has no declarations: each event says everything itself
    const declarations: EventDeclarations = { buttons: new Set(), keyCodes: new Set(), userDefinedEvents: new Set() };
    for (const t of transitions) t.event.declare(declarations, diagram.mouseArea);
    s += list(
      NL + "<!-- ****************************** BUTTON INSTANCE NAMES  ******************** -->",
      "buttonInstanceList",
      [...declarations.buttons].map((name) => `<button id='${name}'/>`),
    );
    s += list(
      NL + NL + "<!-- *************************** KEYS for key UP/DOWN events  ***************** -->",
      "keyEventList",
      [...declarations.keyCodes].map((code) => `<keyEvent keyCode='${code}'/>`),
    );
    s += list(
      NL + NL + "<!-- ****************************** USER DEFINED EVENTS  ******************** -->",
      "userDefinedEventList",
      [...declarations.userDefinedEvents].map((id) => `<event id='${id}'/>`),
    );
    if (diagram.mouseArea) {
      s += NL + NL + "<!-- ****************************** WHERE MOUSE DOWN COUNTS  ******************** -->" + NL +
        `<mouseArea id='${escapeAttribute(diagram.mouseArea)}'/>`;
    }
  }
  s += initialElement(diagram, w);
  s += NL + NL + "<!-- ****************************** STATE ELEMENTS  ******************** -->";
  for (const state of diagram.states) {
    if (state.isRealState) s += stateElement(state, transitions.filter((t) => t.from === state), w);
  }
  s += NL + "</game>";
  return s;
}

/** How the file is being written: which version, and (versions 1 and 2) the mouse area. */
export interface Writing {
  version: 1 | 2 | 3;
  mouseArea: string;
}

/** The <initialState> element for the initial dot (NEW), or nothing if there isn't one. */
function initialElement(diagram: Diagram, w: Writing): string {
  const dot = diagram.states.find((s) => s.isInitial);
  if (!dot) return "";
  const comment = NL + NL + "<!-- ****************************** INITIAL STATE  ******************** -->" + NL;
  const arrow = diagram.connectors.find((c) => c.start.state === dot && c.end.state?.isRealState);
  const toChoice = diagram.connectors.find((c) => c.start.state === dot && c.end.state?.isChoice);
  const attributes: [string, string | number | null][] = [];
  if (arrow) attributes.push(["newState", arrow.end.state!.xmlId]);
  attributes.push(["x", Math.round(dot.x)], ["y", Math.round(dot.y)]);
  if (arrow) {
    attributes.push(["fromPoint", edgePoint(arrow.start)], ["toPoint", edgePoint(arrow.end)]);
  } else if (toChoice) {
    // NEW: through a choice diamond - its layout here, and a guarded <event> for each way out of it
    const choice = toChoice.end.state!;
    attributes.push(
      ["fromPoint", edgePoint(toChoice.start)],
      ["choiceX", Math.round(choice.x)],
      ["choiceY", Math.round(choice.y)],
      ["choiceInPoint", edgePoint(toChoice.end)],
    );
    const events = initialTransitions(diagram).map((t) => initialEventElement(t, w));
    return comment + `<initialState${attributeText(attributes)}>` + events.join("") + NL + "</initialState>";
  }
  return comment + `<initialState${attributeText(attributes)}/>`;
}

/**
 * NEW: one way out of the choice diamond the initial dot points at: <event newState='...' guard='...'/>.
 * No event (the game starts at once), and the diamond's layout is on the <initialState>.
 */
function initialEventElement(t: Transition, w: Writing): string {
  const condition = isElse(t.guards) ? "else" : guardCondition(t.guards);
  const attributes: [string, string | number | null][] = [
    ["newState", t.to ? t.to.xmlId : null],
    ["final", t.final ? "true" : null],
    ["terminate", !t.final && t.terminate ? "true" : null],
    ["guard", condition ? escapeAttribute(condition) : null],
  ];
  if (t.path.length > 1) attributes.push(["choiceOutPoint", edgePoint(t.path[1].start)]);
  attributes.push(...endLayout(t.path[t.path.length - 1]));
  let s = NL + TAB + `<event${attributeText(attributes)}`;
  if (t.actions.length > 0) {
    s += ">";
    for (const action of t.actions) s += NL + TAB + TAB + actionText(action, w.version >= 2);
    s += NL + TAB + "</event>";
  } else {
    s += "/>";
  }
  return s;
}

/** A list element such as <buttonInstanceList> - or nothing at all if the list would be empty. */
function list(comment: string, tag: string, items: string[]): string {
  if (items.length === 0) return "";
  return comment + NL + `<${tag}>` + items.map((item) => NL + TAB + item).join("") + NL + `</${tag}>`;
}

/** One <state> element, with an <event> element for each transition out of this state. */
function stateElement(state: DiagramState, transitions: Transition[], w: Writing): string {
  const v2 = w.version >= 2;
  const frameName = state.frameName.length > 0 ? ` frameName='${state.frameName}'` : "";
  const screen = state.screen.length > 0 ? ` screen='${escapeAttribute(state.screen)}'` : "";
  // NEW (version 2): a resized state's size
  const size = state.isResized ? ` width='${state.boxSize.width}' height='${state.boxSize.height}'` : "";
  let s = NL + "<!-- ****************************** STATE ******************** -->";
  s += NL +
    `<state id='${state.xmlId}'${frameName}${screen} x='${Math.round(state.x)}' y='${Math.round(state.y)}'${size}>`;
  for (const p of state.properties) {
    s += NL + TAB +
      `<property name='${p.name}' type='${p.type}' value='${escapeAttribute(p.value)}'/>`;
  }
  s += actions("enterStateActions", state.enterActions, v2);
  s += actions("doStateActions", state.doActions, v2);
  s += actions("exitStateActions", state.exitActions, v2);
  for (const t of transitions) s += eventElement(t, w);
  s += NL + "</state>";
  s += NL;
  return s;
}

/**
 * <enterStateActions> / <doStateActions> / <exitStateActions> calling the actions (new: the Flash version
 * ignored these, and had no do behaviours).
 */
function actions(tag: string, calls: string[], v2: boolean): string {
  if (calls.length === 0) return "";
  return NL + TAB + `<${tag}>` + calls.map((c) => NL + TAB + TAB + actionText(c, v2)).join("") + NL + TAB +
    `</${tag}>`;
}

/** One action: <action call='findHover(p)'/> in version 2, findHover(p); in version 1 (the Flash way) */
function actionText(call: string, v2: boolean): string {
  if (v2) return `<action call='${escapeAttribute(call)}'/>`;
  return takesPoint(call) ? call + ";" : call + "();";
}

/**
 * One <event> element - eventElementForState(). Versions 1 and 2 give the event's id, e.g.
 * <event id='EVENT_BUTTON_ON_RELEASE_playButton' ...>; version 3 its attributes, <event on='click'
 * target='playButton' ...>. A completion transition has neither.
 */
export function eventElement(t: Transition, w: Writing = { version: 1, mouseArea: "" }): string {
  const v2 = w.version >= 2;
  const newState = t.to ? ` newState='${t.to.xmlId}'` : "";
  const condition = isElse(t.guards) ? "else" : guardCondition(t.guards);
  const guard = condition ? ` guard='${escapeAttribute(condition)}'` : "";
  const final = t.final ? " final='true'" : t.terminate ? " terminate='true'" : "";
  // a completion transition (NEW) has no event, so no id: <event newState='...'>
  const legacy = w.version < 3 ? t.event.legacyId(w.mouseArea) : null;
  const id = legacy ? ` id='${legacy}'` : w.version === 3
    ? attributeText(
      t.event.attributes().map(
        ([name, value]): [string, string] => [name, escapeAttribute(value)],
      ),
    )
    : "";
  let s = NL + TAB + `<event${id}${newState}${final}${guard}${layout(t)}`;
  if (t.actions.length > 0) {
    s += ">";
    for (const action of t.actions) s += NL + TAB + TAB + actionText(action, v2);
    s += NL + TAB + "</event>";
  } else {
    s += "/>";
  }
  return s;
}

/** The layout attributes for an <event> (see the top of this file). Only edge points are written. */
function layout(t: Transition): string {
  if (t.path.length === 0) return "";
  const attributes: [string, string | number | null][] = [];
  const first = t.path[0];
  const last = t.path[t.path.length - 1];
  attributes.push(["fromPoint", edgePoint(first.start)]);
  if (t.path.length > 1 && first.end.state) {
    const choice = first.end.state;
    attributes.push(
      ["choiceX", Math.round(choice.x)],
      ["choiceY", Math.round(choice.y)],
      ["choiceInPoint", edgePoint(first.end)],
      ["choiceOutPoint", edgePoint(t.path[1].start)],
    );
  }
  attributes.push(...endLayout(last));
  return attributeText(attributes);
}

/** Where the last arrow of a transition ends: toPoint, plus where a final bullseye or terminate X is - or toX/toY. */
function endLayout(last: Connector): [string, string | number | null][] {
  const to = last.end.state;
  if (to?.isFinal) return [["toPoint", edgePoint(last.end)], ["finalX", Math.round(to.x)], ["finalY", Math.round(to.y)]];
  if (to?.isTerminate) {
    return [["toPoint", edgePoint(last.end)], ["terminateX", Math.round(to.x)], ["terminateY", Math.round(to.y)]];
  }
  if (to) return [["toPoint", edgePoint(last.end)]];
  return [["toX", Math.round(last.end.point.x)], ["toY", Math.round(last.end.point.y)]];
}

/** [["x", 100], ["fromPoint", null]] -> " x='100'" (null values are left out) */
function attributeText(attributes: [string, string | number | null][]): string {
  return attributes.filter(([, value]) => value !== null).map(([name, value]) => ` ${name}='${value}'`).join("");
}

/** The compass point an end is snapped to, e.g. "EAST" - or null if it is attached to the CENTER (or floating). */
function edgePoint(end: ConnectorEnd): string | null {
  return end.compass === null || end.compass === Compass.CENTER ? null : end.compass;
}

function escapeAttribute(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&apos;");
}
