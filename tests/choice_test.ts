// Tests for choice (decision) diamonds and guard conditions, using the gumball machine:
//
//   NO COIN --COIN_INSERTED--> HAS COIN --CRANK_TURNED--> GUMBALL SOLD --> <choice>
//   <choice> --[gumballs > 0]--> NO COIN
//   <choice> --[gumballs = 0]--> OUT OF GUMBALLS

import { assert, assertEquals, assertStrictEquals, assertStringIncludes } from "@std/assert";
import { type EditorView, StateGenEditor } from "../src/editor/StateGenEditor.ts";
import { EXAMPLES } from "../src/examples.ts";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import { Diagram } from "../src/model/Diagram.ts";
import type { DiagramState } from "../src/model/DiagramState.ts";
import { Compass } from "../src/model/geometry.ts";
import { resolveTransitions } from "../src/model/Transitions.ts";

function arrow(d: Diagram, from: DiagramState, to: DiagramState) {
  const c = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  c.start.snapTo(from, Compass.CENTER);
  c.end.snapTo(to, Compass.CENTER);
  return c;
}

function userEvent(c: ReturnType<typeof arrow>, name: string) {
  c.eventGroup = "custom";
  c.customEvent.eventName = name;
  return c;
}

/** The gumball machine from the lecture's UML diagram. */
export function gumballMachine(): Diagram {
  const d = new Diagram();
  const state = (name: string, x: number, y: number) => {
    const s = d.addState({ x, y });
    s.stateName = name;
    return s;
  };
  const noCoin = state("NO COIN", 200, 120);
  const hasCoin = state("HAS COIN", 700, 120);
  const sold = state("GUMBALL SOLD", 700, 330);
  const out = state("OUT OF GUMBALLS", 200, 450);
  const choice = d.addChoice({ x: 450, y: 330 });

  userEvent(arrow(d, noCoin, hasCoin), "COIN INSERTED");
  userEvent(arrow(d, hasCoin, sold), "CRANK TURNED");
  const sell = arrow(d, sold, choice);
  sell.eventGroup = "completion"; // no event: followed as soon as GUMBALL SOLD is entered
  sell.actions = ["releaseGumball"];
  arrow(d, choice, noCoin).guard = "gumballs > 0";
  arrow(d, choice, out).guard = "gumballs = 0";
  return d;
}

Deno.test("a choice is followed through: GUMBALL SOLD gets two guarded transitions", () => {
  const transitions = resolveTransitions(gumballMachine());
  const fromSold = transitions.filter((t) => t.from.stateName === "GUMBALL SOLD");
  assertEquals(fromSold.length, 2);
  assertEquals(fromSold.map((t) => t.guards), [["gumballs > 0"], ["gumballs = 0"]]);
  assertEquals(fromSold.map((t) => t.to?.stateName), ["NO COIN", "OUT OF GUMBALLS"]);
  assertEquals(fromSold[0].actions, ["releaseGumball"]);
  // nothing starts at the choice itself
  assert(transitions.every((t) => !t.from.isChoice));
});

Deno.test("export: guards are a guard='...' attribute, and the choice itself isn't written", () => {
  const xml = generateXml(gumballMachine());
  // (choiceX/choiceY: where the diamond is drawn, so importing puts it back there)
  assertStringIncludes(
    xml,
    "<event newState='STATE_NO_COIN' guard='gumballs &gt; 0' choiceX='450' choiceY='330'>" +
      "\n\t\t<action call='releaseGumball'/>",
  );
  assertStringIncludes(
    xml,
    "<event newState='STATE_OUT_OF_GUMBALLS' guard='gumballs = 0' choiceX='450' choiceY='330'>",
  );
  assert(!xml.includes("CHOICE"), "no choice state in the XML");
});

