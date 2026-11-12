import type { DrawingLook } from "../editor/Editor.ts";
import type { Connector } from "../model/Connector.ts";
import type { Diagram } from "../model/Diagram.ts";
import { DiagramState } from "../model/DiagramState.ts";
import { Compass, midpoint, type Point } from "../model/geometry.ts";
import { type Box, placeLabels } from "./labels.ts";
import { boundsOf, Viewport } from "./Viewport.ts";

// Draws the diagram into an <svg> element - drawScene(), drawConnectors() and drawStateObjects() in the
// Flash version. HOW each thing is drawn (highlighted? selected? being dragged?) is decided by the editor's
// current state object (stateLook() / connectorLook()), so there are no "if in state X" checks here.

export class DiagramView {
  /** how far the diagram is panned and zoomed (NEW) */
  readonly viewport = new Viewport();
  /** where the labels were drawn last time (for "fit") */
  private labelBoxes: Box[] = [];

  constructor(private readonly svg: SVGSVGElement) {}

  /** Convert a mouse event's position to diagram coordinates (allowing for the pan and zoom). */
  toDiagram(e: { clientX: number; clientY: number }): Point {
    return this.viewport.toDiagram(this.toScreen(e));
  }

  /** A mouse event's position on the <svg>, in screen pixels. */
  toScreen(e: { clientX: number; clientY: number }): Point {
    const r = this.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** The middle of the <svg>, in screen pixels. */
  get screenMiddle(): Point {
    const r = this.svg.getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  }

  /** Zoom (up to `maxScale`) and center so the whole diagram (states, arrows and labels) fits on screen. */
  fit(diagram: Diagram, keepClear: number, maxScale?: number): void {
    const boxes: Box[] = [...diagram.states, ...this.labelBoxes];
    for (const c of diagram.connectors) {
      for (const p of [c.start.point, c.end.point]) boxes.push({ x: p.x, y: p.y, width: 0, height: 0 });
    }
    const r = this.svg.getBoundingClientRect();
    this.viewport.fit(boundsOf(boxes), r.width, r.height, keepClear, maxScale);
  }

  draw(diagram: Diagram, editorState: DrawingLook): void {
    diagram.updateBends();
    let s = "";
    // connectors underneath, then states on top (like the Flash movie clip depths), then the arrows'
    // labels on top of everything, so a long label on a short arrow isn't hidden under a state
    diagram.connectors.forEach((c) => (s += this.connectorSvg(c, editorState)));
    for (const state of diagram.states) s += this.stateSvg(state, editorState);
    s += this.labelsSvg(diagram);
    this.svg.innerHTML = `<g transform="${this.viewport.transform}">${s}</g>`;
  }

  private stateSvg(state: DiagramState, editorState: DrawingLook): string {
    const look = editorState.stateLook(state);
    const left = state.x - state.width / 2;
    const top = state.y - state.height / 2;
    if (state.isChoice) return this.choiceSvg(state, look);
    if (state.isRound) return this.roundSvg(state, look);
    let s = `<g class="state ${look}">`;
    // a UML state: a rounded box with the name in the middle
    const radius = state.cornerRadius;
    s +=
      `<rect class="state-box" x="${left}" y="${top}" width="${state.width}" height="${state.height}" rx="${radius}"/>`;
    const lines = state.nameLines();
    const lineHeight = DiagramState.NAME_LINE_HEIGHT;
    const behaviours = state.shownBehaviours();
    if (behaviours.length === 0) {
      const firstBaseline = state.y - ((lines.length - 1) * lineHeight) / 2 + 5;
      lines.forEach((text, i) => {
        s += `<text class="state-name" x="${state.x}" y="${firstBaseline + i * lineHeight}">${escape(text)}</text>`;
      });
    } else {
      s += this.behavioursSvg(state, lines, behaviours);
    }
    if (look === "snap") s += snapHandles(state);
    if (look === "selected" && state.canResize) s += resizeHandle(state);
    return s + "</g>";
  }

  /**
   * NEW: a state showing its behaviours, the UML way - the name at the top, a line across, then
   *   entry/ ...
   *   do/ ...
   *   exit/ ...
   * (The sizes match DiagramState.height, which makes room for them.)
   */
  private behavioursSvg(state: DiagramState, nameLines: string[], behaviours: string[]): string {
    const left = state.x - state.width / 2;
    const top = state.y - state.height / 2;
    let s = "";
    nameLines.forEach((text, i) => {
      const y = top + 23 + i * DiagramState.NAME_LINE_HEIGHT;
      s += `<text class="state-name" x="${state.x}" y="${y}">${escape(text)}</text>`;
    });
    // the line across: inside the rounded corners
    const lineY = top + 10 + nameLines.length * DiagramState.NAME_LINE_HEIGHT + 3;
    const r = state.cornerRadius;
    const dy = Math.max(0, r - (lineY - top));
    const inset = r - Math.sqrt(r * r - dy * dy);
    s += `<line class="state-divider" x1="${left + inset}" y1="${lineY}" x2="${
      left + state.width - inset
    }" y2="${lineY}"/>`;
    behaviours.forEach((text, i) => {
      const y = lineY + 16 + i * DiagramState.BEHAVIOUR_LINE_HEIGHT;
      s += `<text class="state-behaviour" x="${left + 10}" y="${y}">${escape(text)}</text>`;
    });
    return s;
  }

  /** A UML choice: a diamond (NEW - see ChoicePoint.ts). */
  private choiceSvg(choice: DiagramState, look: string): string {
    const w = choice.width / 2;
    const h = choice.height / 2;
    const { x, y } = choice;
    let s = `<g class="state choice ${look}">`;
    s += `<path class="state-box" d="M${x} ${y - h} L${x + w} ${y} L${x} ${y + h} L${x - w} ${y} Z"/>`;
    if (look === "snap") s += snapHandles(choice);
    return s + "</g>";
  }

  /** The UML initial dot (filled), final bullseye (a ring round a dot) or terminate X - NEW, see Pseudostates.ts. */
  private roundSvg(shape: DiagramState, look: string): string {
    const r = shape.width / 2;
    let s = `<g class="state ${shape.kind} ${look}">`;
    if (shape.isTerminate) {
      // an invisible circle to pick it by (and show it selected), and the X
      const d = r * 0.7;
      s += `<circle class="state-box terminate-hit" cx="${shape.x}" cy="${shape.y}" r="${r}"/>`;
      s += `<path class="terminate-x" d="M${shape.x - d} ${shape.y - d} L${shape.x + d} ${shape.y + d} ` +
        `M${shape.x + d} ${shape.y - d} L${shape.x - d} ${shape.y + d}"/>`;
    } else if (shape.isFinal) {
      s += `<circle class="state-box final-ring" cx="${shape.x}" cy="${shape.y}" r="${r}"/>`;
      s += `<circle class="final-dot" cx="${shape.x}" cy="${shape.y}" r="${r - 6}"/>`;
    } else {
      s += `<circle class="state-box" cx="${shape.x}" cy="${shape.y}" r="${r}"/>`;
    }
    if (look === "snap") s += snapHandles(shape);
    return s + "</g>";
  }

  private connectorSvg(connector: Connector, editorState: DrawingLook): string {
    const look = editorState.connectorLook(connector);
    const p1 = connector.start.point;
    const p2 = connector.end.point;
    const c = connector.center;

    // NEW: arrows between the same two states (and loops) are curves - see Diagram.updateBends()
    const control = connector.control;
    let path = connector.isCurved
      ? `M${p1.x} ${p1.y} Q${control.x} ${control.y} ${p2.x} ${p2.y}`
      : `M${p1.x} ${p1.y} L${p2.x} ${p2.y}`;
    // an open "V" arrow head at the end, pointing along the line - or, on a curve, the way the curve is
    // going as it arrives (from its control point). The Flash version drew a "star" here.
    path += arrowHead(connector.isCurved ? control : p1, p2);
    // a little square marks the center (grab it to move the whole connector)
    path += square(c, 2);

    let s = `<path class="connector ${look.line}" d="${path}"/>`;
    if (look.handle) {
      const at = look.handle === "start" ? p1 : look.handle === "end" ? p2 : c;
      s += `<path class="connector-handle" d="${square(at, 10)}"/>`;
    }
    return s;
  }

  /**
   * The labels: each arrow's event name and any [guard], e.g. "COIN_INSERTED" or "[gumballs > 0]".
   * Usually just above the middle of the arrow - but moved along it if that would overlap another label.
   */
  private labelsSvg(diagram: Diagram): string {
    const labelled = diagram.connectors
      .map((connector) => ({ connector, text: connector.labelText() }))
      .filter((l) => l.text !== "");
    const places = placeLabels(
      // (a curve's label goes by the middle of the curve: the line from half way to its control point, to
      // half way back - it touches the curve right in the middle, going the same way)
      labelled.map(({ connector, text }) => ({
        from: connector.isCurved ? midpoint(connector.start.point, connector.control) : connector.start.point,
        to: connector.isCurved ? midpoint(connector.control, connector.end.point) : connector.end.point,
        width: text.length * LABEL_CHAR_WIDTH + 10,
        height: 18,
      })),
      diagram.states,
    );
    let s = "";
    this.labelBoxes = [];
    for (const connector of diagram.connectors) connector.labelBox = null;
    labelled.forEach(({ connector, text }, i) => {
      const { x, y } = places[i];
      const width = text.length * LABEL_CHAR_WIDTH + 10;
      this.labelBoxes.push({ x, y, width, height: 18 });
      connector.labelBox = { x, y, width, height: 18 }; // (so clicking the label selects the connector)
      s += `<rect class="connector-label-bg" x="${x - width / 2}" y="${y - 9}" width="${width}" height="18" rx="2"/>`;
      s += `<text class="connector-label" x="${x}" y="${y + 5}">${escape(text)}</text>`;
    });
    return s;
  }
}

/** NEW: the resize handle - a small square on the selected state's bottom-right corner, to drag */
function resizeHandle(state: DiagramState): string {
  const { x, y } = state.resizeHandle;
  return `<rect class="resize-handle" x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2"/>`;
}

/** red handles on the compass points a connector end can snap to (just the center, for the dots) */
function snapHandles(state: DiagramState): string {
  let s = "";
  const points = state.snapPoints.length > 0 ? state.snapPoints : [Compass.CENTER];
  for (const compass of points) {
    const p = state.compassPoint(compass);
    s += `<rect class="snap-handle" x="${p.x - 3}" y="${p.y - 3}" width="6" height="6"/>`;
  }
  return s;
}

/** about how wide one character of the (monospaced, 12px) connector label is */
const LABEL_CHAR_WIDTH = 7.3;

/** Two short lines making an open arrow head, with its tip at `to`, pointing away from `from`. */
function arrowHead(from: Point, to: Point): string {
  const LENGTH = 16;
  const SPREAD = Math.PI / 7; // about 26 degrees either side of the line
  const angle = from.x === to.x && from.y === to.y ? 0 : Math.atan2(to.y - from.y, to.x - from.x);
  const wing = (side: number) => ({
    x: to.x - LENGTH * Math.cos(angle + side * SPREAD),
    y: to.y - LENGTH * Math.sin(angle + side * SPREAD),
  });
  const a = wing(1);
  const b = wing(-1);
  return ` M${a.x} ${a.y} L${to.x} ${to.y} L${b.x} ${b.y}`;
}

function square(p: Point, half: number): string {
  return ` M${p.x - half} ${p.y - half} h${half * 2} v${half * 2} h${-half * 2} Z`;
}

function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
