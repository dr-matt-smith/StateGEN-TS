import { EditorState } from "../EditorState.ts";
import { SelectState } from "./SelectState.ts";

/**
 * STATE_GAME_LOADING - the state the editor starts in.
 *
 * In the Flash version its <exitStateActions> set up the global "game" object; here the constructors do
 * that, so all that is left is the one transition:  EVENT_ON_LOAD -> STATE_SELECT
 */
export class LoadingState extends EditorState {
  readonly name = "STATE_GAME_LOADING";

  override onLoad(): void {
    this.editor.changeState(new SelectState(this.editor));
  }

  // nothing to draw yet
  override showsDiagram(): boolean {
    return false;
  }
}
