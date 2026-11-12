// Tests for the initial dot and final bullseye (UML pseudostates), and for placing arrow labels.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { type EditorView, StateGenEditor } from "../src/editor/StateGenEditor.ts";
import { EXAMPLES } from "../src/examples.ts";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import { Diagram } from "../src/model/Diagram.ts";
import type { DiagramState } from "../src/model/DiagramState.ts";
import { Compass } from "../src/model/geometry.ts";
import { initialState, initialTransitions, resolveTransitions } from "../src/model/Transitions.ts";
import { placeLabels } from "../src/view/labels.ts";

function arrow(d: Diagram, from: DiagramState, to: DiagramState) {
  const c = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  c.start.snapTo(from, Compass.CENTER);
  c.end.snapTo(to, Compass.CENTER);
  return c;
}

/** start -> PLAYING --GAME_OVER--> (final);  PLAYING --QUIT--> <choice> --[saved]--> (final), [else] -> MENU */
function game(): Diagram {
  const d = new Diagram();
  const start = d.addInitial({ x: 100, y: 100 });
  const menu = d.addState({ x: 300, y: 300 });
  menu.stateName = "MENU";
  const playing = d.addState({ x: 300, y: 100 });
  playing.stateName = "PLAYING";
  const end = d.addFinal({ x: 550, y: 100 });
  const choice = d.addChoice({ x: 550, y: 300 });
  arrow(d, start, playing);
  const over = arrow(d, playing, end);
  over.eventGroup = "custom";
  over.customEvent.eventName = "GAME_OVER";
  over.actions = ["showScore"];
  const quit = arrow(d, playing, choice);
  quit.eventGroup = "custom";
  quit.customEvent.eventName = "QUIT";
  arrow(d, choice, end).guard = "saved";
  arrow(d, choice, menu).guard = "else";
  return d;
}

Deno.test("the initial dot says which state is first; it isn't a transition", () => {
  const d = game();
  assertEquals(initialState(d)?.stateName, "PLAYING");
  const transitions = resolveTransitions(d);
  assert(transitions.every((t) => t.from.isRealState));
  assertEquals(d.connectors[0].labelText(), "");
});

Deno.test("an arrow into the final bullseye ends the state machine - directly, or through a choice", () => {
  const transitions = resolveTransitions(game());
  assertEquals(transitions.map((t) => [t.event.label(), t.guards.join(), t.final, t.to?.stateName ?? null]), [
    ["GAME_OVER", "", true, null],
    ["QUIT", "saved", true, null],
    ["QUIT", "else", false, "MENU"],
  ]);
});

Deno.test("export: <initialState>, and final='true' on the events that end it", () => {
  const xml = generateXml(game());
  assertStringIncludes(xml, "<initialState newState='STATE_PLAYING' x='100' y='100'/>");
  assertStringIncludes(xml, "<event id='EVENT_USER_DEFINED_GAME_OVER' final='true' finalX='550' finalY='100'>");
  assertStringIncludes(xml, "<event id='EVENT_USER_DEFINED_QUIT' final='true' guard='saved'");
  assert(!xml.includes("STATE_INITIAL") && !xml.includes("<state id='STATE_FINAL"), "no <state> for either");
});

Deno.test("import: the initial dot and final bullseye come back, and re-export the same XML", () => {
  const xml = generateXml(game());
  const d = new Diagram();
  assertEquals(importXml(xml, d), []);
  assertEquals(d.states.filter((s) => s.isInitial).length, 1);
  assertEquals(d.states.filter((s) => s.isFinal).length, 1); // both arrows go to the same bullseye
  assertEquals(initialState(d)?.stateName, "PLAYING");
  assertEquals(generateXml(d), xml);
});

