import type { Connector } from "../../model/Connector.ts";
import type { DiagramState } from "../../model/DiagramState.ts";
import type { Point } from "../../model/geometry.ts";
import { tidyUp } from "../../model/Layout.ts";
import { type ConnectorLook, EditorState, type StateLook } from "../EditorState.ts";
import { importAndReport } from "../importReport.ts";
import { ConnectorDragState } from "./ConnectorDragState.ts";
import { ConnectorMoveState } from "./ConnectorMoveState.ts";
import { ExportXmlState } from "./ExportXmlState.ts";
import { StateDragState } from "./StateDragState.ts";
import { StateResizeState } from "./StateResizeState.ts";

/**
 * STATE_SELECT - the editor's "normal" state: the mouse is up, and the user can pick things, use the toolbar,
 * or delete the selected object.
 *
 *   newStateButton pressed      -> STATE_STATE_DRAG       (dragging a brand new state)
 *   newChoiceButton pressed     -> STATE_STATE_DRAG       (dragging a brand new choice diamond)
 *   newInitial/Final/TerminateButton -> STATE_STATE_DRAG  (dragging a new initial dot / final bullseye / terminate X)
 *   newConnectorButton pressed  -> STATE_CONNECTOR_DRAG   (dragging the start of a brand new connector)
 *   mouse down on a state       -> STATE_STATE_DRAG
 *   mouse down on the selected state's resize handle (bottom-right corner) -> STATE_STATE_RESIZE (NEW)
 *   mouse down on a connector   -> STATE_CONNECTOR_MOVE (its center) or STATE_CONNECTOR_DRAG (one of its ends)
 *   mouse down on a label       -> STATE_CONNECTOR_MOVE (NEW: as if grabbed by its center)
 *   exportXMLButton released    -> STATE_EXPORT_XML
 *   tidyUpButton released       -> (stays in STATE_SELECT: the states are moved, then redrawn next frame)
 *   Ctrl/Cmd-D                  -> (stays in STATE_SELECT: the selected object is copied, and the copy selected)
 */
export class SelectState extends EditorState {
  readonly name = "STATE_SELECT";

  override onEnterFrame(): void {
    this.editor.view.drawScene();
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

  override onNewConnectorTool(p: Point): void {
    const connector = this.editor.createConnector(p);
    this.editor.changeState(new ConnectorDragState(this.editor, connector, "start"));
  }

  override onMouseMove(p: Point): void {
    // highlight whatever is under the mouse
    this.editor.findHover(p);
  }

  override onMouseDown(p: Point): void {
    const editor = this.editor;
    // NEW: the selected state's resize handle comes first (it is only there while the state is selected)
    const selected = editor.selectedState;
    if (selected?.onResizeHandle(p)) {
      const corner = selected.resizeHandle;
      editor.changeState(new StateResizeState(editor, selected, { x: corner.x - p.x, y: corner.y - p.y }));
      return;
    }
    editor.deselect();
    editor.findHover(p);
    // NEW: labels are drawn on top of everything, so a label under the mouse comes first
    const labelled = editor.diagram.findLabelAt(p);

    if (labelled) {
      editor.selectedConnector = labelled;
      editor.view.showProperties();
      const c = labelled.center;
      editor.changeState(new ConnectorMoveState(editor, labelled, { x: c.x - p.x, y: c.y - p.y }));
    } else if (editor.hoverState) {
      // selecting a STATE takes precedence over selecting a CONNECTOR
      const state = editor.hoverState;
      editor.selectedState = state;
      editor.view.showProperties();
      const grabOffset = { x: p.x - state.x, y: p.y - state.y };
      editor.changeState(new StateDragState(editor, state, grabOffset));
    } else if (editor.hoverConnector) {
      const { connector, part } = editor.hoverConnector;
      editor.selectedConnector = connector;
      editor.view.showProperties();
      if (part === "center") {
        editor.changeState(new ConnectorMoveState(editor, connector));
      } else {
        editor.changeState(new ConnectorDragState(editor, connector, part));
      }
    } else {
      // clicked on nothing: nothing selected
      editor.view.showProperties();
    }
  }

  override onTidyUp(): void {
    tidyUp(this.editor.diagram);
  }

  override onExportXml(): void {
    this.editor.changeState(new ExportXmlState(this.editor));
  }

  override onImportXml(xml: string): void {
    const editor = this.editor;
    editor.deselect();
    editor.hoverState = null;
    editor.hoverConnector = null;
    const { imported, message } = importAndReport(xml, editor.diagram);
    if (imported) editor.view.diagramLoaded();
    editor.view.showMessage(message);
    editor.view.showProperties();
  }

  override onDeleteKey(): void {
    const editor = this.editor;
    if (editor.selectedState) {
      editor.diagram.removeState(editor.selectedState);
    } else if (editor.selectedConnector) {
      editor.diagram.removeConnector(editor.selectedConnector);
    } else {
      return;
    }
    editor.deselect();
    editor.hoverState = null;
    editor.hoverConnector = null;
    editor.view.showProperties();
  }

  override onDuplicateKey(): void {
    const editor = this.editor;
    if (editor.selectedState) {
      editor.selectedState = editor.diagram.duplicateState(editor.selectedState);
    } else if (editor.selectedConnector) {
      editor.selectedConnector = editor.diagram.duplicateConnector(editor.selectedConnector);
    } else {
      return;
    }
    editor.view.showProperties();
  }

  // in SELECT, things under the mouse are highlighted
  override stateLook(state: DiagramState): StateLook {
    if (state === this.editor.selectedState) return "selected";
    return state === this.editor.hoverState ? "hover" : "normal";
  }

  override connectorLook(connector: Connector): ConnectorLook {
    const look = super.connectorLook(connector);
    const hover = this.editor.hoverConnector;
    if (hover?.connector === connector) look.handle = hover.part;
    return look;
  }
}
