# stateGEN XML version 3: web page events

> **Note (12 November 2026):** TypeScript code generation has since been removed from this project, so
> students write their own code from the diagrams. The XML format described here is still what the editor
> reads and writes. The parts about generated code and `examples/web/` are kept only as a record of the design.

**Status:** W1–W7 and W9 done; W8 waits for the SWF assets (see §10) · **Date:** 8 November 2026 · **Branch:** `uml-state-chart-style`

## 1. Goal

Let a state chart describe an **interactive web page** in the page's own terms. An arrow is fired by a real
browser event (`click` on `#playButton`, `ended` on `<video id="film">`, `keydown` of `Escape`), chosen from a
**palette** in the editor. The generated `connectToPage()` then wires up the page with no hand-written glue.

The test case is the Flash examples. Each should become a **fully working HTML project**:
- each Flash frame becomes a screen (an HTML element);
- images and animations extracted from the old SWF files become `<img>`, CSS animations or `<video>`;
- the state machine is generated from the diagram.

The old `game.xml` files stay as they are, and must still import.

**Assumptions:**

- Version 2's ideas carry over unchanged: named actions, `(p)`, screens, state properties, the mouse area,
  completion transitions, DO behaviours and `after(ms)`.
- The State pattern output stays the same shape: `Game`, `GameState`, one class per state and one method per
  event. Only the events, and how the page is wired to them, change.
- Composite (nested) states are still out of scope (§7).

## 2. Where version 2 stands

| Event group (v2) | XML id | Generated wiring | Limits for a web page |
| --- | --- | --- | --- |
| completion (none) | `<event>` with no id | `Game` calls `onCompletion()` after entering | none |
| time | `EVENT_AFTER_2000` | timers started and cancelled by `Game` | none |
| animation frame | `EVENT_ON_ENTER_FRAME` / `EVENT_ON_LOAD` | `requestAnimationFrame` loop / called at once | `ON_LOAD` is really a completion transition |
| button | `EVENT_BUTTON_ON_RELEASE_playButton` | `click` / `pointerdown` on `#playButton` | only those two events, and only on elements |
| mouse | `EVENT_ON_MOUSE_DOWN` … | `pointerdown/up/move` on the page or the mouse area | no `dblclick`, `wheel`, `contextmenu`; one area only |
| key | `EVENT_KEY_DOWN_LEFT`, `EVENT_KEY_DOWN_222` | `keydown` / `keyup`, by `keyCode` | `keyCode` is deprecated; no modifiers, so Ctrl-D needs glue in `main.ts` |
| user defined | `EVENT_USER_DEFINED_GAME_OVER` | none: the page's code must call `game.onUserDefinedGameOver()` | can't be fired by the page itself, e.g. by a video ending |

There's also nothing for form events (`input`, `change`, `submit`), media events (`ended`, `timeupdate`),
CSS events (`animationend`, `transitionend`) or page events (`resize`, `visibilitychange`). Those are exactly
the events a Flash example needs once its frames are HTML.

## 3. The design

### 3.1 One event model: "this event, on this target"

Version 3 replaces the button, mouse, key and user-defined groups with one **web event**:

| Field | Meaning | Example |
| --- | --- | --- |
| `on` | the DOM event type | `click`, `ended`, `keydown`, `animationend` |
| `target` | an element id, or `document` / `window` (default: `document`) | `playButton`, `film` |
| `key` | keyboard events only: the `KeyboardEvent.key` to match (`Space` is accepted for `" "`) | `Escape`, `ArrowLeft`, `d` |
| `mod` | keyboard events only: `mod` (Ctrl, or Cmd on a Mac), `shift`, `alt`, combined with `+` | `mod`, `mod+shift` |

Four other kinds of event are kept, because they aren't DOM events:

| Kind | XML | Arrow label |
| --- | --- | --- |
| completion | `<event newState='…'>` (no `on`) | the guard only |
| time | `<event after='2000' …>` | `after(2000ms)` |
| animation frame | `<event on='animationframe' …>` | `animationFrame` |
| custom | `<event custom='GAME_OVER' …>` | `GAME_OVER` |

A **custom event** replaces "user defined". The page fires it either with `game.fire("GAME_OVER")` or
with `document.dispatchEvent(new CustomEvent("GAME_OVER"))`, and `connectToPage()` listens for it. So any
script on the page can fire one, including an action that runs during a transition.

**The arrow's label** names the target first, like a method call: `playButton.click`, `film.ended`,
`keydown(Escape)`, `keydown(mod+d)`, `pointerdown`. A target of `document` isn't shown.

