// The palette of web page events (NEW, XML version 3 - see TDDs/version03.md §3.2).
//
// A transition can be fired by any DOM event: "this event, on this target", e.g. click on #playButton,
// ended on <video id="film">, keydown of Escape. This is the curated list the Properties panel offers,
// grouped by category. An event type that isn't here can still be typed in - the DOM has many more.

/** What an event usually happens on. */
export type TargetKind = "element" | "document" | "window" | "media";

export interface PaletteEntry {
  /** the DOM event type, e.g. "click" */
  readonly on: string;
  readonly category: string;
  /** the event's class in the DOM library, e.g. "MouseEvent" - the type of e in an action written name(e) */
  readonly eventClass: string;
  /** what it usually happens on (the target a new one gets: an element, the document or the window) */
  readonly target: TargetKind;
  /** true if it has a pointer position, so an action written name(p) can be given it */
  readonly pointer: boolean;
  /** true for keyboard events: they can say which key, and which modifier keys */
  readonly key: boolean;
  /** the event type in camelCase: "pointerdown" -> "pointerDown" */
  readonly camel: string;
  /** one line for the editor */
  readonly description: string;
}

function entry(
  category: string,
  on: string,
  camel: string,
  eventClass: string,
  target: TargetKind,
  description: string,
  pointer = false,
  key = false,
): PaletteEntry {
  return { on, category, eventClass, target, pointer, key, camel, description };
}

export const PALETTE: readonly PaletteEntry[] = [
  entry(
    "Pointer",
    "click",
    "click",
    "MouseEvent",
    "element",
    "pressed and released (a button, a link, anything)",
    true,
  ),
  entry("Pointer", "dblclick", "dblClick", "MouseEvent", "element", "double-clicked", true),
  entry(
    "Pointer",
    "pointerdown",
    "pointerDown",
    "PointerEvent",
    "element",
    "mouse button, pen or finger goes down",
    true,
  ),
  entry("Pointer", "pointerup", "pointerUp", "PointerEvent", "document", "mouse button, pen or finger comes up", true),
  entry("Pointer", "pointermove", "pointerMove", "PointerEvent", "document", "the pointer moves", true),
  entry("Pointer", "pointerenter", "pointerEnter", "PointerEvent", "element", "the pointer moves onto it", true),
  entry("Pointer", "pointerleave", "pointerLeave", "PointerEvent", "element", "the pointer moves off it", true),
  entry("Pointer", "contextmenu", "contextMenu", "MouseEvent", "element", "right-click (or long press)", true),
  entry("Pointer", "wheel", "wheel", "WheelEvent", "element", "the mouse wheel or trackpad scrolls", true),
  entry("Keyboard", "keydown", "keyDown", "KeyboardEvent", "document", "a key goes down (and repeats)", false, true),
  entry("Keyboard", "keyup", "keyUp", "KeyboardEvent", "document", "a key comes up", false, true),
  entry("Form", "input", "input", "Event", "element", "a text field's value changes as you type"),
  entry("Form", "change", "change", "Event", "element", "a field's value has changed (a select, a checkbox)"),
  entry("Form", "submit", "submit", "SubmitEvent", "element", "a form is submitted"),
  entry("Form", "focus", "focus", "FocusEvent", "element", "it gets the keyboard focus"),
  entry("Form", "blur", "blur", "FocusEvent", "element", "it loses the keyboard focus"),
  entry("Media", "play", "play", "Event", "media", "a video or sound starts playing"),
  entry("Media", "pause", "pause", "Event", "media", "it is paused"),
  entry("Media", "ended", "ended", "Event", "media", "it has played to the end"),
  entry("Media", "timeupdate", "timeUpdate", "Event", "media", "its current time changes (a few times a second)"),
  entry("Media", "canplaythrough", "canPlayThrough", "Event", "media", "it has loaded enough to play to the end"),
  entry("CSS", "animationend", "animationEnd", "AnimationEvent", "element", "a CSS animation has finished"),
  entry("CSS", "transitionend", "transitionEnd", "TransitionEvent", "element", "a CSS transition has finished"),
  entry("Page", "resize", "resize", "UIEvent", "window", "the window changes size"),
  entry("Page", "visibilitychange", "visibilityChange", "Event", "document", "the tab is hidden or shown again"),
  entry("Page", "hashchange", "hashChange", "HashChangeEvent", "window", "the #part of the address changes"),
  entry("Drag and drop", "dragstart", "dragStart", "DragEvent", "element", "something starts being dragged", true),
  entry("Drag and drop", "dragover", "dragOver", "DragEvent", "element", "something is dragged over it", true),
  entry("Drag and drop", "drop", "drop", "DragEvent", "element", "something is dropped on it", true),
];

