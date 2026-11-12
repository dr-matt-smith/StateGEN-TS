// Tests for panning and zooming the diagram (src/view/Viewport.ts).

import { assertAlmostEquals, assertEquals } from "@std/assert";
import { boundsOf, MAX_SCALE, MIN_SCALE, Viewport } from "../src/view/Viewport.ts";

Deno.test("viewport: diagram <-> screen, panned and zoomed", () => {
  const v = new Viewport();
  assertEquals(v.toDiagram({ x: 120, y: 80 }), { x: 120, y: 80 }); // at first, the same
  v.panBy(100, 50);
  v.scale = 2;
  assertEquals(v.toScreen({ x: 10, y: 20 }), { x: 120, y: 90 });
  assertEquals(v.toDiagram({ x: 120, y: 90 }), { x: 10, y: 20 });
  assertEquals(v.transform, "translate(100 50) scale(2)");
});

Deno.test("viewport: zooming keeps the point under the mouse where it is, within limits", () => {
  const v = new Viewport();
  v.panBy(-30, 40);
  const mouse = { x: 300, y: 200 };
  const under = v.toDiagram(mouse);
  v.zoomAt(mouse, 1.7);
  assertAlmostEquals(v.toScreen(under).x, mouse.x);
  assertAlmostEquals(v.toScreen(under).y, mouse.y);
  v.zoomAt(mouse, 1000);
  assertEquals(v.scale, MAX_SCALE);
  v.zoomAt(mouse, 0.00001);
  assertEquals(v.scale, MIN_SCALE);
  v.zoomTo(1, mouse);
  assertEquals(v.scale, 1);
  assertAlmostEquals(v.toScreen(under).x, mouse.x);
});

Deno.test("viewport: fit zooms as far as it can, centered to the right of the palette", () => {
  const v = new Viewport();
  const bounds = boundsOf([
    { x: 100, y: 100, width: 100, height: 50 },
    { x: 500, y: 300, width: 100, height: 50 },
  ])!;
  assertEquals(bounds, { x: 300, y: 200, width: 500, height: 250 });
  // 1100 x 700 screen, 100 px palette on the right: 920 x 620 room -> limited by 920 / 500 = 1.84,
  // centered in the 1000 px left of the palette
  v.fit(bounds, 1100, 700, 100);
  assertAlmostEquals(v.scale, 1.84);
  assertEquals(v.toScreen({ x: 300, y: 200 }), { x: 500, y: 350 });
  // a tiny diagram stops at MAX_SCALE (or a smaller limit)
  v.fit({ x: 0, y: 0, width: 10, height: 10 }, 1100, 700);
  assertEquals(v.scale, MAX_SCALE);
  v.fit({ x: 0, y: 0, width: 10, height: 10 }, 1100, 700, 0, 1);
  assertEquals(v.scale, 1);
  // nothing to fit: back to 100%, not panned
  v.fit(boundsOf([]), 1100, 700);
  assertEquals([v.scale, v.panX, v.panY], [1, 0, 0]);
});
