import type { StateProperty } from "./Actions.ts";
import { ALL_COMPASS_POINTS, Compass, type Point, upperCaseUnderScored } from "./geometry.ts";

export type ShapeKind = "state" | "choice" | "initial" | "final" | "terminate";

/**
 * A state box drawn on the diagram (a "StateMC" movie clip in the Flash version).
 *
 * Not to be confused with the editor's own states (SelectState, StateDragState, ...) in src/editor/states/ -
 * those are the State pattern; this is just data the user draws.
 *
 * (x, y) is the CENTER of the box, like the Flash movie clip's registration point.
 */
export class DiagramState {
  static readonly WIDTH = 140;
  static readonly HEIGHT = 72;

  /** state name, e.g. "MAIN MENU" (the Flash version made it upper case as you typed) */
  public stateName: string;
  /** Flash frame label to go to when this state is entered, e.g. "mainMenu" (may be empty) */
  public frameName = "";
  /**
   * NEW (version 2): the id of the HTML element (a "screen") to show when this state is entered, e.g.
   * "export-screen" - what frameName was in Flash. (May be empty.)
   */
  public screen = "";
  /** ENTRY behaviours: functions to call, in order, when this state is entered (Flash had one name) */
  public enterActions: string[] = [];
  /** NEW: DO behaviours - functions to call, in order, every frame while the game is in this state */
  public doActions: string[] = [];
  /** EXIT behaviours: functions to call, in order, when this state is exited */
  public exitActions: string[] = [];
  /** NEW (version 2): constant values the view can read from the state, e.g. highlightHover = true */
  public properties: StateProperty[] = [];

  constructor(
    /** instance ID, e.g. "state1" - never changes */
    public readonly instanceId: string,
    public x: number,
    public y: number,
  ) {
    this.stateName = instanceId;
  }

  /**
   * NEW: show each state's behaviours (entry/, do/, exit/) inside its box, under its name? (The View
   * tools' "behaviours" button.) A state with behaviours showing is taller, so this is here, not in the
   * view: the arrows attach to, and the mouse finds, the box as it is drawn.
   */
  static showBehaviours = true;
  /** the behaviour text's line height (its characters are about 6.8 pixels wide) */
  static readonly BEHAVIOUR_LINE_HEIGHT = 14;
  /** the state name's line height (its characters are about 10 pixels wide) */
  static readonly NAME_LINE_HEIGHT = 17;
  /** NEW: the smallest a state can be resized to */
  static readonly MIN_WIDTH = 80;
  static readonly MIN_HEIGHT = 40;
  /** NEW: how near (diagram pixels) the mouse must be to the resize handle to grab it */
  static readonly RESIZE_HANDLE_REACH = 9;

  /** NEW: the box's size, as the user has resized it (see resizeTo()) */
  private boxWidth: number = DiagramState.WIDTH;
  private boxHeight: number = DiagramState.HEIGHT;

  get width(): number {
    return this.boxWidth;
  }

  /** The box's height - taller than it was resized to, if that's what it takes to show its behaviours. */
  get height(): number {
    const behaviours = this.shownBehaviours();
    if (behaviours.length === 0) return this.boxHeight;
    // the name, a line under it, then the behaviours (see DiagramView.stateSvg())
    return Math.max(
      this.boxHeight,
      10 + this.nameLines().length * DiagramState.NAME_LINE_HEIGHT + 8 +
        behaviours.length * DiagramState.BEHAVIOUR_LINE_HEIGHT + 8,
    );
  }

  /** NEW: the size the user resized the box to (the height leaves out any extra room for behaviours) */
  get boxSize(): { width: number; height: number } {
    return { width: this.boxWidth, height: this.boxHeight };
  }

  /** NEW: has it been resized? (Only then is its size saved in the XML.) */
  get isResized(): boolean {
    return this.boxWidth !== DiagramState.WIDTH || this.boxHeight !== DiagramState.HEIGHT;
  }

