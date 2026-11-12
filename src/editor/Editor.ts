import type { Connector } from "../model/Connector.ts";
import type { Diagram } from "../model/Diagram.ts";
import type { DiagramState } from "../model/DiagramState.ts";
import type { Point } from "../model/geometry.ts";
import type { ConnectorLook, StateLook } from "./EditorState.ts";

// What the page and the tests need from an editor: StateGenEditor, the State pattern classes in
// src/editor/states/.

/** How to draw the diagram in the editor's current state. */
export interface DrawingLook {
  stateLook(state: DiagramState): StateLook;
  connectorLook(connector: Connector): ConnectorLook;
}

export interface Editor {
  readonly diagram: Diagram;
  readonly selectedState: DiagramState | null;
  readonly selectedConnector: Connector | null;
  /** the editor's current state, e.g. STATE_SELECT */
  readonly currentState: { readonly name: string };
  /** how to draw things right now */
  readonly look: DrawingLook;

  // the events
  load(): void;
  enterFrame(): void;
  mouseMove(p: Point): void;
  mouseDown(p: Point): void;
  mouseUp(p: Point): void;
  selectTool(): void;
  newStateTool(p: Point): void;
  newChoiceTool(p: Point): void;
  newInitialTool(p: Point): void;
  newFinalTool(p: Point): void;
  newTerminateTool(p: Point): void;
  newConnectorTool(p: Point): void;
  tidyUp(): void;
  exportXml(): void;
  /** import this XML, as if it had been chosen in the import dialog */
  importXml(xml: string): void;
  backToDiagram(): void;
  deleteKey(): void;
  /** NEW: Ctrl-D (Cmd-D on a Mac): duplicate the selected state or connector */
  duplicateKey(): void;
}

/** What the editor needs from the screen. (The browser implements it in src/main.ts; the tests use a fake.) */
export interface EditorView {
  /** redraw the diagram - drawScene() */
  drawScene(): void;
  /** the selected state/connector has changed - showProperties() */
  showProperties(): void;
  /** hide the diagram and show the generated game.xml - the "exportXML" frame */
  showExportScreen(xml: string): void;
  /** back to the diagram - the "select" frame */
  showDiagramScreen(): void;
  /** the editor has changed state (shown on screen, so you can watch the State pattern at work) */
  stateChanged(newState: { readonly name: string }): void;
  /** show the user a message, e.g. warnings from importing an XML file */
  showMessage(text: string): void;
  /** a new diagram has been imported (the page zooms to fit it) */
  diagramLoaded(): void;
}

