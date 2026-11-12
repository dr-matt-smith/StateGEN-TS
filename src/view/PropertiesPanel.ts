import type { Editor } from "../editor/Editor.ts";
import { actionsText, parseActions, parseProperties, propertiesText } from "../model/Actions.ts";
import type { Connector } from "../model/Connector.ts";
import type { DiagramState } from "../model/DiagramState.ts";
import { underScored } from "../model/geometry.ts";
import { WebEvent } from "../model/TransitionEvents.ts";
import { CATEGORIES, isKeyEvent, MODIFIERS, normalizeMod, PALETTE, paletteEntry } from "../model/WebEvents.ts";

// The Properties panel along the bottom of the screen - showProperties() and assertRadioButtonHandlers() in the
// Flash version. Typing in a field changes the selected state/connector straight away (the Flash "onChanged"
// handlers), whatever state the editor is in.

export class PropertiesPanel {
  /** the state name field, while a state is shown */
  private stateNameField: HTMLInputElement | null = null;
  /** NEW: the arrow in the header minimises the panel to just its header (remembered, if the browser lets it) */
  private collapsed = false;
  /** where show() puts the fields, under the header */
  private body: HTMLElement;

  constructor(private readonly root: HTMLElement, private readonly editor: Editor) {
    this.body = el("div", { className: "prop-body" });
    try {
      this.collapsed = localStorage.getItem("stateGEN.propertiesCollapsed") === "true";
    } catch { /* storage blocked - it starts open */ }
  }

