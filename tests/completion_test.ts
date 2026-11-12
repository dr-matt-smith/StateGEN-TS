// Tests for completion transitions (NEW): an arrow with no event, followed as soon as the state it leaves
// has been entered. The gumball machine's GUMBALL SOLD state uses one:
//
//   GUMBALL SOLD --/ releaseGumball--> <choice> --[gumballs > 0]--> NO COIN
//                                               --[gumballs = 0]--> OUT OF GUMBALLS

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { EXAMPLES } from "../src/examples.ts";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import { Diagram } from "../src/model/Diagram.ts";
import { Compass } from "../src/model/geometry.ts";
import { gumballMachine } from "./choice_test.ts";

Deno.test("a completion transition's label is just its guard (or nothing)", () => {
  const d = new Diagram();
  const c = d.addConnector({ x: 0, y: 0 }, { x: 100, y: 0 });
  c.eventGroup = "completion";
  assertEquals(c.labelText(), "");
  c.guard = "gumballs > 0";
  assertEquals(c.labelText(), "[gumballs > 0]");
});

Deno.test("export: a completion transition is an <event> with no id, and makes the file version 2", () => {
  const xml = generateXml(gumballMachine());
  assertStringIncludes(xml, "<game version='2'>");
  assertStringIncludes(xml, "<event newState='STATE_NO_COIN' guard='gumballs &gt; 0'");
  assert(!xml.includes("ON_ENTER_FRAME"));
});

Deno.test("import: an <event> with no id is a completion transition, and re-exports the same XML", () => {
  const xml = generateXml(gumballMachine());
  const d = new Diagram();
  assertEquals(importXml(xml, d), []);
  const sold = d.states.find((s) => s.xmlId === "STATE_GUMBALL_SOLD")!;
  const out = d.connectors.filter((c) => c.start.state === sold);
  assertEquals(out.map((c) => c.eventGroup), ["completion"]);
  assertEquals(generateXml(d), xml);
});

Deno.test("the built-in gumball example uses completion transitions (no warnings)", () => {
  const example = EXAMPLES.find((e) => e.file === "gumball.xml")!;
  const d = new Diagram();
  assertEquals(importXml(example.xml, d), []);
  const choice = d.states.find((s) => s.isChoice)!;
  const into = d.connectors.find((c) => c.end.state === choice)!;
  assertEquals(into.eventGroup, "completion");
});

Deno.test("an arrow from the initial dot (completion by default) doesn't make the file version 2", () => {
  const d = new Diagram();
  const s = d.addState({ x: 200, y: 100 });
  const dot = d.addInitial({ x: 50, y: 100 });
  const c = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  c.start.snapTo(dot, Compass.CENTER);
  c.end.snapTo(s, Compass.CENTER);
  assertEquals(c.eventGroup, "completion");
  assert(!d.isVersion2);
  assertStringIncludes(generateXml(d), "<game>");
});
