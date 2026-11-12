// Tests for time events, after(ms) (NEW), using the traffic lights example:
//
//   RED --after(4000ms)--> GREEN --after(8000ms)--> AMBER --after(2000ms)--> RED
//   GREEN --BUTTON_ON_RELEASE_waitButton--> AMBER   (cancels GREEN's timer)
//
// and the frame event's new names (the XML ids are still the Flash ones).

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { EXAMPLES } from "../src/examples.ts";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import { Diagram } from "../src/model/Diagram.ts";

function trafficLights(): Diagram {
  const d = new Diagram();
  assertEquals(importXml(EXAMPLES.find((e) => e.file === "traffic-lights.xml")!.xml, d), []);
  return d;
}

Deno.test("labels: after(ms), and the frame event's web names", () => {
  const d = new Diagram();
  const c = d.addConnector({ x: 0, y: 0 }, { x: 100, y: 0 });
  c.eventGroup = "time";
  c.timeEvent.ms = 2500;
  assertEquals(c.labelText(), "after(2500ms)");
  assertEquals(c.event.legacyId(""), "EVENT_AFTER_2500");
  c.eventGroup = "frame";
  assertEquals(c.labelText(), "animationFrame");
  assertEquals(c.event.legacyId(""), "EVENT_ON_ENTER_FRAME");
  c.frameEvent.onEnterFrame = false;
  assertEquals(c.labelText(), "pageLoad");
  assertEquals(c.event.legacyId(""), "EVENT_ON_LOAD");
});

Deno.test("XML: EVENT_AFTER_<ms> imports as a time event, and re-exports the same", () => {
  const d = trafficLights();
  const green = d.states.find((s) => s.xmlId === "STATE_GREEN")!;
  const timed = d.connectors.find((c) => c.start.state === green && c.eventGroup === "time")!;
  assertEquals(timed.timeEvent.ms, 8000);
  const xml = generateXml(d);
  assertStringIncludes(xml, "<event id='EVENT_AFTER_8000' newState='STATE_AMBER'");
  assert(!xml.includes("version='2'"), "time events don't need version 2");
  const again = new Diagram();
  assertEquals(importXml(xml, again), []);
  assertEquals(generateXml(again), xml);
});