Deno.test("import: same event + different guards becomes a choice again, and re-exports the same XML", () => {
  const xml = generateXml(gumballMachine());
  const d = new Diagram();
  importXml(xml, d);
  const choices = d.states.filter((s) => s.isChoice);
  assertEquals(choices.length, 1);
  const outs = d.connectors.filter((c) => c.start.state === choices[0]);
  assertEquals(outs.map((c) => c.guard), ["gumballs > 0", "gumballs = 0"]);
  assertEquals(generateXml(d), xml);
});

Deno.test("an [else] guard is saved in the XML", () => {
  const d = gumballMachine();
  d.connectors[4].guard = "else";
  assertStringIncludes(generateXml(d), "guard='else'");
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

Deno.test("editor: the choice tool drags a new diamond; connectors snap inside it; labels show guards", () => {
  const editor = new StateGenEditor(new QuietView());
  editor.load();
  editor.newChoiceTool({ x: 20, y: 120 });
  assertEquals(editor.currentState.name, "STATE_STATE_DRAG");
  editor.mouseMove({ x: 400, y: 300 });
  editor.mouseUp({ x: 400, y: 300 });
  const choice = editor.diagram.states[0];
  assert(choice.isChoice);
  assertStrictEquals(editor.selectedState, choice);

  // inside the diamond -> its center; just outside it (but inside its bounding box) -> not attached
  editor.newConnectorTool({ x: 40, y: 80 });
  editor.mouseMove({ x: 446, y: 270 }); // inside the bounding box, outside the diamond, not near a snap point
  assertEquals(editor.diagram.connectors[0].start.state, null);
  editor.mouseMove({ x: 405, y: 305 });
  editor.mouseUp({ x: 405, y: 305 });
  const c = editor.diagram.connectors[0];
  assertStrictEquals(c.start.state, choice);
  assertEquals(c.start.compass, Compass.CENTER);
  // the line leaves the diamond on its edge
  const p = c.start.point;
  assertEquals(Math.round((Math.abs(p.x - 400) / 48 + Math.abs(p.y - 300) / 32) * 1000), 1000);

  c.guard = "gumballs > 0";
  assertEquals(c.labelText(), "[gumballs > 0]");
  // an arrow NOT out of a choice shows its event too
  c.start.floatAt({ x: 0, y: 0 });
  c.eventGroup = "frame";
  assertEquals(c.labelText(), "animationFrame [gumballs > 0]");
});

Deno.test("the initial dot can point at a choice: <initialState> with guarded <event>s, and back again", () => {
  // the gumball machine, starting at the same choice GUMBALL SOLD goes to
  const d = gumballMachine();
  const choice = d.states.find((s) => s.isChoice)!;
  arrow(d, d.addInitial({ x: 300, y: 330 }), choice);

  const xml = generateXml(d);
  assertStringIncludes(
    xml,
    "<initialState x='300' y='330' choiceX='450' choiceY='330'>\n" +
      "\t<event newState='STATE_NO_COIN' guard='gumballs &gt; 0'/>\n" +
      "\t<event newState='STATE_OUT_OF_GUMBALLS' guard='gumballs = 0'/>\n" +
      "</initialState>",
  );

  const back = new Diagram();
  assertEquals(importXml(xml, back), []);
  // the dot and GUMBALL SOLD share one diamond again
  assertEquals(back.states.filter((s) => s.isChoice).length, 1);
  const dot = back.states.find((s) => s.isInitial)!;
  assert(back.connectors.some((c) => c.start.state === dot && c.end.state?.isChoice));
  assertEquals(generateXml(back), xml);
});

Deno.test("the gumball example (initial dot -> choice) imports, then exports, the same XML as it was saved", () => {
  const gumball = EXAMPLES.find((e) => e.file === "gumball.xml")!;
  const d = new Diagram();
  assertEquals(importXml(gumball.xml, d), []);
  // (ignoring a newline at the end of the file, which text editors add when it is saved by hand)
  assertEquals(generateXml(d), gumball.xml.trimEnd());
});
