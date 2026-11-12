import type { DiagramState } from "../../model/DiagramState.ts";
import type { Point } from "../../model/geometry.ts";
import { EditorState } from "../EditorState.ts";
import { ConnectorDragState } from "./ConnectorDragState.ts";
import type { StateGenEditor } from "../StateGenEditor.ts";
import { SelectState } from "./SelectState.ts";

/**
 * STATE_STATE_DRAG - a state box is following the mouse (the mouse button is down).
 *
 *   mouse up                    -> STATE_SELECT
 *   selectButton pressed        -> STATE_SELECT
 *   newConnectorButton pressed  -> STATE_CONNECTOR_DRAG
 */
export class StateDragState extends EditorState {
  readonly name = "STATE_STATE_DRAG";

  constructor(
    editor: StateGenEditor,
    private readonly dragged: DiagramState,
    /** where on the box it was grabbed, so it doesn't jump to be centered on the mouse */
    private readonly grabOffset: Point,
  ) {
    super(editor);
  }

  override onEnterFrame(): void {
    this.editor.view.drawScene();
  }

  override onMouseMove(p: Point): void {
    // draggingStateOnMouseMove(): connectors snapped to this state follow it automatically
    this.dragged.moveTo({ x: p.x - this.grabOffset.x, y: p.y - this.grabOffset.y });
  }

  override onMouseUp(p: Point): void {
    // draggingStateOnMouseUp()
    this.onMouseMove(p);
    this.editor.findHover(p);
    this.editor.changeState(new SelectState(this.editor));
  }

  override onSelectTool(): void {
    this.editor.changeState(new SelectState(this.editor));
  }

  override onNewConnectorTool(p: Point): void {
    const connector = this.editor.createConnector(p);
    this.editor.changeState(new ConnectorDragState(this.editor, connector, "start"));
  }
}