/** The palette categories, in order. */
export const CATEGORIES: readonly string[] = [...new Set(PALETTE.map((e) => e.category))];

/** The palette entry for an event type - or null if it isn't in the palette (it can still be used). */
export function paletteEntry(on: string): PaletteEntry | null {
  return PALETTE.find((e) => e.on === on) ?? null;
}

/** true for keyboard events (keydown, keyup) */
export function isKeyEvent(on: string): boolean {
  return paletteEntry(on)?.key ?? false;
}

// ----- keys --------------------------------------------------------------------------------------------

/**
 * The Flash "special keys" (version 1/2 ids such as EVENT_KEY_DOWN_LEFT) and their KeyboardEvent.key names.
 * "Space" stands for the key " ", which can't be seen in an attribute or on an arrow.
 */
export const SPECIAL_KEY_NAMES: Readonly<Record<string, string>> = {
  SPACE: "Space",
  ESCAPE: "Escape",
  CONTROL: "Control",
  SHIFT: "Shift",
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  DELETE: "Delete",
  BACKSPACE: "Backspace",
};

/** Old (deprecated) key codes, as in version 1/2 ids such as EVENT_KEY_DOWN_222, and the key each means. */
const KEY_CODES: ReadonlyMap<number, string> = new Map<number, string>([
  [8, "Backspace"],
  [9, "Tab"],
  [13, "Enter"],
  [16, "Shift"],
  [17, "Control"],
  [18, "Alt"],
  [27, "Escape"],
  [32, "Space"],
  [33, "PageUp"],
  [34, "PageDown"],
  [35, "End"],
  [36, "Home"],
  [37, "ArrowLeft"],
  [38, "ArrowUp"],
  [39, "ArrowRight"],
  [40, "ArrowDown"],
  [46, "Delete"],
  ...[..."0123456789"].map((d, i): [number, string] => [48 + i, d]),
  ...[..."abcdefghijklmnopqrstuvwxyz"].map((c, i): [number, string] => [65 + i, c]),
  ...Array.from({ length: 12 }, (_, i): [number, string] => [112 + i, "F" + (i + 1)]),
  [186, ";"],
  [187, "="],
  [188, ","],
  [189, "-"],
  [190, "."],
  [191, "/"],
  [192, "`"],
  [219, "["],
  [220, "\\"],
  [221, "]"],
  [222, "'"],
]);

/** An old key code -> its key name, e.g. 222 -> "'", 68 -> "d" (null if it isn't known) */
export function keyForCode(code: number): string | null {
  return KEY_CODES.get(code) ?? null;
}

/** A key name -> its old key code, e.g. "d" -> 68 (null if it has none) */
export function codeForKey(key: string): number | null {
  const k = key.length === 1 ? key.toLowerCase() : key;
  for (const [code, name] of KEY_CODES) if (name === k) return code;
  return null;
}

/** A key name -> the Flash special key name, e.g. "ArrowLeft" -> "LEFT" (null if it isn't one) */
export function specialKeyName(key: string): string | null {
  return Object.entries(SPECIAL_KEY_NAMES).find(([, k]) => k === key)?.[0] ?? null;
}

/** The modifier keys a keyboard event can need: "mod" is Ctrl, or Cmd on a Mac. */
export const MODIFIERS = ["mod", "shift", "alt"] as const;

/** "Shift + mod" -> "mod+shift" (in the order of MODIFIERS; anything else is left out) */
export function normalizeMod(mod: string): string {
  const parts = mod.toLowerCase().split(/[\s+]+/).map((m) => (m === "ctrl" || m === "cmd" ? "mod" : m));
  return MODIFIERS.filter((m) => parts.includes(m)).join("+");
}