### 3.2 The palette

There is one curated list in `src/model/WebEvents.ts`. Each entry gives:
- the category and the event type;
- what it usually targets: an element, the document, the window or a media element;
- whether it has a pointer position, so `(p)` makes sense;
- whether it needs a `key`;
- a one-line description to show in the editor.

| Category | Events |
| --- | --- |
| Pointer | `click`, `dblclick`, `pointerdown`, `pointerup`, `pointermove`, `pointerenter`, `pointerleave`, `contextmenu`, `wheel` |
| Keyboard | `keydown`, `keyup` (with `key` and `mod`) |
| Form | `input`, `change`, `submit`, `focus`, `blur` |
| Media | `play`, `pause`, `ended`, `timeupdate`, `canplaythrough` |
| CSS | `animationend`, `transitionend` |
| Page | `resize`, `visibilitychange`, `hashchange` |
| Drag and drop | `dragstart`, `dragover`, `drop` |
| Not DOM events | none (completion), `after(ms)`, `animationframe`, custom |

**In the Properties panel:**
- The event type radio buttons are replaced by a searchable drop-down of the palette, grouped by category.
- Below it is a **target** field. It suggests the ids already used on the diagram, the states' screens,
  `document` and `window`.
- For keyboard events, it also shows **key** and **modifier** fields. The key field can be filled by
  pressing the key ("press a key…").

An event type that isn't in the palette can still be typed in, since the DOM has many more. The editor
then shows a gentle warning instead of refusing it.

### 3.3 Event data: `(p)` and `(e)`

Version 2 already passes the pointer position to an action or guard written `name(p)`. Version 3 adds
`name(e)`, which passes the **browser event** itself. Examples:

- `checkAnswer(e)` on `answer.change` can read `e.target.value`.
- `seek(e)` on `film.timeupdate` can read the video's time.
- `zoomBy(e)` on `wheel` can read `e.deltaY`.

The generated `GameActions` types `e` as the event's own class: `MouseEvent`, `KeyboardEvent`,
`WheelEvent`, `Event` … The palette knows which class each event uses.

### 3.4 Version 3 XML

```xml
<?xml version='1.0'?>
<game version='3'>
<initialState newState='STATE_LOADING'/>

<state id='STATE_LOADING' screen='loading'>
	<event newState='STATE_MAIN_MENU'/>                                   <!-- completion -->
</state>

<state id='STATE_MAIN_MENU' screen='mainMenu'>
	<event on='click' target='playFilmButton' newState='STATE_FILM_PLAYING'>
		<action call='startFilm'/>
	</event>
	<event on='click' target='extrasButton' newState='STATE_EXTRAS'/>
</state>

<state id='STATE_FILM_PLAYING' screen='filmPlaying'>
	<event on='ended' target='film' newState='STATE_MAIN_MENU'/>
	<event on='keydown' key='Escape' newState='STATE_MAIN_MENU'/>
	<event on='keydown' key='Space' newState='STATE_PAUSED'/>
</state>

<state id='STATE_PAUSED' screen='filmPlaying'>
	<event on='keydown' key='Space' newState='STATE_FILM_PLAYING'/>
	<event after='60000' newState='STATE_MAIN_MENU'/>                     <!-- give up after a minute -->
</state>
</game>
```

- There are no declaration lists (`<buttonInstanceList>`, `<keyEventList>`, `<userDefinedEventList>`). The
  events say everything themselves.
- Guards, choice diamonds (`choiceX` …) and the layout attributes are the same as in version 2.
- The `<mouseArea>` element goes. Instead, pointer events name their own target (`on='pointerdown'
  target='diagram'`), so different areas can have different events.

### 3.5 Reading version 1 and 2 files

Old files are converted to the new model as they are imported, with no warnings:

| v1 / v2 id | v3 event |
| --- | --- |
| `EVENT_BUTTON_ON_RELEASE_x` | `on='click' target='x'` |
| `EVENT_BUTTON_ON_PRESS_x` | `on='pointerdown' target='x'` |
| `EVENT_ON_MOUSE_DOWN/UP/MOVE` | `on='pointerdown/up/move'`, targeting the v2 `<mouseArea>` (only for down, as now) or `document` |
| `EVENT_KEY_DOWN_LEFT` (special keys) | `on='keydown' key='ArrowLeft'` (`SPACE` becomes `Space`, `ESCAPE` becomes `Escape` …) |
| `EVENT_KEY_DOWN_222` (key codes) | `on='keydown' key='#'` where the code is known. Otherwise `keyCode='222'` is kept (§8, question 3) |
| `EVENT_USER_DEFINED_X` | `custom='X'` |
| `EVENT_ON_ENTER_FRAME` | `on='animationframe'` |
| `EVENT_ON_LOAD` | a **completion** transition (see below) |
| `EVENT_AFTER_n` | `after='n'` |

