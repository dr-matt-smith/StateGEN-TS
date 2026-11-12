import { generateXml } from "../../io/XmlExporter.ts";
import { EditorState } from "../EditorState.ts";
import { SelectState } from "./SelectState.ts";

/**
 * STATE_EXPORT_XML - the diagram is hidden, and the XML generated from it is shown.
 *
 *   backToDiagramButton released  -> STATE_SELECT
 */
export class ExportXmlState extends EditorState {
  readonly name = "STATE_EXPORT_XML";

  override enter(): void {
    this.editor.view.showExportScreen(generateXml(this.editor.diagram));
  }

  override onBackToDiagram(): void {
    this.editor.view.showDiagramScreen();
    this.editor.changeState(new SelectState(this.editor));
  }

  override showsDiagram(): boolean {
    return false;
  }
}
