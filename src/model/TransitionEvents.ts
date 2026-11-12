import { underScored } from "./geometry.ts";
import { codeForKey, isKeyEvent, keyForCode, normalizeMod, SPECIAL_KEY_NAMES, specialKeyName } from "./WebEvents.ts";

/**
 * The event that fires a transition (connector).
 *
 * The Flash version stored an "eventGroup" number on each connector (FRAME / BUTTON / KEY / USER DEFINED)
 * and then had the same 4-way switch in three places: showProperties(), eventElementForState() and the
 * generate...ListXML() functions. Here each event group is its own class, so each `switch` became a method.
 * (Refactoring name: "Replace Type Code with Subclasses" - a close cousin of the State pattern.)
 *
 * NEW, version 3 (TDDs/version03.md): the Flash button, mouse, key and user defined groups have become
 * one WebEvent - "this DOM event, on this target" - and a CustomNamedEvent. Each event can still give its
 * version 1/2 id (legacyId()), if it has one, so an old file is saved in its old format.
 */
export type EventGroup = "completion" | "time" | "frame" | "web" | "custom";

/** Names a version 1/2 XML file must declare up-front (buttonInstanceList, keyEventList, userDefinedEventList). */
export interface EventDeclarations {
  buttons: Set<string>;
  keyCodes: Set<string>;
  userDefinedEvents: Set<string>;
}

export abstract class TransitionEvent {
  abstract readonly group: EventGroup;

  /**
   * The version 1/2 XML id, e.g. "EVENT_BUTTON_ON_RELEASE_extrasButton" - "" for a completion transition,
   * which has no id - or null if the event can only be written in version 3.
   * @param mouseArea the diagram's version 2 <mouseArea> (pointer down on it is EVENT_ON_MOUSE_DOWN)
   */
  abstract legacyId(mouseArea: string): string | null;

  /** The version 3 XML attributes, e.g. [["on", "click"], ["target", "playButton"]] (none: completion) */
  abstract attributes(): [string, string][];

  /** The name drawn on the connector's arrow, e.g. "playButton.click" */
  abstract label(): string;

  /** Add any names this event needs declared at the top of a version 1/2 XML file. Most events need none. */
  declare(_declarations: EventDeclarations, _mouseArea: string): void {}

  /** Says which event this is: two events with the same identity are the same event. */
  identity(): string {
    return this.group + this.attributes().map(([n, v]) => ` ${n}=${v}`).join("");
  }
}

// ---------------------------------------------------------------------------------------------------------

/**
 * NEW: no event at all - a UML "completion transition". The arrow is followed as soon as the state it leaves
 * has been entered (its entry/ behaviour has run), choosing between guards if there are several. Drawn with
 * no event name, just the guard (if any), e.g. [gumballs > 0].
 *
 * It replaces the Flash ON_ENTER_FRAME "go straight on" trick: in the XML it is an <event> with no id.
 */
export class CompletionEvent extends TransitionEvent {
  readonly group = "completion";

  /** no id: written in the XML as <event newState='...'> */
  legacyId(): string {
    return "";
  }

  attributes(): [string, string][] {
    return [];
  }

  label(): string {
    return "";
  }
}

// ---------------------------------------------------------------------------------------------------------

/**
 * NEW: a UML time event, after(ms): followed once the state has been active for that long: a timer starts
 * when the state is entered, and is cancelled when it is left. Id EVENT_AFTER_<ms>, or in
 * version 3 after='<ms>'.
 */
export class TimeEvent extends TransitionEvent {
  readonly group = "time";
  /** how long, in milliseconds (default 1 second) */
  ms = 1000;

  legacyId(): string {
    return "EVENT_AFTER_" + this.ms;
  }

  attributes(): [string, string][] {
    return [["after", String(this.ms)]];
  }

  /** UML style: after(2000ms) */
  label(): string {
    return `after(${this.ms}ms)`;
  }
}

// ---------------------------------------------------------------------------------------------------------

/**
 * An animation frame (Flash: onEnterFrame): a game loop. Version 3 writes on='animationframe'.
 *
 * A version 1/2 file can also have EVENT_ON_LOAD (Flash: onLoad), which meant "straight away". It is kept,
 * so the file saves as it was, but it means the same as a completion transition. Version 3 has no
 * ON_LOAD: it is written as a completion transition.
 */
export class FrameEvent extends TransitionEvent {
  readonly group = "frame";
  /** true = every animation frame (the default), false = the old ON_LOAD */
  onEnterFrame = true;

  legacyId(): string {
    return this.onEnterFrame ? "EVENT_ON_ENTER_FRAME" : "EVENT_ON_LOAD";
  }

  attributes(): [string, string][] {
    return this.onEnterFrame ? [["on", "animationframe"]] : [];
  }

  label(): string {
    return this.onEnterFrame ? "animationFrame" : "pageLoad";
  }
}

// ---------------------------------------------------------------------------------------------------------

/**
 * NEW (version 3): a DOM event on a target - "this event, on this target":
 *   on='click' target='playButton'      the element with id="playButton" is clicked
 *   on='ended' target='film'            the <video id="film"> has played to the end
 *   on='keydown' key='d' mod='mod'      Ctrl-D (Cmd-D on a Mac), anywhere on the page
 * It replaces the Flash button, mouse and key groups. See WebEvents.ts for the palette.
 */