  /** NEW: can the user resize it? Only a real state - the pseudostates are a fixed size. */
  get canResize(): boolean {
    return this.isRealState;
  }

  /** NEW: set the box's size (whole pixels, no smaller than MIN_WIDTH x MIN_HEIGHT), keeping its center */
  resizeTo(width: number, height: number): void {
    if (!this.canResize) return;
    this.boxWidth = Math.max(DiagramState.MIN_WIDTH, Math.round(width));
    this.boxHeight = Math.max(DiagramState.MIN_HEIGHT, Math.round(height));
  }

  /** NEW: the resize handle - the bottom-right corner of the box */
  get resizeHandle(): Point {
    return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
  }

  /** NEW: is p on the resize handle? */
  onResizeHandle(p: Point): boolean {
    if (!this.canResize) return false;
    const h = this.resizeHandle;
    return Math.abs(p.x - h.x) <= DiagramState.RESIZE_HANDLE_REACH &&
      Math.abs(p.y - h.y) <= DiagramState.RESIZE_HANDLE_REACH;
  }

  /** NEW: drag the bottom-right corner to p - the top-left corner stays where it is */
  dragCornerTo(p: Point): void {
    const left = this.x - this.width / 2;
    const top = this.y - this.height / 2;
    this.resizeTo(p.x - left, p.y - top);
    this.x = left + this.width / 2;
    this.y = top + this.height / 2;
  }

  /** how many characters of the name fit across the box (12 at the usual width) */
  get nameLineLength(): number {
    return Math.max(4, Math.floor((this.width - 20) / 10));
  }

  /** how many characters of a behaviour fit across the box (18 at the usual width) */
  get behaviourLineLength(): number {
    return Math.max(6, Math.floor((this.width - 14) / 6.8));
  }

  /** the state name, split into lines that fit in the box (at most 3) */
  nameLines(): string[] {
    return wrapText(this.stateName, this.nameLineLength).slice(0, 3);
  }

  /**
   * The behaviours as UML writes them inside a state, one line each, e.g.
   *   entry/ dispense, beep
   *   do/ flashLight
   *   exit/ stopLight
   * (long ones wrap onto more lines). Empty unless this is a real state, it has some behaviours, and
   * showBehaviours is on.
   */
  shownBehaviours(): string[] {
    if (!DiagramState.showBehaviours || !this.isRealState) return [];
    const lines: string[] = [];
    for (
      const [label, actions] of [["entry", this.enterActions], ["do", this.doActions], [
        "exit",
        this.exitActions,
      ]] as const
    ) {
      if (actions.length > 0) {
        lines.push(...wrapText(`${label}/ ${actions.join(", ")}`, this.behaviourLineLength, true));
      }
    }
    return lines;
  }
  /** how rounded the corners are (a UML state is a rounded box) */
  get cornerRadius(): number {
    return Math.min(DiagramState.HEIGHT * 0.4, this.width / 2, this.height / 2);
  }

  /**
   * What sort of thing this is. NEW: as well as states, the diagram can have UML "pseudostates" - things
   * that are drawn and connected like states, but that the game never waits in:
   *   "choice"   a decision diamond (ChoicePoint.ts)
   *   "initial"  the filled dot the state machine starts from (Pseudostates.ts)
   *   "final"    the bullseye: the state machine has ended (Pseudostates.ts)
   *   "terminate" the X: the state machine's object is deleted (Pseudostates.ts)
   */
  get kind(): ShapeKind {
    return "state";
  }

  /** true for a choice (decision) diamond - see ChoicePoint.ts */
  get isChoice(): boolean {
    return this.kind === "choice";
  }

  /** true for the initial (start) dot */
  get isInitial(): boolean {
    return this.kind === "initial";
  }

  /** true for a final (end) bullseye */
  get isFinal(): boolean {
    return this.kind === "final";
  }

  /** true for a terminate X (NEW) */
  get isTerminate(): boolean {
    return this.kind === "terminate";
  }

  /** true for the round pseudostates: the initial dot, the final bullseye and the terminate X */
  get isRound(): boolean {
    return this.isInitial || this.isFinal || this.isTerminate;
  }

