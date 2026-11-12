import type { DiagramState } from "../../model/DiagramState.ts";
import type { Point } from "../../model/geometry.ts";
import { EditorState } from "../EditorState.ts";
import type { StateGenEditor } from "../StateGenEditor.ts";
import { SelectState } from "./SelectState.ts";

/**
 * STATE_STATE_RESIZE (NEW) - the selected state's resize handle (its bottom-right corner) is following the
 * mouse, so the state gets bigger or smaller. Its top-left corner stays put, and arrows snapped to it follow.
 *
 *   mouse up  -> STATE_SELECT
 */
export class StateResizeState extends EditorState {
  readonly name = "STATE_STATE_RESIZE";

  constructor(
    editor: StateGenEditor,
    private readonly resized: DiagramState,
    /** how far the mouse was from the corner when it grabbed the handle, so the corner doesn't jump */
    private readonly grabOffset: Point,
  ) {
    super(editor);
  }

  override onEnterFrame(): void {
    this.editor.view.drawScene();
  }

  override onMouseMove(p: Point): void {
    this.resized.dragCornerTo({ x: p.x + this.grabOffset.x, y: p.y + this.grabOffset.y });
  }

  override onMouseUp(p: Point): void {
    this.onMouseMove(p);
    this.editor.findHover(p);
    this.editor.changeState(new SelectState(this.editor));
  }
}
