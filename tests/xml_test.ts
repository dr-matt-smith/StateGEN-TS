// Tests for game.xml export (same format as the Flash version) and import.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { EXAMPLES } from "../src/examples.ts";
import { REMOVED_EXAMPLES } from "./fixtures/removed_examples.ts";
import { generateXml } from "../src/io/XmlExporter.ts";
import { importXml } from "../src/io/XmlImporter.ts";
import { Diagram } from "../src/model/Diagram.ts";
import { Compass } from "../src/model/geometry.ts";

/** The XML without the layout attributes this editor adds - i.e. exactly what the Flash version wrote. */
export function withoutLayout(xml: string): string {
  return xml.replace(/ (x|y|fromPoint|toPoint|toX|toY|choiceX|choiceY|choiceInPoint|choiceOutPoint)='[^']*'/g, "");
}

/** The DVD menu from the Flash version's game3 folder, drawn by hand. */
function dvdMenu(): Diagram {
  const d = new Diagram();
  const loading = d.addState({ x: 100, y: 100 });
  loading.stateName = "GAME LOADING";
  loading.frameName = "gameLoading";
  const menu = d.addState({ x: 400, y: 100 });
  menu.stateName = "MAIN MENU";
  menu.frameName = "mainMenu";
  const film = d.addState({ x: 400, y: 400 });
  film.stateName = "FILM PLAYING";
  film.frameName = "filmPlaying";

  const onLoad = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  onLoad.start.snapTo(loading, Compass.EAST);
  onLoad.end.snapTo(menu, Compass.WEST);
  onLoad.eventGroup = "frame";
  onLoad.frameEvent.onEnterFrame = false;

  const play = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  play.start.snapTo(menu, Compass.SOUTH);
  play.end.snapTo(film, Compass.NORTH);
  play.eventGroup = "web";
  play.webEvent.target = "playFilmButton";
  play.actions = ["startFilm"];

  const ended = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  ended.start.snapTo(film, Compass.NORTH_EAST);
  ended.end.snapTo(menu, Compass.SOUTH_EAST);
  ended.eventGroup = "custom";
  ended.customEvent.eventName = "END OF FILM REACHED";

  const pause = d.addConnector({ x: 0, y: 0 }, { x: 600, y: 400 });
  pause.start.snapTo(film, Compass.EAST);
  pause.eventGroup = "web";
  pause.webEvent.on = "keyup";
  pause.webEvent.key = "p"; // key code 80
  return d;
}

Deno.test("export: exactly the Flash version's format (plus the layout attributes)", () => {
  assertEquals(
    withoutLayout(generateXml(dvdMenu())),
    `<?xml version='1.0'?>
<game>
<!-- ****************************** BUTTON INSTANCE NAMES  ******************** -->
<buttonInstanceList>
	<button id='playFilmButton'/>
</buttonInstanceList>

<!-- *************************** KEYS for key UP/DOWN events  ***************** -->
<keyEventList>
	<keyEvent keyCode='80'/>
</keyEventList>

<!-- ****************************** USER DEFINED EVENTS  ******************** -->
<userDefinedEventList>
	<event id='EVENT_USER_DEFINED_END_OF_FILM_REACHED'/>
</userDefinedEventList>

<!-- ****************************** STATE ELEMENTS  ******************** -->
<!-- ****************************** STATE ******************** -->
<state id='STATE_GAME_LOADING' frameName='gameLoading'>
	<event id='EVENT_ON_LOAD' newState='STATE_MAIN_MENU'/>
</state>

<!-- ****************************** STATE ******************** -->
<state id='STATE_MAIN_MENU' frameName='mainMenu'>
	<event id='EVENT_BUTTON_ON_RELEASE_playFilmButton' newState='STATE_FILM_PLAYING'>
		startFilm();
	</event>
</state>

<!-- ****************************** STATE ******************** -->
<state id='STATE_FILM_PLAYING' frameName='filmPlaying'>
	<event id='EVENT_USER_DEFINED_END_OF_FILM_REACHED' newState='STATE_MAIN_MENU'/>
	<event id='EVENT_KEY_UP_80'/>
</state>

</game>`,
  );
});