**Why `ON_LOAD` becomes a completion transition.** In Flash, `ON_LOAD` meant "straight away". The browser's
`load` event is a trap: `connectToPage()` is normally called after the page has loaded, so a `load`
listener would never fire.

### 3.6 Writing: which version?

Each event can say whether it has a **version 1/2 id** (`click` on an element has one; `ended` doesn't). The
exporter writes:
- **version 1 or 2, exactly as today**, if every event has an old id and nothing else needs version 3;
- **version 3** otherwise.

So an old example that's only been moved about still saves in the old format, and still works with
`xsl/gameCode.xsl`.

### 3.7 What the generator produces (sketch)

```ts
export class StateFilmPlaying extends GameState {
  readonly name = "STATE_FILM_PLAYING";
  override filmEnded(): void { this.game.changeState(new StateMainMenu(this.game)); }
  override keydownEscape(): void { this.game.changeState(new StateMainMenu(this.game)); }
  override keydownSpace(): void { this.game.changeState(new StatePaused(this.game)); }
}

/** Connect a game to the web page: one listener per (target, event type), from this table. */
const LISTENERS: { target: string; on: string; key?: string; mod?: string; method: keyof Game }[] = [
  { target: "playFilmButton", on: "click", method: "playFilmButtonClick" },
  { target: "film", on: "ended", method: "filmEnded" },
  { target: "document", on: "keydown", key: "Escape", method: "keydownEscape" },
  // ...
];

export function connectToPage(game: Game, options = {}): void {
  // for each target and event type, ONE addEventListener that picks the method by key and modifiers;
  // keys are still ignored while typing in a text field; a missing element is a console warning
}
```

- **Method names** are `<target><Event>` (`playButtonClick`, `filmEnded`), or `<event><Key>` for keys on
  the document (`keydownEscape`, `keydownModD`). The `on` prefix of version 2 goes, because
  `onPlayButtonClick` reads badly. Custom events use their own name (`gameOver`).
- **The general methods go.** Version 2's `onButtonPress(id)` / `onKeyDown(keyCode)` were there for page code
  to call. In version 3 the page fires real events instead, and the table replaces both.
- **`game.fire(name)`** is generated when there are custom events.
- **Everything already built stays:**
  - `Clock` and the `after(ms)` timers;
  - `onCompletion()`, `doActivity()`, `showScreen()`, the state properties and `onStateChanged`;
  - the `(p)` / `toPoint` option, now applying to any pointer event.

### 3.8 From a Flash example to a web project

Each Flash example gets an `examples/web/<name>/` folder, which shows the whole route:

```
examples/web/dvd-menu/
  dvd-menu.xml        the v3 state chart (imported from the old dvd-menu.xml, then edited)
  index.html          one <section id="…"> per screen (was: one frame each), <video id="film">
  styles.css          screens shown and hidden by a class; animations replace frame tweens
  assets/             images, sounds and video taken from the old SWF
  gameStates.ts       generated
  main.ts             the actions class (implements GameActions) and connectToPage(new Game(actions))
```

The DVD menu shows the main idea. Its user-defined event `END_OF_FILM_REACHED` simply becomes
`film.ended`, and no code fires it any more. The apple catch game keeps `animationFrame` for its game loop,
and uses a custom `GAME_WON` event fired by its actions.

## 4. Gaps this closes

| # | Gap | Closed by |
| --- | --- | --- |
| G1 | Only a few kinds of DOM event | §3.1, §3.2 |
| G2 | Events from a video, a form, CSS or the window need hand-written glue | §3.1, §3.7 |
| G3 | `keyCode` is deprecated; no modifier keys (Ctrl-D is glue in `main.ts`) | `key` and `mod` (§3.1) |
| G4 | User-defined events can only be fired by calling a generated method | custom events with `fire()` / `dispatchEvent` (§3.1) |
| G5 | One mouse area for the whole diagram | pointer events have their own target (§3.4) |
| G6 | Actions only get the mouse position | `name(e)` (§3.3) |
| G7 | Flash frames, with no way to the HTML version | §3.8 |

## 5. `stateGEN-itself` in version 3: the proof

As in version 2 (W9), the editor's own state chart is the proof. `examples/stateGEN-itself-v3.xml` replaces
`main.ts`'s hand-written glue for the following:
- **Ctrl/Cmd-D:** becomes `on='keydown' key='d' mod='mod'`. The `duplicateKey` handler and the custom
  `DUPLICATE` event go.
- **Escape on the import dialog:** becomes `on='keydown' key='Escape'` in `STATE_IMPORT_DIALOG`.
- **Delete / Backspace:** become `key='Delete'` and `key='Backspace'`.
- **The tools and dialog buttons:** become `click` / `pointerdown` on their ids.

`GeneratedEditor` then calls the new method names. The `?generated` app must behave exactly as now, so
every test in `editor_test.ts` still passes against both editors.

The version 2 file stays, as an example of version 2.

## 6. Work items

| # | Work | Files | Tests |
| --- | --- | --- | --- |
| W1 | `WebEvent` and `CustomEvent` in the model; the palette data. Keep completion, time and animation frame | `TransitionEvents.ts`, new `WebEvents.ts`, `Connector.ts` | Labels; palette lookups |
| W2 | Import v3, and convert v1/v2 ids (§3.5) | `XmlImporter.ts` | Every example imports with no warnings, with the events in §3.5 |
| W3 | Export: v1/v2 when possible, otherwise v3 (§3.6) | `XmlExporter.ts`, `Diagram.ts` | v1/v2 examples re-export byte for byte; v3 round trip |
| W4 | Properties panel: palette drop-down, target, key and modifier fields, "press a key" | `PropertiesPanel.ts`, `styles.css` | Editor tests in both editors |
| W5 | Generator: method names, the listener table, `fire()`, `(e)` with the right event class | `TypeScriptGenerator.ts` | Generated code type-checks with the DOM library; runs against a fake page |
| W6 | `stateGEN-itself-v3.xml`, regenerate the editor, and remove the glue from `main.ts` (§5) | `examples/`, `src/editor/`, `src/main.ts` | `editor_test.ts` passes against both editors |
| W7 | `examples/web/dvd-menu/`: a complete page with a `<video>` | `examples/web/` | Opens and runs from `dist/`; a smoke test clicks through it |
| W8 | The other Flash examples as web projects, using the extracted SWF assets | `examples/web/` | As W7 |
| W9 | README and the lecture notes: the palette, `(e)`, and the route from Flash to HTML | `README.md` | n/a |

W1 to W5 are the feature, W6 proves it, and W7 and W8 are your examples. W8 depends on which assets you get
out of the SWF files, so it can be done one example at a time.

## 7. Out of scope

- **Composite (nested) states and history.** These would remove the repeated tool transitions in
  `stateGEN-itself`, but they are a separate, bigger change.
- **Event delegation by CSS selector** (`target='.tile'`, one listener for many elements). It's useful for
  games with many tiles. It fits the table in §3.7 later, if wanted.
- **`every(ms)` repeating timers.** A self-transition `after(ms)` does the same thing, more visibly on the
  diagram.
- **Generating the HTML and CSS.** stateGEN generates the state machine. The page is written by hand
  (§3.8), though the editor could later list the ids and screens a page needs.

## 8. Acceptance criteria

1. Every existing example (Flash, gumball, traffic lights, stateGEN-itself v1 and v2) imports with **no
   warnings**. When re-exported unchanged, each gives back **the same XML**, in its old version.
2. Any event from the palette can be chosen, given a target (and a key and modifiers), saved as version 3,
   and imported back unchanged.
3. The generated code type-checks with the DOM library. In a test page it reacts to `click`, `ended`,
   `keydown` with modifiers, and a custom event fired with `dispatchEvent`.
4. The `?generated` editor runs on `stateGEN-itself-v3.xml` with the Ctrl-D and Escape glue removed from
   `main.ts`, and passes `editor_test.ts`.
5. `examples/web/dvd-menu/` works in a browser: menu → film → back to the menu when the video ends, with
   no hand-written event wiring.

## 9. Open questions

1. **Replace or keep the old groups?** This document **replaces** them. The old button, mouse, key and
   user-defined groups become palette entries, with the old files converted on import (§3.5). The
   alternative is to keep them as they are and add "web event" as one more group. That is less work, but
   leaves two ways of saying "click on playButton".
2. **Labels:** `playButton.click` (proposed), `click(playButton)`, or the UML-ish `click [#playButton]`?
   (Square brackets are already used for guards, which is why the last one isn't proposed.)
3. **Unknown key codes** (e.g. `222`) on import: map the common ones to `key` names and keep `keyCode` for the
   rest (proposed)? Or always map, and warn when unsure?
4. **Method names:** drop the `on` prefix (`playButtonClick`, proposed), or keep it (`onPlayButtonClick`) to
   match version 2 and the lecture notes?
5. **`(e)` for students:** offer it from the start, or keep it as an advanced option, with `(p)` the only
   one shown in the panel's hint text?
6. **The web examples:** which Flash example should come first after the DVD menu? And will the assets from
   the SWF files live in this repository, or be linked from elsewhere (size)?

## 10. Answers, and what was built

**Answers (8 November 2026):** 1–4 as proposed: the old groups are **replaced**; labels are
`playButton.click`; common key codes are mapped to key names and the rest kept as `keyCode`; method names
drop the `on` prefix. 5: `(e)` is offered from the start (it's in the panel's hint text). 6: deferred. The
media assets from the SWF files aren't in this repository; a web example **links** to its media instead.

**Built (W1–W5):**

- `src/model/WebEvents.ts`: the palette (29 events in 7 categories), key names ↔ old key codes, modifiers.
- `src/model/TransitionEvents.ts`: `WebEvent` and `CustomNamedEvent` replace the button, mouse, key and
  user-defined classes. Every event gives its version 3 attributes, its arrow label, its generated method
  name and, if it has one, its **version 1/2 id**.
- `Diagram.xmlVersion`: 3 only if the file said so or an event has no old id. **Every example still saves
  byte for byte in its old version** (tested).
- Import converts the old ids (§3.5) with no warnings; version 3 round trips exactly.
- The Properties panel has one drop-down (not page events, then the palette by category), the event type
  (which can be typed), a target with id suggestions, and for keys a key field, "press a key…" and
  mod/shift/alt boxes. It shows the generated method name.
- The generator writes the listener table, `matches()` (keys, modifiers, main mouse button, not while
  typing), `fire(name, detail?)` and `(e)` typed as the event's class. `src/editor/generated/gameStates.ts`
  is regenerated from `stateGEN-itself-v2.xml`, and `GeneratedEditor` calls the new names.

**Changes from the design above:**

- **`ON_LOAD` from an old file is kept** (shown as `pageLoad`), so the file saves exactly as it was, but it
  is *generated* as a completion transition, and written as one in version 3. That gives §3.5's behaviour
  without breaking acceptance criterion 1. So the generated editor is already in `STATE_SELECT` when it is
  made.
- **Method names are camel case throughout:** `keyDownEscape`, `keyDownModD`, `diagramPointerDown`,
  `filmEnded`, `after2000`, `animationFrame`. A custom event named like one of `Game`'s own members gets
  `Event` on the end (`fireEvent`).
- A matched key event has its default action prevented (Ctrl-D: "bookmark this page"; Space: scroll).
- `toPoint` defaults to the position relative to the element the event is on (the page, for the document).
  The editor passes its own, as before.

**W6 (done):** `examples/stateGEN-itself-v3.xml` now drives `?generated`. Ctrl/Cmd-D is
`keydown(mod+d)`, and Escape is `import-dialog.keydown(Escape)` in `STATE_IMPORT_DIALOG`. It's on the dialog,
not the document, so it counts while typing in the dialog's text box, and matching it stops the browser
closing the dialog on its own. `main.ts` now has key handling only for the hand-written editor, and no
`cancel` handler. The version 2 file stays as an example. Tested with real key presses in the browser.

**W7 (done):** `examples/web/dvd-menu/` has the version 3 diagram (`film.ended` replaces
`END_OF_FILM_REACHED`, plus Escape to stop the film), `index.html` with a `<section>` per screen and
`<video id="film">`, `styles.css`, the generated `gameStates.ts` and a `main.ts` with just the three actions
and no event wiring. The video is **linked** (a 5-second CC0 clip from MDN), not stored here. `build.ts`
builds each `examples/web/<name>/` into `dist/web/<name>/`, `deno task generate` regenerates each one's
`gameStates.ts`, and `tests/web_examples_test.ts` checks it's up to date, that `index.html` has every id
the diagram needs, and clicks through it on a fake page. Checked in the browser too: play → the clip ends
→ main menu; extras → main menu; Escape stops the film.

**W9 (done):** README.

**Still to do:** W8: the other Flash examples (apple catch, game with a menu) as web projects, once the
SWF assets are sorted out. Each is a new `examples/web/<name>/` folder like the DVD menu.
