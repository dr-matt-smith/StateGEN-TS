// Tests for the layout: arrows imported to state centers, the layout saved in game.xml, and "tidy up".

import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { EXAMPLES } from "../src/examples.ts";
import { REMOVED_EXAMPLES } from "./fixtures/removed_examples.ts";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import { Diagram } from "../src/model/Diagram.ts";
import { Compass } from "../src/model/geometry.ts";
import { segmentHitsBox, segmentsCross, separateParallelConnectors, tidyUp } from "../src/model/Layout.ts";
import { gumballMachine } from "./choice_test.ts";

/** How many pairs of arrows cross, and how many arrows run through a state that isn't one of their ends. */
function untidiness(d: Diagram): { crossings: number; throughStates: number } {
  const lines = d.connectors.map((c) => ({ c, p: c.start.point, q: c.end.point }));
  let crossings = 0;
  let throughStates = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (segmentsCross(lines[i].p, lines[i].q, lines[j].p, lines[j].q)) crossings++;
    }
    for (const s of d.states) {
      const { c, p, q } = lines[i];
      if (s !== c.start.state && s !== c.end.state && segmentHitsBox(p, q, s, -2)) throughStates++;
    }
  }
  return { crossings, throughStates };
}

Deno.test("import without a layout: tidied up, with arrows attached to the CENTER of their states", () => {
  const gumball = EXAMPLES.find((e) => e.file === "gumball.xml")!;
  const d = new Diagram();
  importXml(gumball.xml, d);
  for (const c of d.connectors) {
    assertEquals(c.start.compass, Compass.CENTER);
    assertEquals(c.end.compass, Compass.CENTER);
  }
  assertEquals(untidiness(d), { crossings: 0, throughStates: 0 });
});

Deno.test("import without a layout: arrows both ways between two states are moved apart", () => {
  const dvd = EXAMPLES.find((e) => e.file === "dvd-menu.xml")!;
  const d = new Diagram();
  importXml(dvd.xml.replace(/ (x|y)='[^']*'/g, ""), d); // (the example has a layout: take it out)
  const extras = d.states.find((s) => s.stateName === "EXTRAS")!;
  const both = d.connectors.filter((c) => c.start.state === extras || c.end.state === extras);
  assertEquals(both.length, 2);
  assert(both.every((c) => c.start.compass !== Compass.CENTER && c.end.compass !== Compass.CENTER));
  // ...onto different lines
  assertNotEquals(both[0].start.point, both[1].end.point);
  // ...and the import was tidied up
  assertEquals(untidiness(d), { crossings: 0, throughStates: 0 });
});

Deno.test("save, then load, puts everything back where it was - including choices", () => {
  const d = gumballMachine();
  d.states[4].x = 470; // the choice diamond
  d.connectors[2].end.snapTo(d.states[4], Compass.NORTH); // GUMBALL SOLD -> into the top of the diamond
  d.connectors[3].start.snapTo(d.states[4], Compass.EAST); // out of its right corner
  const xml = generateXml(d);
  const back = new Diagram();
  importXml(xml, back);
  assertEquals(back.states.map((s) => [s.x, s.y]), d.states.map((s) => [s.x, s.y]));
  assertEquals(
    back.connectors.map((c) => [c.start.compass, c.end.compass]),
    d.connectors.map((c) => [c.start.compass, c.end.compass]),
  );
  assertEquals(generateXml(back), xml);
});

Deno.test("tidy up: the gumball machine ends up with no crossings and no arrows through states", () => {
  const gumball = EXAMPLES.find((e) => e.file === "gumball.xml")!;
  const d = new Diagram();
  importXml(gumball.xml, d);
  tidyUp(d);
  assertEquals(untidiness(d), { crossings: 0, throughStates: 0 });
  // no two states in the same place
  assertEquals(new Set(d.states.map((s) => `${s.x},${s.y}`)).size, d.states.length);
});

Deno.test("tidy up: untangles a square drawn with its arrows crossing", () => {
  // A B      A, B, C, D in a ring A->C->B->D->A, which crosses itself when drawn as a square
  // D C
  const d = new Diagram();
  const [a, b, c, dd] = [[0, 0], [300, 0], [300, 300], [0, 300]].map(([x, y]) => d.addState({ x, y }));
  for (const [from, to] of [[a, c], [c, b], [b, dd], [dd, a]]) {
    const arrow = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
    arrow.start.snapTo(from, Compass.CENTER);
    arrow.end.snapTo(to, Compass.CENTER);
  }
  assertEquals(untidiness(d).crossings, 1);
  tidyUp(d);
  assertEquals(untidiness(d), { crossings: 0, throughStates: 0 });
});

Deno.test("tidy up: every example comes out with no arrows through states, and the same every time", () => {
  for (const example of [...EXAMPLES, ...REMOVED_EXAMPLES]) {
    const d = new Diagram();
    importXml(example.xml, d);
    tidyUp(d);
    assertEquals(untidiness(d).throughStates, 0, example.file);
    const again = new Diagram();
    importXml(example.xml, again);
    tidyUp(again);
    assertEquals(again.states.map((s) => [s.x, s.y]), d.states.map((s) => [s.x, s.y]), example.file);
  }
});

Deno.test("separating parallel arrows: side by side, one above the other, and diagonal", () => {
  for (const [bx, by] of [[300, 0], [0, 250], [300, 250]]) {
    const d = new Diagram();
    const a = d.addState({ x: 0, y: 0 });
    const b = d.addState({ x: bx, y: by });
    const there = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
    there.start.snapTo(a, Compass.CENTER);
    there.end.snapTo(b, Compass.CENTER);
    const back = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
    back.start.snapTo(b, Compass.CENTER);
    back.end.snapTo(a, Compass.CENTER);
    separateParallelConnectors(d);
    // four different points, and the two lines don't cross
    const points = new Set(
      [there.start.point, there.end.point, back.start.point, back.end.point].map((p) => `${p.x},${p.y}`),
    );
    assertEquals(points.size, 4, `b at ${bx},${by}`);
    assertEquals(untidiness(d).crossings, 0);
  }
});
