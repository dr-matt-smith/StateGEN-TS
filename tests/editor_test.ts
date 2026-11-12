// Tests for the editor's State pattern: does each event move the editor to the right state, and do the
// states do the right thing to the diagram? A FakeView stands in for the browser.

import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import type { Editor, EditorView } from "../src/editor/Editor.ts";
import { StateGenEditor } from "../src/editor/StateGenEditor.ts";
import { Compass } from "../src/model/geometry.ts";

class FakeView implements EditorView {
  states: string[] = [];
  exported: { xml: string } | null = null;
  messages: string[] = [];
  drawScene(): void {}
  showProperties(): void {}
  showExportScreen(xml: string): void {
    this.exported = { xml };
  }
  showDiagramScreen(): void {
    this.exported = null;
  }
  stateChanged(newState: { readonly name: string }): void {
    this.states.push(newState.name);
  }
  showMessage(text: string): void {
    this.messages.push(text);
  }
  diagramLoaded(): void {}
}

type MakeEditor = (view: FakeView) => Editor;

/** A test of the editor (it is given a way to make one) */
function test(name: string, fn: (make: MakeEditor) => void): void {
  Deno.test(name, () => fn((view) => new StateGenEditor(view)));
}

function startEditor(make: MakeEditor): { editor: Editor; view: FakeView } {
  const view = new FakeView();
  const editor = make(view);
  editor.load();
  return { editor, view };
}

/** press the new state tool, drag to `to`, let go */
function dragNewState(editor: Editor, to: { x: number; y: number }) {
  editor.newStateTool({ x: 20, y: 60 });
  editor.mouseMove(to);
  editor.mouseUp(to);
  return editor.diagram.states[editor.diagram.states.length - 1];
}

test("the editor starts in STATE_GAME_LOADING, and EVENT_ON_LOAD takes it to STATE_SELECT", (make) => {
  const editor = make(new FakeView());
  assertEquals(editor.currentState.name, "STATE_GAME_LOADING");
  editor.load();
  assertEquals(editor.currentState.name, "STATE_SELECT");
});

test("new state tool: SELECT -> STATE DRAG -> (mouse up) -> SELECT, leaving a selected state", (make) => {
  const { editor, view } = startEditor(make);
  editor.newStateTool({ x: 20, y: 60 });
  assertEquals(editor.currentState.name, "STATE_STATE_DRAG");
  editor.mouseMove({ x: 300, y: 200 });
  editor.mouseUp({ x: 300, y: 200 });
  assertEquals(editor.currentState.name, "STATE_SELECT");
  assertEquals(view.states, ["STATE_SELECT", "STATE_STATE_DRAG", "STATE_SELECT"]);

  const state = editor.diagram.states[0];
  assertEquals([state.x, state.y], [300, 200]);
  assertEquals(state.stateName, "state1");
  assertStrictEquals(editor.selectedState, state);
});

test("mouse down on a state selects it and drags it, without it jumping", (make) => {
  const { editor } = startEditor(make);
  const state = dragNewState(editor, { x: 300, y: 200 });
  editor.mouseDown({ x: 310, y: 205 }); // 10 right, 5 down from its center
  assertEquals(editor.currentState.name, "STATE_STATE_DRAG");
  editor.mouseMove({ x: 410, y: 305 });
  editor.mouseUp({ x: 410, y: 305 });
  assertEquals([state.x, state.y], [400, 300]);
});

test("mouse down on empty space deselects, and stays in SELECT", (make) => {
  const { editor } = startEditor(make);
  dragNewState(editor, { x: 300, y: 200 });
  editor.mouseDown({ x: 700, y: 500 });
  assertEquals(editor.currentState.name, "STATE_SELECT");
  assertEquals(editor.selectedState, null);
});