Deno.test("export: default connector is a completion transition (no id), special keys are by name", () => {
  const d = new Diagram();
  const s = d.addState({ x: 100, y: 100 });
  const c1 = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  c1.start.snapTo(s, Compass.NORTH);
  const c2 = d.addConnector({ x: 0, y: 0 }, { x: 0, y: 0 });
  c2.start.snapTo(s, Compass.SOUTH);
  c2.eventGroup = "web";
  c2.webEvent.on = "keydown";
  c2.webEvent.key = "ArrowLeft";
  const xml = withoutLayout(generateXml(d));
  assertStringIncludes(xml, "<state id='STATE_STATE1'>");
  assertStringIncludes(xml, "<event/>");
  assertStringIncludes(xml, "<event id='EVENT_KEY_DOWN_LEFT'/>");
  assert(!xml.includes("keyEventList"), "special keys are not declared");
});

Deno.test("export: the layout - state positions, and only the ends snapped to a compass point", () => {
  const xml = generateXml(dvdMenu());
  assertStringIncludes(xml, "<state id='STATE_GAME_LOADING' frameName='gameLoading' x='100' y='100'>");
  assertStringIncludes(xml, "<event id='EVENT_ON_LOAD' newState='STATE_MAIN_MENU' fromPoint='EAST' toPoint='WEST'/>");
  assertStringIncludes(xml, "<event id='EVENT_KEY_UP_80' fromPoint='EAST' toX='600' toY='400'/>");

  // an end attached to a state's CENTER isn't written - importing attaches it to the center again
  const d = dvdMenu();
  d.connectors[0].end.snapTo(d.states[1], Compass.CENTER);
  const centered = generateXml(d);
  assertStringIncludes(centered, "<event id='EVENT_ON_LOAD' newState='STATE_MAIN_MENU' fromPoint='EAST'/>");
  const back = new Diagram();
  importXml(centered, back);
  assertEquals(back.connectors[0].start.compass, Compass.EAST);
  assertEquals(back.connectors[0].end.compass, Compass.CENTER);
  assertEquals([back.states[1].x, back.states[1].y], [400, 100]);
});

Deno.test("export: enter/exit state functions become <enterStateActions>/<exitStateActions>", () => {
  const d = new Diagram();
  const s = d.addState({ x: 100, y: 100 });
  s.enterActions = ["showMenu"];
  s.exitActions = ["hideMenu"];
  const xml = generateXml(d);
  assertStringIncludes(xml, "\t<enterStateActions>\n\t\tshowMenu();\n\t</enterStateActions>");
  assertStringIncludes(xml, "\t<exitStateActions>\n\t\thideMenu();\n\t</exitStateActions>");
});

Deno.test("import, then export, gives back the same XML", () => {
  const xml = generateXml(dvdMenu());
  const d = new Diagram();
  assertEquals(importXml(xml, d), []);
  assertEquals(generateXml(d), xml);
});

Deno.test("import: works for every example (the Flash version's, and the gumball machine)", () => {
  for (const example of [...EXAMPLES, ...REMOVED_EXAMPLES]) {
    const d = new Diagram();
    importXml(example.xml, d);
    const stateCount = example.xml.match(/<state\b/g)!.length;
    assertEquals(d.states.filter((s) => s.isRealState).length, stateCount, example.file);
  }
});

Deno.test("import: action code that is more than function calls is reported; several calls become a list", () => {
  const stategen = REMOVED_EXAMPLES.find((e) => e.file === "stateGEN-itself.xml")!;
  const d = new Diagram();
  const warnings = importXml(stategen.xml, d);
  assert(warnings.some((w) => w.includes("EVENT_ON_MOUSE_MOVE")));
  assert(warnings.some((w) => w.includes("not just function calls")));
  // "drawScene(); assertRadioButtonHandlers();" (with comments) in SELECT's ON_ENTER_FRAME
  assert(d.connectors.some((c) => c.actions.join() === "drawScene,assertRadioButtonHandlers"));
});

/** A small version 2 file: <action call>s, (p), screens, properties, a mouse area, the DELETE key. */
const VERSION_2 = `<?xml version='1.0'?>
<game version='2'>
<buttonInstanceList>
	<button id='newStateButton'/>
</buttonInstanceList>
<mouseArea id='diagram'/>
<initialState newState='STATE_SELECT'/>
<state id='STATE_SELECT' screen='diagram-screen'>
	<property name='highlightHover' type='boolean' value='true'/>
	<event id='EVENT_ON_MOUSE_DOWN' guard='overState(p)' newState='STATE_DRAG'><action call='grabStateAt(p)'/></event>
	<event id='EVENT_ON_MOUSE_DOWN' guard='else'><action call='deselect'/></event>
	<event id='EVENT_BUTTON_ON_PRESS_newStateButton' newState='STATE_DRAG'>
		<action call='deselect'/>
		<action call='createStateAt(p)'/>
	</event>
	<event id='EVENT_KEY_DOWN_DELETE'><action call='deleteSelected'/></event>
</state>
<state id='STATE_DRAG' screen='diagram-screen'>
	<property name='label' type='string' value='dragging &amp; dropping'/>
	<enterStateActions><action call='hideCursor'/><action call='drawScene'/></enterStateActions>
	<event id='EVENT_ON_MOUSE_MOVE'><action call='dragStateTo(p)'/></event>
	<event id='EVENT_ON_MOUSE_UP' newState='STATE_SELECT'/>
</state>
</game>`;

