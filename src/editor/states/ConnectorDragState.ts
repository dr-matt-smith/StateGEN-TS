import type { Connector } from "../../model/Connector.ts";
import type { DiagramState } from "../../model/DiagramState.ts";
import type { Point } from "../../model/geometry.ts";
import { type ConnectorLook, EditorState, type StateLook } from "../EditorState.ts";
import type { StateGenEditor } from "../StateGenEditor.ts";
import { SelectState } from "./SelectState.ts";
import { StateDragState } from "./StateDragState.ts";

/**
 * STATE_CONNECTOR_DRAG - one end of a connector is following the mouse, snapping to the compass points
 * of any state it comes close to.
 *
 *   mouse up                 -> STATE_SELECT
 *   selectButton pressed     -> STATE_SELECT
 *   newStateButton pressed   -> STATE_STATE_DRAG
 *   newChoiceButton pressed  -> STATE_STATE_DRAG
 *   newInitial/FinalButton   -> STATE_STATE_DRAG
 */
export class ConnectorDragState extends EditorState {
  readonly name = "STATE_CONNECTOR_DRAG";

  constructor(
    editor: StateGenEditor,
    private readonly connector: Connector,
    /** which end is being dragged ("game.isStart") */
    private readonly whichEnd: "start" | "end",
  ) {
    super(editor);
  }

  private get draggedEnd() {
    return this.whichEnd === "start" ? this.connector.start : this.connector.end;
  }

  override onEnterFrame(): void {
    this.editor.view.drawScene();
  }

  override onMouseMove(p: Point): void {
    // CONNECTOR_DRAGonMouseMove()
    this.editor.diagram.dragEndTo(this.draggedEnd, p);
  }

  override onMouseUp(_p: Point): void {
    this.editor.changeState(new SelectState(this.editor));
  }

  override onSelectTool(): void {
    this.editor.changeState(new SelectState(this.editor));
  }

  override onNewStateTool(p: Point): void {
    const state = this.editor.createState(p);
    this.editor.changeState(new StateDragState(this.editor, state, { x: 0, y: 0 }));
  }

  override onNewChoiceTool(p: Point): void {
    const choice = this.editor.createShape("choice", p);
    this.editor.changeState(new StateDragState(this.editor, choice, { x: 0, y: 0 }));
  }

  override onNewInitialTool(p: Point): void {
    const initial = this.editor.createShape("initial", p);
    this.editor.changeState(new StateDragState(this.editor, initial, { x: 0, y: 0 }));
  }

  override onNewFinalTool(p: Point): void {
    const final = this.editor.createShape("final", p);
    this.editor.changeState(new StateDragState(this.editor, final, { x: 0, y: 0 }));
  }

  override onNewTerminateTool(p: Point): void {
    const terminate = this.editor.createShape("terminate", p);
    this.editor.changeState(new StateDragState(this.editor, terminate, { x: 0, y: 0 }));
  }

  // show the compass points of the state the dragged end has snapped to - setStateDragHandles()
  override stateLook(state: DiagramState): StateLook {
    if (state === this.draggedEnd.state) return "snap";
    return super.stateLook(state);
  }

  override connectorLook(connector: Connector): ConnectorLook {
    if (connector === this.connector) return { line: "moving", handle: null };
    return super.connectorLook(connector);
  }
}