test("new connector tool: drag its start onto a state's compass point and it snaps", (make) => {
  const { editor, view } = startEditor(make);
  const state = dragNewState(editor, { x: 300, y: 200 });
  const east = state.compassPoint(Compass.EAST);

  editor.newConnectorTool({ x: 40, y: 80 });
  assertEquals(editor.currentState.name, "STATE_CONNECTOR_DRAG");
  editor.mouseMove({ x: east.x + 4, y: east.y - 3 }); // close enough to snap
  editor.mouseUp({ x: east.x + 4, y: east.y - 3 });
  assertEquals(view.states.at(-1), "STATE_SELECT");

  const connector = editor.diagram.connectors[0];
  assertStrictEquals(connector.start.state, state);
  assertEquals(connector.start.compass, Compass.EAST);
  assertEquals(connector.start.point, east);
  assert(connector.end.isFloating);
  assertEquals(connector.end.point, StateGenEditor.NEW_CONNECTOR_END);
});

test("dragging a connector's END, then moving the state - the connector follows", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 200 });
  const b = dragNewState(editor, { x: 500, y: 200 });
  editor.newConnectorTool({ x: 40, y: 80 });
  const aEast = a.compassPoint(Compass.EAST);
  editor.mouseMove(aEast);
  editor.mouseUp(aEast);

  // grab the end (still at the top-left) and drop it on b's WEST point
  editor.mouseDown(StateGenEditor.NEW_CONNECTOR_END);
  assertEquals(editor.currentState.name, "STATE_CONNECTOR_DRAG");
  editor.mouseMove(b.compassPoint(Compass.WEST));
  editor.mouseUp(b.compassPoint(Compass.WEST));

  const connector = editor.diagram.connectors[0];
  assertStrictEquals(connector.end.state, b);

  // move b: the connector end goes with it
  editor.mouseDown({ x: 500, y: 200 });
  editor.mouseMove({ x: 500, y: 400 });
  editor.mouseUp({ x: 500, y: 400 });
  assertEquals(connector.end.point, b.compassPoint(Compass.WEST));
  assertEquals(connector.end.point.y, 400);
});

test("mouse down on a connector's center: CONNECTOR MOVE, both ends come loose", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 300 });
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseMove(a.compassPoint(Compass.NORTH));
  editor.mouseUp(a.compassPoint(Compass.NORTH));
  const connector = editor.diagram.connectors[0];
  const center = connector.center;

  editor.mouseDown(center);
  assertEquals(editor.currentState.name, "STATE_CONNECTOR_MOVE");
  assertStrictEquals(editor.selectedConnector, connector);
  editor.mouseMove({ x: center.x + 50, y: center.y + 10 });
  editor.mouseUp({ x: center.x + 50, y: center.y + 10 });
  assertEquals(editor.currentState.name, "STATE_SELECT");
  assert(connector.start.isFloating);
  assertEquals(connector.center, { x: center.x + 50, y: center.y + 10 });
});

test("clicking a connector's center selects it, but leaves it snapped to its states", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 300 });
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseMove(a.compassPoint(Compass.NORTH));
  editor.mouseUp(a.compassPoint(Compass.NORTH));
  const connector = editor.diagram.connectors[0];

  editor.mouseDown(connector.center);
  editor.mouseUp(connector.center);
  assertEquals(editor.selectedConnector, connector);
  assertEquals(connector.start.state, a);
});

test("the # key deletes the selected state; connectors attached to it are left floating", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 300 });
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseMove(a.compassPoint(Compass.SOUTH));
  editor.mouseUp(a.compassPoint(Compass.SOUTH));
  const connector = editor.diagram.connectors[0];

  editor.mouseDown({ x: 200, y: 300 });
  editor.mouseUp({ x: 200, y: 300 });
  editor.deleteKey();
  assertEquals(editor.diagram.states.length, 0);
  assertEquals(editor.diagram.connectors.length, 1);
  assert(connector.start.isFloating);
  assertEquals(editor.selectedState, null);
});

test("the # key deletes the selected connector", (make) => {
  const { editor } = startEditor(make);
  editor.newConnectorTool({ x: 300, y: 300 });
  editor.mouseUp({ x: 300, y: 300 });
  assertStrictEquals(editor.selectedConnector, editor.diagram.connectors[0]);
  editor.deleteKey();
  assertEquals(editor.diagram.connectors.length, 0);
});