  /** Minimise the panel to its header, or open it again. */
  setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.root.classList.toggle("collapsed", collapsed);
    try {
      localStorage.setItem("stateGEN.propertiesCollapsed", String(collapsed));
    } catch { /* storage blocked - it just isn't remembered */ }
    this.show();
  }

  /** Put the cursor in the state name field with all its text selected, so typing replaces the name. */
  focusStateName(): void {
    if (this.collapsed) this.setCollapsed(false); // a new state's name is typed straight away
    this.stateNameField?.focus();
    this.stateNameField?.select();
  }

  show(): void {
    const { selectedState, selectedConnector } = this.editor;
    this.body = el("div", { className: "prop-body" });
    this.stateNameField = null;
    if (selectedState) this.showState(selectedState);
    else if (selectedConnector) this.showConnector(selectedConnector);
    else this.showEmpty();
    // the header: the arrow, "Properties", then what is selected (the body's first child, a heading)
    const heading = this.body.firstElementChild as HTMLElement;
    const toggle = el("button", {
      type: "button",
      className: "prop-toggle",
      textContent: this.collapsed ? "\u25B6" : "\u25BC", // ▶ / ▼
      title: this.collapsed ? "show the properties" : "minimise the properties",
    });
    toggle.setAttribute("aria-expanded", String(!this.collapsed));
    toggle.addEventListener("click", () => this.setCollapsed(!this.collapsed));
    const header = el("div", { className: "prop-header" }, [toggle, heading]);
    header.addEventListener("dblclick", (e) => {
      if (e.target !== toggle) this.setCollapsed(!this.collapsed);
    });
    this.body.hidden = this.collapsed;
    this.root.classList.toggle("collapsed", this.collapsed);
    this.root.replaceChildren(header, this.body);
  }

  private showEmpty(): void {
    this.body.append(
      title("Nothing selected", "Click a state or an arrow to see its properties here."),
      el("div", { className: "prop-empty" }, [
        "Press the new state tool and drag a state onto the diagram. Press the new connector tool and drag its " +
        "start onto a state's edge, then drag its other end onto another state. Click a state or connector to " +
        "see its properties here.",
      ]),
    );
  }

  // ----------------------------------------------------------------------------------------------- STATE
  private showState(state: DiagramState): void {
    if (state.isTerminate) {
      this.body.append(
        title("Terminate", "The X: the object is deleted."),
        row(
          cell("Instance ID", text(state.instanceId)),
          cell(
            "",
            el("div", { className: "prop-note" }, [
              "Draw arrows into this X, each with an event, e.g. ALIEN HIT. When one happens, the object is " +
              "deleted: unlike the final state (where it stays, finished), the state machine is gone.",
            ]),
            true,
          ),
        ),
      );
      return;
    }
    if (state.isInitial || state.isFinal) {
      this.body.append(
        title(
          state.isInitial ? "Initial state" : "Final state",
          state.isInitial ? "The start: the dot the state machine begins at." : "The end: the bullseye.",
        ),
        row(
          cell("Instance ID", text(state.instanceId)),
          cell(
            "",
            el("div", { className: "prop-note" }, [
              state.isInitial
                ? "Draw one arrow from this dot to the state the game starts in. The arrow needs no event: " +
                  "it happens as soon as the game starts."
                : "Draw arrows into this bullseye, each with an event, e.g. GAME OVER. When one happens, the " +
                  "state machine has ended: it ignores every event from then on.",
            ]),
            true,
          ),
        ),
      );
      return;
    }
    if (state.isChoice) {
      this.body.append(
        title("Choice", "A decision: which arrow out is taken depends on the guards."),
        row(
          cell("Instance ID", text(state.instanceId)),
          cell(
            "",
            el("div", { className: "prop-note" }, [
              "One arrow comes in, with an event (e.g. CRANK TURNED). Give each arrow going out a guard, e.g. " +
              "gumballs > 0 or gumballs = 0, or else. When exported, each arrow out becomes a guarded " +
              "transition from the state before the choice.",
            ]),
            true,
          ),
        ),
      );
      return;
    }
    this.stateNameField = input(state.stateName, (field) => {
      field.value = field.value.toUpperCase(); // always UPPER CASE
      state.stateName = field.value;
    });
    this.stateNameField.placeholder = "STATE NAME";
    this.body.append(
      title("State", "What the game is doing now; the arrows out of it say what can happen next."),
      row(
        cell("Instance ID", text(state.instanceId)),
        cell("State name", this.stateNameField, true, "e.g. GAME PLAYING - always UPPER CASE"),
      ),
      row(
        cell(
          "Screen",
          placeholder(input(state.screen, (f) => (state.screen = f.value.trim())), "element id"),
          true,
          "the id of the HTML element shown in this state",
        ),
        cell(
          "Frame name",
          placeholder(input(state.frameName, (f) => (state.frameName = f.value)), "frame"),
          true,
          "Flash only: the frame shown in this state",
        ),
      ),
      row(
        cell(
          "entry/",
          placeholder(
            input(actionsText(state.enterActions), (f) => (state.enterActions = parseActions(f.value))),
            "behaviour, behaviour …",
          ),
          true,
          "done once, as the state is entered (comma separated)",
        ),
        cell(
          "do/",
          placeholder(
            input(actionsText(state.doActions), (f) => (state.doActions = parseActions(f.value))),
            "behaviour, behaviour …",
          ),
          true,
          "done every frame while in this state",
        ),
        cell(
          "exit/",
          placeholder(
            input(actionsText(state.exitActions), (f) => (state.exitActions = parseActions(f.value))),
            "behaviour, behaviour …",
          ),
          true,
          "done once, as the state is left",
        ),
      ),
      row(
        cell(
          "Properties",
          placeholder(
            input(propertiesText(state.properties), (f) => (state.properties = parseProperties(f.value))),
            "name = value, …",
          ),
          true,
          'what the page can read while in this state, e.g. highlightHover = true, zoom = 1.5, label = "hi"',
        ),
      ),
    );
  }

  // ----------------------------------------------------------------------------------------------- CONNECTOR
  private showConnector(c: Connector): void {
    const index = this.editor.diagram.indexOf(c);

    // choosing another event can change which fields are shown, so redraw the whole panel
    const redraw = (change: () => void) => {
      change();
      this.show();
    };
    const eventChooser = eventSelect(c, (value) => redraw(() => chooseEvent(c, value)));

    const details: HTMLElement[] = [];
    switch (c.eventGroup) {
      case "completion":
        details.push(cell(
          "",
          text("no event: followed as soon as the state has been entered (after its entry/ behaviour)"),
          true,
        ));
        break;
      case "time":
        details.push(cell(
          "After (milliseconds)",
          input(String(c.timeEvent.ms), (f) => {
            const ms = Math.round(Number(f.value));
            if (f.value.trim() !== "" && Number.isFinite(ms) && ms >= 0) c.timeEvent.ms = ms;
          }),
          true,
          "how long in this state before the arrow is followed (1000 = 1 second)",
        ));
        break;
      case "frame":
        details.push(cell(
          "",
          text(
            c.frameEvent.onEnterFrame
              ? "every animation frame (a game loop): about 60 times a second"
              : "page load (Flash ON_LOAD, from an old file): happens straight away, like no event",
          ),
          true,
        ));
        break;
      case "custom":
        details.push(cell(
          "Custom event name",
          placeholder(
            input(c.customEvent.eventName, (f) => {
              // spaces become underscores; UPPER or lower case is kept as typed
              const caret = f.selectionStart;
              f.value = underScored(f.value);
              f.setSelectionRange(caret, caret);
              c.customEvent.eventName = f.value;
            }),
            "e.g. GAME OVER",
          ),
          true,
          "e.g. GAME OVER or coinInserted - your own code fires it",
        ));
        break;
      case "web":
        details.push(...this.webEventCells(c.webEvent, () => this.show()));
        break;
    }

    const guard = cell(
      "Guard",
      placeholder(input(c.guard, (f) => (c.guard = f.value)), "condition"),
      true,
      "the arrow is only followed if this is true, e.g. gumballs > 0, or else",
    );

    if (c.leavesInitial) {
      // the arrow out of the initial dot just says which state is first
      this.body.append(
        title("Arrow from the initial state", "Says which state the game starts in."),
        row(
          cell("Instance ID", text("stateTransition_" + index)),
          cell(
            "",
            el("div", { className: "prop-note" }, [
              `The game starts in ${
                c.end.state?.isRealState ? c.end.state.stateName : "the state this arrow points to"
              }.`,
            ]),
            true,
          ),
        ),
      );
      return;
    }

    if (c.leavesChoice) {
      // an arrow out of a choice has no event of its own - it happens straight after the arrow coming in
      this.body.append(
        title("Arrow out of a choice", "Followed straight after the arrow coming in, if its guard is true."),
        row(
          cell("Instance ID", text("stateTransition_" + index)),
          guard,
          actionsCell(c),
        ),
      );
      return;
    }

    this.body.append(
      title("Transition", "An arrow: when its event happens (and its guard is true), the state changes."),
      row(
        cell("Event", eventChooser, false, "what makes this arrow happen"),
        ...details,
      ),
      row(guard, actionsCell(c)),
      row(cell("Instance ID", text("stateTransition_" + index))),
    );
  }

  /** NEW (version 3): a web event's fields - the event type, its target, and for keys the key and modifiers */
  private webEventCells(w: WebEvent, redraw: () => void): HTMLElement[] {
    const entry = paletteEntry(w.on);
    const cells: HTMLElement[] = [];

    // the event type: from the palette, or typed in (the DOM has many more)
    const type = input(w.on, (f) => {
      w.on = f.value.trim();
    });
    type.addEventListener("change", redraw);
    cells.push(cell(
      "Event type",
      type,
      false,
      entry ? entry.description : "not in the palette - fine, if the target fires an event of this type",
    ));

    // the target: an element's id, the document or the window - suggesting the ids already used
    const target = input(w.target, (f) => {
      w.target = f.value.trim();
    });
    const ids = targetSuggestions(this.editor);
    const list = el("datalist", { id: "event-targets" }, ids.map((id) => el("option", { value: id })));
    target.setAttribute("list", list.id);
    target.placeholder = "element id";
    cells.push(cell(
      "Target",
      el("div", {}, [target, list]),
      true,
      entry?.target === "media" ? "the <video> or <audio> element's id" : "an element's id, or document, or window",
    ));

    if (isKeyEvent(w.on)) {
      const key = input(w.keyCode !== null ? "" : w.key, (f) => {
        w.key = f.value === " " ? "Space" : f.value;
        w.keyCode = null;
      });
      key.classList.add("keycode");
      key.placeholder = w.keyCode !== null ? "code " + w.keyCode : "any key";
      // "press a key": the next key pressed fills the field
      const press = el("button", { type: "button", className: "secondary", textContent: "press a key…" });
      press.addEventListener("click", () => {
        press.textContent = "press it now";
        key.focus();
        key.addEventListener("keydown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return; // wait for the key itself
          w.key = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toLowerCase() : e.key;
          w.keyCode = null;
          const mods = [
            e.ctrlKey || e.metaKey ? "mod" : "",
            e.shiftKey && e.key.length > 1 ? "shift" : "",
            e.altKey ? "alt" : "",
          ];
          w.mod = normalizeMod(mods.join("+"));
          redraw();
        });
      });
      const modifiers = el(
        "div",
        { className: "checks" },
        MODIFIERS.map((m) => {
          const box = el("input", { type: "checkbox", checked: normalizeMod(w.mod).split("+").includes(m) });
          box.addEventListener("change", () => {
            const others = normalizeMod(w.mod).split("+").filter((x) => x && x !== m);
            w.mod = normalizeMod([...others, ...(box.checked ? [m] : [])].join("+"));
          });
          return el("label", {}, [box, " " + (m === "mod" ? "mod (Ctrl / Cmd)" : m)]);
        }),
      );
      cells.push(
        cell("Key", el("div", { className: "inline" }, [key, press]), false, "e.g. Escape, ArrowLeft, d, Space"),
        cell("With", modifiers),
      );
    }
    return cells;
  }
}

