// Curved connectors and the minimap (NEW, after son-of-fungus-JS).

import { assert, assertAlmostEquals, assertEquals, assertNotEquals, assertStrictEquals } from "@std/assert";
import { Diagram } from "../src/model/Diagram.ts";
import type { DiagramState } from "../src/model/DiagramState.ts";
import { Compass, distance } from "../src/model/geometry.ts";
import { minimapMapping, minimapToDiagram } from "../src/view/Minimap.ts";
import { Viewport } from "../src/view/Viewport.ts";

function arrow(d: Diagram, from: DiagramState, to: DiagramState, fromAt = Compass.CENTER, toAt = Compass.CENTER) {
  const c = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  c.start.snapTo(from, fromAt);
  c.end.snapTo(to, toAt);
  return c;
}

function twoStates() {
  const d = new Diagram();
  return { d, a: d.addState({ x: 100, y: 200 }), b: d.addState({ x: 500, y: 200 }) };
}

Deno.test("one arrow between two states is straight", () => {
  const { d, a, b } = twoStates();
  const c = arrow(d, a, b);
  d.updateBends();
  assertEquals(c.bend, 0);
  assert(!c.isCurved);
  assertEquals(c.center, { x: 300, y: 200 });
});

Deno.test("A->B and B->A curve apart, one either side of the straight line", () => {
  const { d, a, b } = twoStates();
  const there = arrow(d, a, b);
  const back = arrow(d, b, a);
  d.updateBends();
  assert(there.isCurved && back.isCurved);
  // the middles are on opposite sides of y = 200, the same distance away
  assert((there.center.y - 200) * (back.center.y - 200) < 0);
  assertAlmostEquals(Math.abs(there.center.y - 200), Math.abs(back.center.y - 200));
  assert(Math.abs(there.center.y - 200) > 10, "the middle is well off the straight line");
  // a CENTER end leaves its state heading for the curve, so it isn't at the middle of the side any more
  assertNotEquals(there.start.point, a.compassPoint(Compass.EAST));
});

Deno.test("three arrows between the same states: one straight, two curved", () => {
  const { d, a, b } = twoStates();
  const arrows = [arrow(d, a, b), arrow(d, a, b), arrow(d, b, a)];
  d.updateBends();
  assertEquals(arrows.map((c) => c.bend), [-Diagram.CURVE_STEP, 0, Diagram.CURVE_STEP]);
});

Deno.test("an arrow from a state back to itself is a loop, bending away from the state", () => {
  const d = new Diagram();
  const a = d.addState({ x: 200, y: 200 });
  const loop = arrow(d, a, a, Compass.NORTH_EAST, Compass.SOUTH_EAST);
  d.updateBends();
  assert(loop.isCurved);
  assert(loop.center.x > a.x + a.width / 2, "the loop's middle is outside the state, to the right");
});

Deno.test("picking a curved arrow by its middle finds the right one", () => {
  const { d, a, b } = twoStates();
  const there = arrow(d, a, b);
  const back = arrow(d, b, a);
  d.updateBends();
  assertStrictEquals(d.findConnectorNear(there.center)?.connector, there);
  assertStrictEquals(d.findConnectorNear(back.center)?.connector, back);
  assertEquals(d.findConnectorNear(back.center)?.part, "center");
});

Deno.test("a floating arrow (not attached at both ends) is straight", () => {
  const { d, a, b } = twoStates();
  const c1 = arrow(d, a, b);
  const c2 = arrow(d, a, b);
  c2.end.floatAt({ x: 300, y: 400 });
  d.updateBends();
  assertEquals([c1.bend, c2.bend], [0, 0]);
});

Deno.test("minimap: the whole diagram fits, centered, and points map back", () => {
  const bounds = { x: 300, y: 200, width: 600, height: 200 };
  const m = minimapMapping(bounds, 200, 150);
  // the center of the diagram is the center of the minimap
  assertEquals(minimapToDiagram(m, { x: 100, y: 75 }), { x: 300, y: 200 });
  // the diagram (plus padding) is no wider than the minimap
  assert((bounds.width + 120) * m.scale <= 200 + 1e-9);
  const p = { x: 123, y: 45 };
  const back = minimapToDiagram(m, { x: p.x * m.scale + m.x, y: p.y * m.scale + m.y });
  assert(distance(back, p) < 1e-9);
});

Deno.test("viewport: centerOn() puts a diagram point in the middle of the screen, keeping the zoom", () => {
  const v = new Viewport();
  v.zoomTo(2, { x: 0, y: 0 });
  v.centerOn({ x: 300, y: 100 }, 800, 600);
  assertEquals(v.scale, 2);
  assertEquals(v.toScreen({ x: 300, y: 100 }), { x: 400, y: 300 });
});