test("events a state doesn't handle are ignored (e.g. delete while dragging)", (make) => {
  const { editor } = startEditor(make);
  editor.newStateTool({ x: 100, y: 100 });
  editor.deleteKey();
  editor.exportXml();
  assertEquals(editor.currentState.name, "STATE_STATE_DRAG");
  assertEquals(editor.diagram.states.length, 1);
});

test("export: EXPORT XML shows the files, back to diagram returns to SELECT", (make) => {
  const { editor, view } = startEditor(make);
  dragNewState(editor, { x: 300, y: 200 }).stateName = "MAIN MENU";
  editor.exportXml();
  assertEquals(editor.currentState.name, "STATE_EXPORT_XML");
  assert(view.exported?.xml.includes("<state id='STATE_MAIN_MENU'"));
  editor.backToDiagram();
  assertEquals(editor.currentState.name, "STATE_SELECT");
  assertEquals(view.exported, null);
});

test("import replaces the diagram and reports problems", (make) => {
  const { editor, view } = startEditor(make);
  dragNewState(editor, { x: 300, y: 200 });
  editor.importXml(
    "<game><state id='STATE_A'><event id='EVENT_ON_LOAD' newState='STATE_B'/></state><state id='STATE_B'/></game>",
  );
  assertEquals(editor.diagram.states.map((s) => s.xmlId), ["STATE_A", "STATE_B"]);
  assertEquals(view.messages.length, 1);
  editor.importXml("not xml at all");
  assert(view.messages[1].startsWith("Could not import"));
  assertEquals(editor.diagram.states.length, 2); // unchanged
});

test("dropping a connector end INSIDE a state attaches it to the state's center", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 200 });
  const b = dragNewState(editor, { x: 500, y: 200 });
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseMove({ x: 190, y: 210 }); // inside a, nowhere near a compass point
  editor.mouseUp({ x: 190, y: 210 });
  editor.mouseDown(StateGenEditor.NEW_CONNECTOR_END);
  editor.mouseMove({ x: 510, y: 190 }); // inside b
  editor.mouseUp({ x: 510, y: 190 });

  const connector = editor.diagram.connectors[0];
  assertStrictEquals(connector.start.state, a);
  assertEquals(connector.start.compass, Compass.CENTER);
  assertStrictEquals(connector.end.state, b);
  assertEquals(connector.end.compass, Compass.CENTER);
  // the line runs center to center, but stops at the outlines (so the arrow head isn't under state b)
  assertEquals(connector.start.point, a.compassPoint(Compass.EAST));
  assertEquals(connector.end.point, b.compassPoint(Compass.WEST));

  // move b down: the end slides round b's outline to keep pointing at a's center
  editor.mouseDown({ x: 500, y: 200 });
  editor.mouseMove({ x: 500, y: 500 });
  editor.mouseUp({ x: 500, y: 500 });
  const end = connector.end.point;
  assert(end.x < 500 && end.y < 500, "end is on b's upper-left, facing a");
});

test("near one of the 8 compass points (even just inside the state) beats the center", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 200 });
  const north = a.compassPoint(Compass.NORTH);
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseMove({ x: north.x + 8, y: north.y + 12 }); // 14 pixels away, inside the box
  editor.mouseUp({ x: north.x + 8, y: north.y + 12 });
  assertEquals(editor.diagram.connectors[0].start.compass, Compass.NORTH);
});

test("a center end's outline point is on the rounded corner, not the square corner", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 200 });
  // diagonally down-right, through the corner
  const p = a.outlinePointToward({ x: 200 + 700, y: 200 + 360 });
  const corner = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  assert(p.x < corner.x && p.y < corner.y, "inside the square corner");
  // and exactly on the corner circle
  const cx = a.x + a.width / 2 - a.cornerRadius;
  const cy = a.y + a.height / 2 - a.cornerRadius;
  assertEquals(Math.round(Math.hypot(p.x - cx, p.y - cy) * 1000) / 1000, Math.round(a.cornerRadius * 1000) / 1000);
});

test("the diagonal compass points are on the rounded outline", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 200 });
  const ne = a.compassPoint(Compass.NORTH_EAST);
  const onOutline = a.outlinePointToward(ne);
  assertEquals(Math.round(onOutline.x * 1000), Math.round(ne.x * 1000));
  assertEquals(Math.round(onOutline.y * 1000), Math.round(ne.y * 1000));
});

