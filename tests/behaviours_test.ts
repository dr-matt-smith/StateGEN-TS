// State behaviours: entry/, do/ (NEW) and exit/, shown inside the state box.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import { Diagram } from "../src/model/Diagram.ts";
import { DiagramState, wrapText } from "../src/model/DiagramState.ts";

function gumballSold() {
  const d = new Diagram();
  const sold = d.addState({ x: 200, y: 200 });
  sold.stateName = "GUMBALL SOLD";
  return { d, sold };
}

Deno.test("a state with no behaviours is the usual size", () => {
  const { sold } = gumballSold();
  assertEquals(sold.shownBehaviours(), []);
  assertEquals(sold.height, DiagramState.HEIGHT);
});

Deno.test("behaviours are listed the UML way: entry/, do/, exit/", () => {
  const { sold } = gumballSold();
  sold.exitActions = ["stopLight"];
  sold.enterActions = ["dispense", "beep"];
  sold.doActions = ["flash"];
  assertEquals(sold.shownBehaviours(), ["entry/ dispense,", "beep", "do/ flash", "exit/ stopLight"]);
});

Deno.test("a state showing its behaviours is taller; hiding them puts it back", () => {
  const { sold } = gumballSold();
  sold.enterActions = ["dispense"];
  sold.doActions = ["flash"];
  sold.exitActions = ["stopLight"];
  assert(sold.height > DiagramState.HEIGHT);
  try {
    DiagramState.showBehaviours = false;
    assertEquals(sold.shownBehaviours(), []);
    assertEquals(sold.height, DiagramState.HEIGHT);
  } finally {
    DiagramState.showBehaviours = true;
  }
});

Deno.test("the mouse finds a taller state all the way to its bottom edge", () => {
  const { d, sold } = gumballSold();
  sold.enterActions = ["dispense"];
  sold.doActions = ["flash"];
  sold.exitActions = ["stopLight"];
  const nearBottom = { x: sold.x, y: sold.y + sold.height / 2 - 2 };
  assert(nearBottom.y > sold.y + DiagramState.HEIGHT / 2, "below where the usual box would end");
  assertEquals(d.findStateAt(nearBottom), sold);
});

Deno.test("long behaviour names are split across lines", () => {
  assertEquals(wrapText("entry/ showGeneratedFilesNow", 10, true), ["entry/", "showGenera", "tedFilesNo", "w"]);
  // state names aren't (as before)
  assertEquals(wrapText("STATE_CONNECTOR_DRAG", 12), ["STATE_CONNECTOR_DRAG"]);
});

Deno.test("DO behaviours are saved as <doStateActions> (version 2), and read back", () => {
  const { d, sold } = gumballSold();
  sold.enterActions = ["dispense"];
  sold.doActions = ["flash", "spin"];
  const xml = generateXml(d);
  assertStringIncludes(xml, "<game version='2'>");
  assertStringIncludes(xml, "<doStateActions>");
  assertStringIncludes(xml, "<action call='spin'/>");

  const again = new Diagram();
  assertEquals(importXml(xml, again), []);
  assertEquals(again.states[0].doActions, ["flash", "spin"]);
  assertEquals(again.states[0].enterActions, ["dispense"]);
});

Deno.test("a wider state fits more of each behaviour on a line", () => {
  const { sold } = gumballSold();
  sold.enterActions = ["dispense", "beep", "flashTheLight"];
  const narrow = sold.shownBehaviours().length;
  sold.resizeTo(320, DiagramState.HEIGHT);
  assertEquals(sold.shownBehaviours(), ["entry/ dispense, beep, flashTheLight"]);
  assert(narrow > 1);
});

Deno.test("a resized state is saved with its size (version 2), and read back", () => {
  const { d, sold } = gumballSold();
  sold.resizeTo(260, 120);
  const xml = generateXml(d);
  assertStringIncludes(xml, "<game version='2'>");
  assertStringIncludes(xml, "width='260' height='120'");
  const again = new Diagram();
  assertEquals(importXml(xml, again), []);
  assertEquals(again.states[0].boxSize, { width: 260, height: 120 });
});

Deno.test("only real states resize: a choice diamond stays the same size", () => {
  const d = new Diagram();
  const choice = d.addChoice({ x: 100, y: 100 });
  const width = choice.width;
  choice.resizeTo(300, 300);
  assertEquals(choice.width, width);
  assert(!choice.onResizeHandle(choice.resizeHandle));
});