/**
 * The event drop-down: none (completion), after (time), animation frame and custom events, then the web
 * events in the palette, by category. Values: "completion", "time", "frame", "custom", or "web:<type>".
 */
function eventSelect(c: Connector, onChoose: (value: string) => void): HTMLSelectElement {
  const current = c.eventGroup === "web" ? "web:" + c.webEvent.on : c.eventGroup;
  const option = (value: string, label: string) =>
    el("option", { value, textContent: label, selected: value === current });
  const select = el("select", {}, [
    el("optgroup", { label: "Not a page event" }, [
      option("completion", "none (completion)"),
      option("time", "after (time)"),
      option("frame", c.frameEvent.onEnterFrame ? "animation frame" : "page load (old ON_LOAD)"),
      option("custom", "custom event (fired by the page's code)"),
    ]),
    ...CATEGORIES.map((category) =>
      el(
        "optgroup",
        { label: category },
        PALETTE.filter((e) => e.category === category).map((e) => option("web:" + e.on, e.on)),
      )
    ),
  ]);
  if (c.eventGroup === "web" && !paletteEntry(c.webEvent.on)) {
    select.append(el("optgroup", { label: "Other" }, [option(current, c.webEvent.on || "(type it in)")]));
  }
  select.addEventListener("change", () => onChoose(select.value));
  return select;
}