  /** true for a real state - one the game can be in, written to game.xml as a <state> */
  get isRealState(): boolean {
    return this.kind === "state";
  }

  /**
   * The compass points a connector end can snap to (the red handles). Its CENTER is always allowed too:
   * drop an end inside the shape to attach it there.
   */
  get snapPoints(): readonly Compass[] {
    return ALL_COMPASS_POINTS;
  }

  /** The XML id, e.g. "STATE_MAIN_MENU". */
  get xmlId(): string {
    return upperCaseUnderScored("STATE_" + this.stateName);
  }

  moveTo(p: Point): void {
    this.x = p.x;
    this.y = p.y;
  }

  /** true if the point is inside the box (the Flash version used movieClip.hitTest()) */
  contains(p: Point): boolean {
    return Math.abs(p.x - this.x) <= this.width / 2 && Math.abs(p.y - this.y) <= this.height / 2;
  }

  /**
   * Where one of the 8 compass points of the box is right now. The diagonal ones (NORTH_EAST, ...) are half
   * way round the rounded corners, so they sit on the outline instead of at the old square corners.
   */
  compassPoint(compass: Compass): Point {
    const w = this.width / 2;
    const h = this.height / 2;
    // from the corner circle's center, 45 degrees out to the outline
    const r = this.cornerRadius;
    const diagonal = (sx: number, sy: number): Point => ({
      x: this.x + sx * (w - r + r * Math.SQRT1_2),
      y: this.y + sy * (h - r + r * Math.SQRT1_2),
    });
    switch (compass) {
      case Compass.NORTH:
        return { x: this.x, y: this.y - h };
      case Compass.SOUTH:
        return { x: this.x, y: this.y + h };
      case Compass.EAST:
        return { x: this.x + w, y: this.y };
      case Compass.WEST:
        return { x: this.x - w, y: this.y };
      case Compass.NORTH_EAST:
        return diagonal(1, -1);
      case Compass.NORTH_WEST:
        return diagonal(-1, -1);
      case Compass.SOUTH_EAST:
        return diagonal(1, 1);
      case Compass.SOUTH_WEST:
        return diagonal(-1, 1);
      case Compass.CENTER:
        return { x: this.x, y: this.y };
    }
  }

  /**
   * Where a line from the center of the box toward `target` crosses the box's outline
   * (the outline is a rounded rectangle, the same shape DiagramView draws).
   */
  outlinePointToward(target: Point): Point {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return { x: this.x, y: this.y - this.height / 2 }; // no direction: use the top
    const ux = dx / length;
    const uy = dy / length;
    const w = this.width / 2;
    const h = this.height / 2;
    const r = this.cornerRadius;

    // where the line leaves the plain (square-cornered) rectangle
    let t = Math.min(ux === 0 ? Infinity : w / Math.abs(ux), uy === 0 ? Infinity : h / Math.abs(uy));
    if (Math.abs(t * ux) > w - r && Math.abs(t * uy) > h - r) {
      // it's in a rounded corner: where does the line leave that corner's circle?
      const cx = Math.sign(ux) * (w - r);
      const cy = Math.sign(uy) * (h - r);
      const along = ux * cx + uy * cy;
      t = along + Math.sqrt(along * along - (cx * cx + cy * cy) + r * r);
    }
    return { x: this.x + t * ux, y: this.y + t * uy };
  }
}

/**
 * Split text into lines of at most `width` characters, breaking at spaces where possible. A word longer
 * than a line is left as it is, unless `breakLongWords` - then it is split across lines.
 */
export function wrapText(text: string, width: number, breakLongWords = false): string[] {
  const lines: string[] = [];
  let line = "";
  const words = text.split(" ").flatMap((word) =>
    breakLongWords && word.length > width ? (word.match(new RegExp(`.{1,${width}}`, "g")) ?? [word]) : [word]
  );
  for (const word of words) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  lines.push(line);
  return lines;
}