export class WebEvent extends TransitionEvent {
  readonly group = "web";
  /** the DOM event type, e.g. "click" */
  on = "click";
  /** an element id, or "document" or "window" */
  target = "document";
  /** keyboard events only: the KeyboardEvent.key to match, e.g. "Escape", "d" ("Space" for " "). "" = any key */
  key = "";
  /** keyboard events only: the modifier keys, e.g. "mod" (Ctrl, or Cmd on a Mac), "mod+shift" */
  mod = "";
  /** an old (deprecated) key code that has no key name - from a version 1/2 file - or null */
  keyCode: string | null = null;

  /** the target, with "" meaning the document */
  get targetId(): string {
    return this.target.trim() || "document";
  }

  /** true if it targets an element (not the document or the window) */
  get onElement(): boolean {
    return this.targetId !== "document" && this.targetId !== "window";
  }

  /** true for a keyboard event that says which key */
  get hasKey(): boolean {
    return isKeyEvent(this.on) && (this.key !== "" || this.keyCode !== null);
  }

  legacyId(mouseArea: string): string | null {
    const t = this.targetId;
    if (this.on === "click" && this.onElement) return "EVENT_BUTTON_ON_RELEASE_" + t;
    if (this.on === "pointerdown" && (t === "document" || t === mouseArea)) return "EVENT_ON_MOUSE_DOWN";
    if (this.on === "pointerdown" && this.onElement) return "EVENT_BUTTON_ON_PRESS_" + t;
    if (this.on === "pointerup" && t === "document") return "EVENT_ON_MOUSE_UP";
    if (this.on === "pointermove" && t === "document") return "EVENT_ON_MOUSE_MOVE";
    if ((this.on === "keydown" || this.on === "keyup") && t === "document" && this.mod === "" && this.hasKey) {
      const keyName = this.keyCode ?? specialKeyName(this.key) ?? codeForKey(this.key)?.toString();
      if (keyName) return `EVENT_KEY_${this.on === "keydown" ? "DOWN" : "UP"}_${keyName}`;
    }
    return null;
  }

  override declare(declarations: EventDeclarations, mouseArea: string): void {
    const id = this.legacyId(mouseArea);
    if (id?.startsWith("EVENT_BUTTON_")) declarations.buttons.add(this.targetId);
    const code = id?.match(/^EVENT_KEY_(?:DOWN|UP)_(\d+)$/)?.[1];
    if (code) declarations.keyCodes.add(code);
  }

  attributes(): [string, string][] {
    const a: [string, string][] = [["on", this.on]];
    if (this.targetId !== "document") a.push(["target", this.targetId]);
    if (isKeyEvent(this.on)) {
      if (this.key) a.push(["key", this.key]);
      if (this.keyCode !== null) a.push(["keyCode", this.keyCode]);
      if (normalizeMod(this.mod)) a.push(["mod", normalizeMod(this.mod)]);
    }
    return a;
  }

  /** "playButton.click", "keydown(mod+d)", "pointermove", "window.resize" */
  label(): string {
    const on = this.targetId === "document" ? this.on : `${this.targetId}.${this.on}`;
    if (!this.hasKey) return on;
    const key = this.keyCode !== null ? "#" + this.keyCode : this.key;
    return `${on}(${[normalizeMod(this.mod), key].filter((k) => k).join("+")})`;
  }
}

/**
 * The web event for a version 1/2 id, e.g. EVENT_BUTTON_ON_RELEASE_playButton -> click on playButton.
 * (EVENT_ON_LOAD, EVENT_ON_ENTER_FRAME, EVENT_AFTER_n and EVENT_USER_DEFINED_X aren't web events.)
 * Null if it isn't one.
 */
export function webEventFor(id: string, mouseArea: string): WebEvent | null {
  const e = new WebEvent();
  let m: RegExpMatchArray | null;
  if ((m = id.match(/^EVENT_BUTTON_ON_(RELEASE|PRESS)_(.+)$/))) {
    e.on = m[1] === "RELEASE" ? "click" : "pointerdown";
    e.target = m[2];
  } else if ((m = id.match(/^EVENT_ON_MOUSE_(DOWN|UP|MOVE)$/))) {
    e.on = "pointer" + m[1].toLowerCase();
    // (only mouse down counted only on the version 2 mouse area)
    e.target = m[1] === "DOWN" && mouseArea ? mouseArea : "document";
  } else if ((m = id.match(/^EVENT_KEY_(DOWN|UP)_(.+)$/))) {
    e.on = m[1] === "DOWN" ? "keydown" : "keyup";
    const key = SPECIAL_KEY_NAMES[m[2]] ?? (/^\d+$/.test(m[2]) ? keyForCode(Number(m[2])) : null);
    if (key !== null) e.key = key;
    else e.keyCode = m[2];
  } else {
    return null;
  }
  return e;
}

// ---------------------------------------------------------------------------------------------------------

/**
 * A custom event (version 1/2: "user defined"), e.g. GAME_OVER: fired by the page's own code. (Named
 * CustomNamedEvent so it doesn't clash with the browser's CustomEvent.)
 */
export class CustomNamedEvent extends TransitionEvent {
  readonly group = "custom";
  /**
   * e.g. "END_OF_FILM_REACHED" or "coinInserted". Spaces become underscores, but upper/lower case is kept
   * as typed (the Flash version forced it to UPPER CASE).
   */
  eventName = "";

  /** the name, spaces as underscores */
  get name(): string {
    return underScored(this.eventName.trim());
  }

  legacyId(): string {
    return "EVENT_USER_DEFINED_" + this.name;
  }

  override declare(declarations: EventDeclarations): void {
    declarations.userDefinedEvents.add(this.legacyId());
  }

  attributes(): [string, string][] {
    return [["custom", this.name]];
  }

  /** just the event's own name, e.g. "COIN_INSERTED" or "coinInserted" */
  label(): string {
    return this.name || "CUSTOM";
  }
}
