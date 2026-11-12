// Tests for the terminate X (UML terminate pseudostate): "the object is deleted".

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { type EditorView, StateGenEditor } from "../src/editor/StateGenEditor.ts";
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

/** start -> ALIVE --click on shootButton--> ALIVE (count);  ALIVE --HIT [lives = 0] / explode--> X */
function alien(): Diagram {
  const d = new Diagram();
  const start = d.addInitial({ x: 60, y: 100 });
  const alive = d.addState({ x: 250, y: 100 });
  alive.stateName = "ALIVE";
  const x = d.addTerminate({ x: 500, y: 100 });
  arrow(d, start, alive);
  const shoot = arrow(d, alive, alive);
  shoot.eventGroup = "web";
  shoot.webEvent.on = "click";
  shoot.webEvent.target = "shootButton";
  shoot.actions = ["count"];
  const hit = arrow(d, alive, x);
  hit.eventGroup = "custom";
  hit.customEvent.eventName = "HIT";
  hit.guard = "lives = 0";
  hit.actions = ["explode"];
  return d;
}

Deno.test("an arrow into the terminate X deletes the object: a transition with terminate, to no state", () => {
  const d = alien();
  assertEquals(d.states.map((s) => s.kind), ["initial", "state", "terminate"]);
  assert(d.states[2].isRound && !d.states[2].isRealState);
  const hit = resolveTransitions(d).find((t) => t.terminate)!;
  assertEquals([hit.to, hit.final, hit.actions], [null, false, ["explode"]]);
});

Deno.test("export and import: terminate='true' and where the X is - and back again unchanged", () => {
  const xml = generateXml(alien());
  assertStringIncludes(xml, "terminate='true'");
  assertStringIncludes(xml, "terminateX='500' terminateY='100'");
  const back = new Diagram();
  assertEquals(importXml(xml, back), []);
  assertEquals(back.states.filter((s) => s.isTerminate).map((s) => [s.x, s.y]), [[500, 100]]);
  const line = (x: string) => x.split("\n").find((l) => l.includes("terminate="));
  assertEquals(line(generateXml(back)), line(xml));
  // (the self-loop gets compass points on its first import; after that, it comes back unchanged)
  const again = new Diagram();
  importXml(generateXml(back), again);
  assertEquals(generateXml(again), generateXml(back));
});

Deno.test("a terminate X makes the file version 2 at least (Flash didn't have it)", () => {
  const d = new Diagram();
  const a = d.addState({ x: 0, y: 0 });
  const b = d.addState({ x: 200, y: 0 });
  arrow(d, a, b).eventGroup = "frame";
  assertEquals(d.xmlVersion, 1);
  d.addTerminate({ x: 400, y: 0 });
  assertEquals(d.xmlVersion, 2);
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

Deno.test("editor: the terminate tool drags out a new X", () => {
  const editor = new StateGenEditor(new QuietView());
  editor.load();
  editor.newTerminateTool({ x: 20, y: 150 });
  assertEquals(editor.currentState.name, "STATE_STATE_DRAG");
  editor.mouseUp({ x: 300, y: 200 });
  assertEquals(editor.currentState.name, "STATE_SELECT");
  assertEquals(editor.diagram.states.map((s) => s.kind), ["terminate"]);
});