/** Choose an event from the drop-down (see eventSelect()). A web event gets the target its type usually has. */
function chooseEvent(c: Connector, value: string): void {
  if (!value.startsWith("web:")) {
    c.eventGroup = value as Connector["eventGroup"];
    if (value === "frame") c.frameEvent.onEnterFrame = true;
    return;
  }
  c.eventGroup = "web";
  const w = c.webEvent;
  w.on = value.slice(4);
  const entry = paletteEntry(w.on);
  if (entry?.target === "window" || entry?.target === "document") w.target = entry.target;
  else if (!w.onElement) w.target = "";
  if (!isKeyEvent(w.on)) {
    w.key = "";
    w.mod = "";
    w.keyCode = null;
  }
}

/** The targets to suggest: document, window, the ids already used by events, and the states' screens. */
function targetSuggestions(editor: Editor): string[] {
  const ids = new Set(["document", "window"]);
  for (const c of editor.diagram.connectors) {
    if (c.eventGroup === "web" && c.webEvent.onElement) ids.add(c.webEvent.targetId);
  }
  for (const s of editor.diagram.states) if (s.screen) ids.add(s.screen);
  return [...ids];
}

/** The connector's actions, as names separated by commas. "name(p)" passes the mouse position, "name(e)" the event. */
function actionsCell(c: Connector): HTMLElement {
  return cell(
    "Actions",
    placeholder(input(actionsText(c.actions), (f) => (c.actions = parseActions(f.value))), "action, action …"),
    true,
    "done as the arrow is followed (comma separated); name(p) gets the mouse position, name(e) the browser event",
  );
}

// ----- small DOM helpers -----

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]>,
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

/** The heading: what is selected, and one line about it. show() moves it into the panel's header. */
function title(what: string, about: string): HTMLElement {
  return el("div", { className: "prop-heading" }, [
    el("span", { className: "prop-title" }, ["Properties"]),
    el("span", { className: "prop-what" }, [what]),
    el("span", { className: "prop-about" }, [about]),
  ]);
}

function row(...cells: HTMLElement[]): HTMLElement {
  return el("div", { className: "prop-row" }, cells);
}

/** A field: its label (bold) above it, and a line of help (muted) under it. */
function cell(label: string, content: HTMLElement, grow = false, help = ""): HTMLElement {
  const children: Node[] = [];
  if (label) children.push(el("label", { className: "field" }, [label]));
  children.push(content);
  if (help) children.push(el("div", { className: "prop-help" }, [help]));
  return el("div", { className: "prop-cell" + (grow ? " grow" : "") }, children);
}

function placeholder(field: HTMLInputElement, text: string): HTMLInputElement {
  field.placeholder = text;
  return field;
}

function text(value: string): HTMLElement {
  return el("div", { className: "prop-value" }, [value]);
}

function input(value: string, onChange: (field: HTMLInputElement) => void, readOnly = false): HTMLInputElement {
  const field = el("input", { type: "text", value, readOnly, spellcheck: false });
  field.addEventListener("input", () => onChange(field));
  return field;
}
