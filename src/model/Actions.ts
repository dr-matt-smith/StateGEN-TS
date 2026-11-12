// Action lists (NEW in XML version 2). A transition, and a state's enter and exit, can each call several
// named functions, in order. Each is just a name - the code is yours to write - optionally followed by
// "(p)", which means "pass it the mouse position" (only pointer events have one),
// or (NEW, version 3) "(e)", which means "pass it the browser's event object" (web and custom events):
//
//   ["deselect", "grabStateAt(p)", "checkAnswer(e)"]
//
// The Properties panel shows a list as one text field, with the names separated by commas.

/** true if the call is written "name(p)": pass it the mouse position */
export function takesPoint(call: string): boolean {
  return /\(\s*p\s*\)$/.test(call.trim());
}

/** "deselect, grabStateAt(p)" -> ["deselect", "grabStateAt(p)"] (empty names are left out) */
export function parseActions(text: string): string[] {
  return text.split(",").map((a) => a.trim()).filter((a) => a.length > 0);
}

/** ["deselect", "grabStateAt(p)"] -> "deselect, grabStateAt(p)" */
export function actionsText(actions: readonly string[]): string {
  return actions.join(", ");
}

/** The types a state property can have (see DiagramState.properties). */
export type PropertyType = "boolean" | "number" | "string";

/**
 * A constant value a state declares for the view to read, e.g. <property name='showSnapHandles'
 * type='boolean' value='true'/>.
 */
export interface StateProperty {
  name: string;
  type: PropertyType;
  value: string;
}

/**
 * The properties as one line of text for the Properties panel, e.g.
 *   highlightHover = true, zoom = 1.5, label = "dragging"
 * (strings are in quotes, so the type can be read back from the value)
 */
export function propertiesText(properties: readonly StateProperty[]): string {
  return properties.map((p) => `${p.name} = ${p.type === "string" ? JSON.stringify(p.value) : p.value}`).join(", ");
}

/**
 * Read properties back from text such as `highlightHover = true, zoom = 1.5, label = "dragging"`.
 * The type comes from the value: true/false is a boolean, a number is a number, anything else a string.
 * Anything that isn't "name = value" is left out.
 */
export function parseProperties(text: string): StateProperty[] {
  const properties: StateProperty[] = [];
  for (const m of text.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*("(?:[^"\\]|\\.)*"?|[^,]*)/g)) {
    const raw = m[2].trim();
    if (raw === "true" || raw === "false") {
      properties.push({ name: m[1], type: "boolean", value: raw });
    } else if (raw !== "" && Number.isFinite(Number(raw))) {
      properties.push({ name: m[1], type: "number", value: String(Number(raw)) });
    } else if (raw.startsWith('"')) {
      let value = raw.slice(1, raw.endsWith('"') && raw.length > 1 ? -1 : undefined);
      try {
        value = JSON.parse(`"${value}"`);
      } catch { /* keep it as typed */ }
      properties.push({ name: m[1], type: "string", value });
    } else {
      properties.push({ name: m[1], type: "string", value: raw });
    }
  }
  return properties;
}