test("connector labels: target.event for a web event; a custom event shows just its name", (make) => {
  const { editor } = startEditor(make);
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseUp({ x: 40, y: 80 });
  const c = editor.diagram.connectors[0];
  // a new arrow has no event: a completion transition, so no label
  assertEquals(c.eventGroup, "completion");
  assertEquals(c.event.label(), "");
  c.eventGroup = "frame";
  assertEquals(c.event.label(), "animationFrame"); // (its version 1/2 id is still EVENT_ON_ENTER_FRAME)
  c.eventGroup = "web";
  c.webEvent.target = "playButton";
  assertEquals(c.event.label(), "playButton.click"); // (EVENT_BUTTON_ON_RELEASE_playButton)
  c.eventGroup = "custom";
  c.customEvent.eventName = "COIN INSERTED";
  assertEquals(c.event.label(), "COIN_INSERTED");
  // user defined event names keep the case they were typed in
  c.customEvent.eventName = "coin inserted";
  assertEquals(c.event.label(), "coin_inserted");
  c.customEvent.eventName = "coinInserted";
  assertEquals(c.event.label(), "coinInserted");
  assertEquals(c.event.legacyId(""), "EVENT_USER_DEFINED_coinInserted");
});

// ----- NEW: clicking an arrow's label selects it (and dragging it moves it); Ctrl/Cmd-D duplicates

/** two states, A at (200, 300) and B at (600, 300), and an arrow from A to B */
function twoStatesAndAnArrow(editor: Editor) {
  const a = dragNewState(editor, { x: 200, y: 300 });
  const b = dragNewState(editor, { x: 600, y: 300 });
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseMove(a.compassPoint(Compass.EAST));
  editor.mouseUp(a.compassPoint(Compass.EAST));
  const arrow = editor.diagram.connectors[0];
  arrow.end.snapTo(b, Compass.WEST);
  return { a, b, arrow };
}

test("clicking an arrow's label selects the arrow; it stays attached", (make) => {
  const { editor } = startEditor(make);
  const { arrow } = twoStatesAndAnArrow(editor);
  // (the view says where it drew the label - here, well away from the arrow)
  arrow.labelBox = { x: 400, y: 150, width: 120, height: 18 };
  editor.mouseDown({ x: 200, y: 300 }); // select A first
  assert(editor.selectedState !== null);
  editor.mouseUp({ x: 200, y: 300 });

  editor.mouseDown({ x: 450, y: 155 });
  assertEquals(editor.currentState.name, "STATE_CONNECTOR_MOVE");
  assertStrictEquals(editor.selectedConnector, arrow);
  assertEquals(editor.selectedState, null);
  editor.mouseUp({ x: 450, y: 155 });
  assertEquals(editor.currentState.name, "STATE_SELECT");
  assert(!arrow.start.isFloating && !arrow.end.isFloating, "a click doesn't move it");
});

test("dragging an arrow's label moves the arrow as far as the mouse moves (no jump)", (make) => {
  const { editor } = startEditor(make);
  const { arrow } = twoStatesAndAnArrow(editor);
  arrow.labelBox = { x: 400, y: 150, width: 120, height: 18 };
  const center = arrow.center;
  editor.mouseDown({ x: 450, y: 155 });
  editor.mouseMove({ x: 480, y: 175 });
  editor.mouseUp({ x: 480, y: 175 });
  assertEquals(arrow.center, { x: center.x + 30, y: center.y + 20 });
  assert(arrow.start.isFloating && arrow.end.isFloating, "like dragging its center: the ends come loose");
});

test("a label on top of a state: pressing it grabs the arrow, not the state", (make) => {
  const { editor } = startEditor(make);
  const { arrow } = twoStatesAndAnArrow(editor);
  arrow.labelBox = { x: 200, y: 300, width: 120, height: 18 }; // right over state A
  editor.mouseDown({ x: 200, y: 300 });
  assertStrictEquals(editor.selectedConnector, arrow);
  assertEquals(editor.currentState.name, "STATE_CONNECTOR_MOVE");
});

