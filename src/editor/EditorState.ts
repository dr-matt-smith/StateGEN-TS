import type { Connector } from "../model/Connector.ts";
import type { ConnectorPart } from "../model/Diagram.ts";
import type { DiagramState } from "../model/DiagramState.ts";
import type { Point } from "../model/geometry.ts";
import type { StateGenEditor } from "./StateGenEditor.ts";

/** How a state box should be drawn - the 4 frames of the "StateMC" movie clip in the Flash version. */
export type StateLook =
  | "normal" // frame 1
  | "snap" // frame 2: show the compass points a connector can snap to
  | "hover" // frame 3: the mouse is over it
  | "selected"; // frame 4: green, its properties are showing

/** How a connector should be drawn. */
export interface ConnectorLook {
  line: "normal" | "selected" | "moving";
  /** draw a highlight square around this part of the connector (the part the mouse is near) */
  handle: ConnectorPart | null;
}

/**
 * THE STATE PATTERN: the abstract State.
 *
 * The stateGEN editor is itself a state machine (see src/game.xml in the Flash version - stateGEN was used to
 * generate its own code!). Each of its states - SELECT, STATE DRAG, CONNECTOR DRAG, CONNECTOR MOVE,
 * EXPORT XML - is a subclass of EditorState, and the editor (the Context, StateGenEditor) passes every event
 * to whichever state object it currently has.
 *
 * Each method here is one of the events from game.xml. The default is "ignore it": a subclass only overrides
 * the events its state responds to - exactly the <event> elements listed inside that <state> in game.xml.
 */
export abstract class EditorState {
  /** the state's name, as it was in game.xml, e.g. "STATE_SELECT" */
  abstract readonly name: string;

  constructor(protected readonly editor: StateGenEditor) {}

  // ----- entering and leaving the state (<enterStateActions> / <exitStateActions>) -----
  enter(): void {}
  exit(): void {}

  // ----- frame events -----
  /** EVENT_ON_LOAD: the application has just started */
  onLoad(): void {}
  /** EVENT_ON_ENTER_FRAME: called every animation frame (about 60 times a second) */
  onEnterFrame(): void {}

  // ----- mouse events (p is the mouse position on the diagram) -----
  onMouseMove(_p: Point): void {}
  onMouseDown(_p: Point): void {}
  onMouseUp(_p: Point): void {}

  // ----- toolbar buttons -----
  /** EVENT_BUTTON_ON_PRESS_selectButton */
  onSelectTool(): void {}
  /** EVENT_BUTTON_ON_PRESS_newStateButton (p = where the mouse is) */
  onNewStateTool(_p: Point): void {}
  /** EVENT_BUTTON_ON_PRESS_newChoiceButton (p = where the mouse is) - NEW: a choice (decision) diamond */
  onNewChoiceTool(_p: Point): void {}
  /** EVENT_BUTTON_ON_PRESS_newInitialButton - NEW: the initial (start) dot */
  onNewInitialTool(_p: Point): void {}
  /** EVENT_BUTTON_ON_PRESS_newFinalButton - NEW: a final (end) bullseye */
  onNewFinalTool(_p: Point): void {}
  /** newTerminateButton pressed - NEW: a terminate X (the object is deleted) */
  onNewTerminateTool(_p: Point): void {}
  /** EVENT_BUTTON_ON_PRESS_newConnectorButton (p = where the mouse is) */
  onNewConnectorTool(_p: Point): void {}
  /** EVENT_BUTTON_ON_RELEASE_tidyUpButton - NEW: lay the diagram out so arrows cross as little as possible */
  onTidyUp(): void {}
  /** EVENT_BUTTON_ON_RELEASE_exportXMLButton */
  onExportXml(): void {}
  /** EVENT_BUTTON_ON_RELEASE_importXMLButton (new - the Flash version had the button but no code for it) */
  onImportXml(_xml: string): void {}
  /** EVENT_BUTTON_ON_RELEASE_backToDiagramButton */
  onBackToDiagram(): void {}

  // ----- keys -----
  /** EVENT_KEY_DOWN_222 in the Flash version (the # key) - here Delete or Backspace deletes the selected object */
  onDeleteKey(): void {}
  /** NEW: Ctrl-D (Cmd-D on a Mac) duplicates the selected object */
  onDuplicateKey(): void {}

  // ----- how to draw things in this state (drawStateObjects() and drawConnectors() in the Flash version,
  //       which asked "if( applicationBUILT_IN.state == STATE_SELECT ) ..." - now each state just answers) -----
  stateLook(state: DiagramState): StateLook {
    return state === this.editor.selectedState ? "selected" : "normal";
  }

  connectorLook(connector: Connector): ConnectorLook {
    return { line: connector === this.editor.selectedConnector ? "selected" : "normal", handle: null };
  }

  /** false while the diagram is hidden (EXPORT XML) */
  showsDiagram(): boolean {
    return true;
  }
}
