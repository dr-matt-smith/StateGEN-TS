import { importXml } from "../io/XmlImporter.ts";
import type { Diagram } from "../model/Diagram.ts";

/**
 * Import `xml` into the diagram, and say what happened: how many states etc., and any warnings - or why it
 * couldn't be imported (then the diagram is unchanged). Shared by both editors (see Editor.ts).
 */
export function importAndReport(xml: string, diagram: Diagram): { imported: boolean; message: string } {
  try {
    const warnings = importXml(xml, diagram);
    const states = diagram.states;
    const count = (what: string, n: number) => (n > 0 ? [`${n} ${what}`] : []);
    const parts = [
      ...count("state(s)", states.filter((s) => s.isRealState).length),
      ...count("choice(s)", states.filter((s) => s.isChoice).length),
      ...count("initial state", states.filter((s) => s.isInitial).length),
      ...count("final state(s)", states.filter((s) => s.isFinal).length),
      ...count("terminate state(s)", states.filter((s) => s.isTerminate).length),
    ];
    return {
      imported: true,
      message: `Imported ${parts.join(", ")} and ${diagram.connectors.length} transition(s).` +
        (warnings.length ? "\n\nNot everything could be imported:\n- " + warnings.join("\n- ") : ""),
    };
  } catch (error) {
    return { imported: false, message: `Could not import: ${error instanceof Error ? error.message : error}` };
  }
}