test("Ctrl/Cmd-D duplicates the selected state, a little down and right, with the next free name", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 300 });
  a.stateName = "NO COIN";
  a.enterActions = ["beep"];
  editor.duplicateKey();
  assertEquals(editor.diagram.states.length, 2);
  const copy = editor.diagram.states[1];
  assertStrictEquals(editor.selectedState, copy);
  assertEquals([copy.x, copy.y], [230, 330]);
  assertEquals(copy.stateName, "NO COIN 2");
  assertEquals(copy.enterActions, ["beep"]);
  copy.enterActions.push("boop");
  assertEquals(a.enterActions, ["beep"], "the copy has its own list");
  editor.duplicateKey();
  assertEquals(editor.diagram.states[2].stateName, "NO COIN 3");
  assertEquals(editor.currentState.name, "STATE_SELECT");
});

test("Ctrl/Cmd-D duplicates the selected arrow: same states, same event, curving apart", (make) => {
  const { editor } = startEditor(make);
  const { a, b, arrow } = twoStatesAndAnArrow(editor);
  arrow.eventGroup = "custom";
  arrow.customEvent.eventName = "COIN_INSERTED";
  arrow.guard = "gumballs > 0";
  editor.mouseDown(arrow.center);
  editor.mouseUp(arrow.center);
  assertStrictEquals(editor.selectedConnector, arrow);
  editor.duplicateKey();
  assertEquals(editor.diagram.connectors.length, 2);
  const copy = editor.diagram.connectors[1];
  assertStrictEquals(editor.selectedConnector, copy);
  assertStrictEquals(copy.start.state, a);
  assertStrictEquals(copy.end.state, b);
  assertEquals(copy.event.legacyId(""), "EVENT_USER_DEFINED_COIN_INSERTED");
  assertEquals(copy.guard, "gumballs > 0");
  editor.diagram.updateBends();
  assert(copy.isCurved && arrow.isCurved);
});

test("Ctrl/Cmd-D with nothing selected does nothing", (make) => {
  const { editor } = startEditor(make);
  dragNewState(editor, { x: 200, y: 300 });
  editor.mouseDown({ x: 900, y: 900 });
  editor.mouseUp({ x: 900, y: 900 });
  editor.duplicateKey();
  assertEquals(editor.diagram.states.length, 1);
});

// ----- NEW: resizing a state by dragging the resize handle (its bottom-right corner) while it is selected

test("drag the selected state's corner: SELECT -> STATE_STATE_RESIZE -> SELECT, top-left stays put", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 300 }); // (selected)
  const left = a.x - a.width / 2;
  const top = a.y - a.height / 2;
  const corner = a.resizeHandle;

  editor.mouseDown({ x: corner.x - 2, y: corner.y - 2 }); // just inside the handle
  assertEquals(editor.currentState.name, "STATE_STATE_RESIZE");
  editor.mouseMove({ x: corner.x + 98, y: corner.y + 38 });
  editor.mouseUp({ x: corner.x + 98, y: corner.y + 38 });
  assertEquals(editor.currentState.name, "STATE_SELECT");
  assertEquals([a.width, a.height], [240, 112]);
  assertEquals([a.x - a.width / 2, a.y - a.height / 2], [left, top]);
  assertStrictEquals(editor.selectedState, a);
});

test("a state can't be resized smaller than the minimum", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 300 });
  const corner = a.resizeHandle;
  editor.mouseDown(corner);
  editor.mouseMove({ x: 0, y: 0 });
  editor.mouseUp({ x: 0, y: 0 });
  assertEquals([a.width, a.height], [80, 40]);
});

test("the resize handle is only there while the state is selected", (make) => {
  const { editor } = startEditor(make);
  const a = dragNewState(editor, { x: 200, y: 300 });
  editor.mouseDown({ x: 900, y: 900 }); // deselect
  editor.mouseUp({ x: 900, y: 900 });
  editor.mouseDown(a.resizeHandle);
  assertEquals(editor.currentState.name, "STATE_STATE_DRAG"); // just picks the state up (its corner is inside)
  editor.mouseUp(a.resizeHandle);
  assertEquals(a.width, 140);
});
