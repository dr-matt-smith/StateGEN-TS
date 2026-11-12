// Tests for XML version 3 (TDDs/version03.md): web events from the palette, custom events and (e).

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { EXAMPLES } from "../src/examples.ts";
import { REMOVED_EXAMPLES } from "./fixtures/removed_examples.ts";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import type { Connector } from "../src/model/Connector.ts";
import { Diagram } from "../src/model/Diagram.ts";
import type { DiagramState } from "../src/model/DiagramState.ts";
import { Compass } from "../src/model/geometry.ts";
import { webEventFor } from "../src/model/TransitionEvents.ts";
import { codeForKey, keyForCode, PALETTE, paletteEntry } from "../src/model/WebEvents.ts";

/** A DVD menu, the version 3 way: the film's own "ended" event, keys with modifiers, a custom event. */
function dvdMenu(): Diagram {
  const d = new Diagram();
  const state = (name: string, x: number, screen: string) => {
    const s = d.addState({ x, y: 100 });
    s.stateName = name;
    s.screen = screen;
    return s;
  };
  const menu = state("MAIN MENU", 100, "mainMenu");
  const film = state("FILM PLAYING", 400, "filmPlaying");
  const paused = state("PAUSED", 700, "filmPlaying");
  const arrow = (from: DiagramState, to: DiagramState, set: (c: Connector) => void) => {
    const c = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
    c.start.snapTo(from, from === to ? Compass.NORTH_EAST : Compass.CENTER);
    c.end.snapTo(to, from === to ? Compass.SOUTH_EAST : Compass.CENTER);
    set(c);
    return c;
  };
  const dot = d.addInitial({ x: 20, y: 100 });
  arrow(dot, menu, () => {});
  arrow(menu, film, (c) => {
    c.eventGroup = "web";
    c.webEvent.target = "playFilmButton";
    c.actions = ["startFilm"];
  });
  arrow(film, menu, (c) => {
    c.eventGroup = "web";
    c.webEvent.on = "ended";
    c.webEvent.target = "film";
  });
  arrow(film, paused, (c) => {
    c.eventGroup = "web";
    c.webEvent.on = "keydown";
    c.webEvent.key = "Space";
    c.actions = ["pauseFilm"];
  });
  arrow(paused, film, (c) => {
    c.eventGroup = "web";
    c.webEvent.on = "keydown";
    c.webEvent.key = "Space";
    c.actions = ["playFilm"];
  });
  arrow(film, film, (c) => {
    c.eventGroup = "web";
    c.webEvent.on = "keydown";
    c.webEvent.key = "d";
    c.webEvent.mod = "mod";
    c.actions = ["bookmark(e)"];
  });
  arrow(paused, menu, (c) => {
    c.eventGroup = "time";
    c.timeEvent.ms = 60000;
  });
  arrow(menu, menu, (c) => {
    c.eventGroup = "custom";
    c.customEvent.eventName = "DISC_EJECTED";
    c.actions = ["showMessage(e)"];
  });
  return d;
}

Deno.test("the palette: every entry has a description and a known category; lookups", () => {
  assert(PALETTE.length >= 25);
  assert(PALETTE.every((e) => e.description && e.camel));
  assertEquals(paletteEntry("ended")?.target, "media");
  assertEquals(paletteEntry("keydown")?.eventClass, "KeyboardEvent");
  assertEquals(paletteEntry("wheel")?.pointer, true);
  assertEquals(paletteEntry("no-such-event"), null);
  assertEquals([keyForCode(222), keyForCode(68), keyForCode(32), keyForCode(999)], ["'", "d", "Space", null]);
  assertEquals([codeForKey("D"), codeForKey("Escape")], [68, 27]);
});

Deno.test("labels: target.event, keys with modifiers, the document left out", () => {
  const d = dvdMenu();
  const labels = d.connectors.map((c) => c.labelText());
  assertEquals(labels, [
    "",
    "playFilmButton.click",
    "film.ended",
    "keydown(Space)",
    "keydown(Space)",
    "keydown(mod+d)",
    "after(60000ms)",
    "DISC_EJECTED",
  ]);
});