Deno.test("version 2: actions, (p), screens, properties, the mouse area and DELETE import with no warnings", () => {
  const d = new Diagram();
  assertEquals(importXml(VERSION_2, d), []);
  assertEquals(d.version, 2);
  assertEquals(d.mouseArea, "diagram");
  const [select, drag] = d.states.filter((s) => s.isRealState);
  assertEquals(select.screen, "diagram-screen");
  assertEquals(select.properties, [{ name: "highlightHover", type: "boolean", value: "true" }]);
  assertEquals(drag.properties[0].value, "dragging & dropping");
  assertEquals(drag.enterActions, ["hideCursor", "drawScene"]);
  const press = d.connectors.find((c) => c.webEvent.target === "newStateButton")!;
  assertEquals(press.actions, ["deselect", "createStateAt(p)"]);
  assertEquals(press.event.label(), "newStateButton.pointerdown");
  const key = d.connectors.find((c) => c.webEvent.on === "keydown")!;
  assertEquals(key.event.label(), "keydown(Delete)");
  assertEquals(key.event.legacyId(""), "EVENT_KEY_DOWN_DELETE");
  // mouse down counts on the mouse area: it is pointer down's target
  assertEquals(
    d.connectors.find((c) => c.webEvent.on === "pointerdown" && c.webEvent.target === "diagram")?.eventGroup,
    "web",
  );
  // the guarded mouse downs became a choice diamond
  assert(d.states.some((s) => s.isChoice));
  assert(d.connectors.some((c) => c.guard === "overState(p)" && c.actions.join() === "grabStateAt(p)"));
});

Deno.test("version 2: import, then export, gives back the same XML", () => {
  const d = new Diagram();
  importXml(VERSION_2, d);
  const xml = generateXml(d);
  assertStringIncludes(xml, "<game version='2'>");
  assertStringIncludes(xml, "<mouseArea id='diagram'/>");
  assertStringIncludes(xml, "<state id='STATE_SELECT' screen='diagram-screen'");
  assertStringIncludes(xml, "\t<property name='label' type='string' value='dragging &amp; dropping'/>");
  assertStringIncludes(xml, "\t\t<action call='createStateAt(p)'/>");
  const again = new Diagram();
  assertEquals(importXml(xml, again), []);
  assertEquals(generateXml(again), xml);
});

Deno.test("version 1: several actions are written the Flash way, one call per line", () => {
  const d = new Diagram();
  const s = d.addState({ x: 100, y: 100 });
  s.enterActions = ["drawScene", "findHover(p)"];
  const xml = generateXml(d);
  assertStringIncludes(xml, "<game>");
  assertStringIncludes(xml, "\t<enterStateActions>\n\t\tdrawScene();\n\t\tfindHover(p);\n\t</enterStateActions>");
  const again = new Diagram();
  importXml(xml, again);
  assertEquals(again.states[0].enterActions, ["drawScene", "findHover(p)"]);
});

Deno.test("import: mouse events (EVENT_ON_MOUSE_...) are pointer events, and each warning is given once", () => {
  const xml = REMOVED_EXAMPLES.find((e) => e.file === "stateGEN-itself.xml")!.xml;
  const d = new Diagram();
  const warnings = importXml(xml, d);
  assertEquals(warnings.length, new Set(warnings).size);
  assert(warnings.every((w) => !(w.includes("MOUSE") && w.includes("not a stateGEN event"))), warnings.join("\n"));
  const mouse = d.connectors.filter((c) => c.webEvent.on.startsWith("pointer") && !c.webEvent.onElement);
  assertEquals(new Set(mouse.map((c) => c.event.legacyId(""))).size, 3);
  // and back out the same
  assertEquals(generateXml(d).match(/EVENT_ON_MOUSE_/g)?.length, xml.match(/<event id=.EVENT_ON_MOUSE_/g)?.length);
});
