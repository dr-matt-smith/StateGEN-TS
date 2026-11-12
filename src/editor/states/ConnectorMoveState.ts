import type { Connector } from "../../model/Connector.ts";
import type { Point } from "../../model/geometry.ts";
import { type ConnectorLook, EditorState } from "../EditorState.ts";
import type { StateGenEditor } from "../StateGenEditor.ts";
import { SelectState } from "./SelectState.ts";

/**
 * STATE_CONNECTOR_MOVE - a whole connector is following the mouse (it was grabbed by its center, or - NEW -
 * by its label).
 * As soon as it moves, both ends come loose from any states they were snapped to (just clicking it to select
 * it leaves them snapped).
 *
 *   mouse up  -> STATE_SELECT
 */
export class ConnectorMoveState extends EditorState {
  readonly name = "STATE_CONNECTOR_MOVE";

  constructor(
    editor: StateGenEditor,
    private readonly connector: Connector,
    /** from the mouse to the connector's center - so one grabbed by its label doesn't jump (NEW) */
    private readonly grabOffset: Point = { x: 0, y: 0 },
  ) {
    super(editor);
  }

  override onEnterFrame(): void {
    this.editor.view.drawScene();
  }

  override onMouseMove(p: Point): void {
    // CONNECTOR_MOVEonMouseMove(): both ends become floating
    this.connector.moveCenterTo({ x: p.x + this.grabOffset.x, y: p.y + this.grabOffset.y });
  }

  override onMouseUp(_p: Point): void {
    this.editor.changeState(new SelectState(this.editor));
  }

  override connectorLook(connector: Connector): ConnectorLook {
    if (connector === this.connector) return { line: "moving", handle: null };
    return super.connectorLook(connector);
  }
}