Deno.test("version 1/2 ids are converted to web events, and give the same ids back", () => {
  const cases: [string, string, string][] = [
    ["EVENT_BUTTON_ON_RELEASE_playButton", "", "playButton.click"],
    ["EVENT_BUTTON_ON_PRESS_newStateButton", "", "newStateButton.pointerdown"],
    ["EVENT_ON_MOUSE_DOWN", "", "pointerdown"],
    ["EVENT_ON_MOUSE_DOWN", "diagram", "diagram.pointerdown"],
    ["EVENT_ON_MOUSE_UP", "diagram", "pointerup"],
    ["EVENT_ON_MOUSE_MOVE", "", "pointermove"],
    ["EVENT_KEY_DOWN_LEFT", "", "keydown(ArrowLeft)"],
    ["EVENT_KEY_DOWN_SPACE", "", "keydown(Space)"],
    ["EVENT_KEY_UP_ESCAPE", "", "keyup(Escape)"],
    ["EVENT_KEY_DOWN_222", "", "keydown(')"],
    ["EVENT_KEY_DOWN_80", "", "keydown(p)"],
    ["EVENT_KEY_DOWN_999", "", "keydown(#999)"], // an unknown key code is kept
  ];
  for (const [id, mouseArea, label] of cases) {
    const e = webEventFor(id, mouseArea)!;
    assertEquals(e.label(), label, id);
    assertEquals(e.legacyId(mouseArea), id, id);
  }
  assertEquals(webEventFor("EVENT_USER_DEFINED_GAME_OVER", ""), null);
});

Deno.test("every example imports with no warnings (but stateGEN's own Flash file) and only a version 3 file saves as version 3", () => {
  for (const example of [...EXAMPLES, ...REMOVED_EXAMPLES]) {
    const d = new Diagram();
    const warnings = importXml(example.xml, d);
    if (example.file !== "stateGEN-itself.xml") assertEquals(warnings, [], example.file);
    // (version 3 only if the file is: the others keep to version 1 or 2)
    assertEquals(d.xmlVersion === 3, example.xml.includes("<game version='3'>"), example.file);
    const xml = generateXml(d);
    const again = new Diagram();
    importXml(xml, again);
    assertEquals(generateXml(again), xml, example.file);
  }
});

Deno.test("export: version 3 when an event has no old id - no declarations, attributes instead of ids", () => {
  const d = dvdMenu();
  assertEquals(d.xmlVersion, 3);
  const xml = generateXml(d);
  assertStringIncludes(xml, "<game version='3'>");
  assert(!xml.includes("buttonInstanceList") && !xml.includes("userDefinedEventList") && !xml.includes(" id='EVENT_"));
  assertStringIncludes(xml, "<event on='click' target='playFilmButton' newState='STATE_FILM_PLAYING'>");
  assertStringIncludes(xml, "<event on='ended' target='film' newState='STATE_MAIN_MENU'/>");
  assertStringIncludes(xml, "<event on='keydown' key='Space' newState='STATE_PAUSED'>");
  assertStringIncludes(xml, "<event on='keydown' key='d' mod='mod' newState='STATE_FILM_PLAYING'");
  assertStringIncludes(xml, "\t\t<action call='bookmark(e)'/>");
  assertStringIncludes(xml, "<event after='60000' newState='STATE_MAIN_MENU'/>");
  assertStringIncludes(xml, "<event custom='DISC_EJECTED' newState='STATE_MAIN_MENU'");
});

Deno.test("import: version 3 comes back exactly, with no warnings", () => {
  const xml = generateXml(dvdMenu());
  const d = new Diagram();
  assertEquals(importXml(xml, d), []);
  assertEquals(d.version, 3);
  assertEquals(d.connectors.map((c) => c.labelText()).sort(), dvdMenu().connectors.map((c) => c.labelText()).sort());
  assertEquals(generateXml(d), xml);
});

Deno.test("export: an old ON_LOAD is a completion transition in version 3", () => {
  const d = new Diagram();
  importXml(EXAMPLES.find((e) => e.file === "dvd-menu.xml")!.xml, d);
  assertStringIncludes(generateXml(d), "<event id='EVENT_ON_LOAD'");
  const ended = d.connectors.find((c) => c.eventGroup === "custom")!;
  ended.eventGroup = "web";
  ended.webEvent.on = "ended";
  ended.webEvent.target = "film";
  const xml = generateXml(d);
  assertStringIncludes(xml, "<game version='3'>");
  assert(!xml.includes("EVENT_ON_LOAD"));
  assertStringIncludes(xml, "<event on='ended' target='film'");
});
