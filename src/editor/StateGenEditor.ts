import type { Connector } from "../model/Connector.ts";
import { type ConnectorHit, Diagram } from "../model/Diagram.ts";
import type { DiagramState } from "../model/DiagramState.ts";
import type { Point } from "../model/geometry.ts";
import type { DrawingLook, Editor, EditorView } from "./Editor.ts";
import type { EditorState } from "./EditorState.ts";
import { LoadingState } from "./states/LoadingState.ts";

// (EditorView moved to Editor.ts, which both editors share; it is re-exported here.)
export type { EditorView };

/**
 * THE STATE PATTERN: the Context.
 *
 * The editor keeps ONE EditorState object, `state`, and hands every event to it. It never asks "which state am
 * I in?" - compare the Flash version's generated processEvent() with its big switch( applicationBUILT_IN.state ).
 *
 * The rest of this class is the data the states share (the Flash version's global "game" object) and some
 * actions more than one state needs.
 */
export class StateGenEditor implements Editor {
  readonly diagram = new Diagram();

  /** where new connectors are anchored, near the top left ("var p2 = new Point(80, 40)" in Flash, just right of its Tools palette) */
  static readonly NEW_CONNECTOR_END: Point = { x: 125, y: 40 };

  // ----- the shared "game" object -----
  selectedState: DiagramState | null = null;
  selectedConnector: Connector | null = null;
  /** the state under the mouse ("game.nearestStateIndex") */
  hoverState: DiagramState | null = null;
  /** the connector end/center near the mouse ("game.nearestConnectorIndex", "game.isStart", "game.isCenter") */
  hoverConnector: ConnectorHit | null = null;
  /** the last known mouse position (Flash: _xmouse, _ymouse) */
  mouse: Point = { x: 0, y: 0 };

  private state: EditorState;

  constructor(readonly view: EditorView) {
    this.state = new LoadingState(this);
    this.state.enter();
  }

  get currentState(): EditorState {
    return this.state;
  }

  /** each state says how to draw things in it (stateLook() / connectorLook()) */
  get look(): DrawingLook {
    return this.state;
  }

  /** Leave the current state and enter a new one (the generated exitSTATE_...() / enterSTATE_...() calls). */
  changeState(newState: EditorState): void {
    this.state.exit();
    this.state = newState;
    this.state.enter();
    this.view.stateChanged(newState);
  }

  // ----- events: every one is passed straight on to the current state -----
  load(): void {
    this.state.onLoad();
  }
  enterFrame(): void {
    this.state.onEnterFrame();
  }
  mouseMove(p: Point): void {
    this.mouse = p;
    this.state.onMouseMove(p);
  }
  mouseDown(p: Point): void {
    this.mouse = p;
    this.state.onMouseDown(p);
  }
  mouseUp(p: Point): void {
    this.mouse = p;
    this.state.onMouseUp(p);
  }
  selectTool(): void {
    this.state.onSelectTool();
  }
  newStateTool(p: Point): void {
    this.mouse = p;
    this.state.onNewStateTool(p);
  }
  newChoiceTool(p: Point): void {
    this.mouse = p;
    this.state.onNewChoiceTool(p);
  }
  newInitialTool(p: Point): void {
    this.mouse = p;
    this.state.onNewInitialTool(p);
  }
  newFinalTool(p: Point): void {
    this.mouse = p;
    this.state.onNewFinalTool(p);
  }
  newTerminateTool(p: Point): void {
    this.mouse = p;
    this.state.onNewTerminateTool(p);
  }
  newConnectorTool(p: Point): void {
    this.mouse = p;
    this.state.onNewConnectorTool(p);
  }
  tidyUp(): void {
    this.state.onTidyUp();
  }
  exportXml(): void {
    this.state.onExportXml();
  }
  importXml(xml: string): void {
    this.state.onImportXml(xml);
  }
  backToDiagram(): void {
    this.state.onBackToDiagram();
  }
  deleteKey(): void {
    this.state.onDeleteKey();
  }
  duplicateKey(): void {
    this.state.onDuplicateKey();
  }

  // ----- actions shared by several states -----

  /** Deselect everything ("game.selectedStateIndex = -1; game.selectedConnectorIndex = -1;"). */
  deselect(): void {
    this.selectedState = null;
    this.selectedConnector = null;
  }

  /** Work out what is under the mouse. A state takes precedence over a connector. */
  findHover(p: Point): void {
    this.hoverState = this.diagram.findStateAt(p);
    this.hoverConnector = this.hoverState ? null : this.diagram.findConnectorNear(p);
  }

  /** Create a new state at the mouse and select it - newStateButtonActions(). */
  createState(p: Point): DiagramState {
    this.deselect();
    const state = this.diagram.addState(p);
    this.selectedState = state;
    this.view.showProperties();
    return state;
  }

  /** Create a new choice diamond, initial dot, final bullseye or terminate X at the mouse, and select it. (NEW) */
  createShape(kind: "choice" | "initial" | "final" | "terminate", p: Point): DiagramState {
    this.deselect();
    const shape = kind === "choice"
      ? this.diagram.addChoice(p)
      : kind === "initial"
      ? this.diagram.addInitial(p)
      : kind === "final"
      ? this.diagram.addFinal(p)
      : this.diagram.addTerminate(p);
    this.selectedState = shape;
    this.view.showProperties();
    return shape;
  }

  /** Create a new connector from the mouse to the top-left corner and select it - newConnectorObject(). */
  createConnector(p: Point): Connector {
    this.deselect();
    const connector = this.diagram.addConnector(p, StateGenEditor.NEW_CONNECTOR_END);
    this.selectedConnector = connector;
    this.view.showProperties();
    return connector;
  }
}