Deno.test("the gumball example's initial dot points at the choice: NO COIN or OUT OF GUMBALLS", () => {
  const d = new Diagram();
  importXml(EXAMPLES.find((e) => e.file === "gumball.xml")!.xml, d);
  assertEquals(initialState(d), null, "no single first state: it depends on the guard");
  assertEquals(
    initialTransitions(d).map((t) => [t.guards.join(), t.to?.stateName]),
    [["gumballs > 0", "NO COIN"], ["gumballs == 0", "OUT OF GUMBALLS"]],
  );
  assertEquals(initialTransitions(d).map((t) => t.actions), [[], []], "GUMBALL SOLD's releaseGumball isn't shared");
});

Deno.test("the round shapes: compass points on the circle, an end dropped inside goes to the center", () => {
  const d = new Diagram();
  const dot = d.addInitial({ x: 100, y: 100 });
  const end = d.addFinal({ x: 300, y: 100 });
  assertEquals(dot.compassPoint(Compass.EAST), { x: 111, y: 100 });
  assertEquals(
    Math.round(Math.hypot(end.compassPoint(Compass.NORTH_EAST).x - 300, end.compassPoint(Compass.NORTH_EAST).y - 100)),
    14,
  );
  const c = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  d.dragEndTo(c.end, { x: 302, y: 101 });
  assertEquals([c.end.state, c.end.compass], [end, Compass.CENTER]);
});

Deno.test("the round shapes have no edge points: an arrow end can only attach to the center", () => {
  const d = new Diagram();
  const dot = d.addInitial({ x: 100, y: 100 });
  const end = d.addFinal({ x: 300, y: 100 });
  assertEquals([dot.snapPoints, end.snapPoints], [[], []]);
  const c = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  // dropped just outside the bullseye's edge - still its center
  d.dragEndTo(c.end, { x: 300 + 14 + 8, y: 100 });
  assertEquals([c.end.state, c.end.compass], [end, Compass.CENTER]);
  // asking for an edge point (e.g. an old game.xml with toPoint='EAST') gives the center too
  c.start.snapTo(dot, Compass.EAST);
  assertEquals(c.start.compass, Compass.CENTER);
  // ...and it's drawn from the edge facing the other end
  assertEquals(c.start.point, { x: 111, y: 100 });
});

class QuietView implements EditorView {
  drawScene(): void {}
  showProperties(): void {}
  showExportScreen(): void {}
  showDiagramScreen(): void {}
  stateChanged(): void {}
  diagramLoaded(): void {}
  showMessage(): void {}
}

Deno.test("editor: the initial and final tools drag out new shapes", () => {
  const editor = new StateGenEditor(new QuietView());
  editor.load();
  editor.newInitialTool({ x: 20, y: 150 });
  assertEquals(editor.currentState.name, "STATE_STATE_DRAG");
  editor.mouseUp({ x: 200, y: 200 });
  editor.newFinalTool({ x: 20, y: 180 });
  editor.mouseUp({ x: 400, y: 200 });
  assertEquals(editor.diagram.states.map((s) => s.kind), ["initial", "final"]);
  assertEquals(editor.currentState.name, "STATE_SELECT");
});

Deno.test("labels: two parallel arrows get their labels apart; a lone label stays above the middle", () => {
  const [alone] = placeLabels([{ from: { x: 0, y: 0 }, to: { x: 200, y: 0 }, width: 100, height: 18 }]);
  assertEquals(alone, { x: 100, y: -17 });

  // like FILM PLAYING: two arrows going up, 60 pixels apart, with long labels
  const [a, b] = placeLabels([
    { from: { x: 100, y: 300 }, to: { x: 100, y: 0 }, width: 160, height: 18 },
    { from: { x: 160, y: 0 }, to: { x: 160, y: 300 }, width: 230, height: 18 },
  ]);
  assertEquals(a, { x: 100, y: 133 });
  assert(Math.abs(a.y - b.y) >= 20, `labels at ${a.y} and ${b.y} overlap`);
  assertEquals(b.x, 160, "a label slides along its own arrow");
});
