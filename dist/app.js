(() => {
  // src/model/geometry.ts
  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function midpoint(a, b) {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }
  var Compass = /* @__PURE__ */ function(Compass2) {
    Compass2["NORTH"] = "NORTH";
    Compass2["SOUTH"] = "SOUTH";
    Compass2["EAST"] = "EAST";
    Compass2["WEST"] = "WEST";
    Compass2["NORTH_EAST"] = "NORTH_EAST";
    Compass2["NORTH_WEST"] = "NORTH_WEST";
    Compass2["SOUTH_EAST"] = "SOUTH_EAST";
    Compass2["SOUTH_WEST"] = "SOUTH_WEST";
    Compass2["CENTER"] = "CENTER";
    return Compass2;
  }({});
  var ALL_COMPASS_POINTS = [
    Compass.NORTH,
    Compass.SOUTH,
    Compass.EAST,
    Compass.WEST,
    Compass.NORTH_EAST,
    Compass.NORTH_WEST,
    Compass.SOUTH_EAST,
    Compass.SOUTH_WEST
  ];
  function upperCaseUnderScored(s) {
    return underScored(s.toUpperCase());
  }
  function underScored(s) {
    return s.replaceAll(" ", "_");
  }

  // src/model/ConnectorEnd.ts
  var ConnectorEnd = class {
    floatingAt;
    snappedTo = null;
    /** the connector's other end - a CENTER end needs it to know which way to point */
    otherEnd = null;
    /** NEW: where a curved connector bends towards (null: it's straight) - a CENTER end points that way */
    curveControl = () => null;
    constructor(p) {
      this.floatingAt = {
        x: p.x,
        y: p.y
      };
    }
    /**
     * Where this end is drawn right now. A CENTER end is drawn where the line crosses the state's outline,
     * so the arrow head isn't hidden under the state (and the end can still be grabbed).
     */
    get point() {
      if (!this.snappedTo) return this.floatingAt;
      const { state, compass } = this.snappedTo;
      if (compass !== Compass.CENTER) return state.compassPoint(compass);
      const other = this.curveControl() ?? this.otherEnd?.aimPoint ?? {
        x: state.x + 1,
        y: state.y
      };
      return state.outlinePointToward(other);
    }
    /** The point the other end should aim at: a CENTER end aims at its state's center. */
    get aimPoint() {
      if (this.snappedTo?.compass === Compass.CENTER) return this.snappedTo.state.compassPoint(Compass.CENTER);
      return this.point;
    }
    /** The state this end is attached to, or null if floating. */
    get state() {
      return this.snappedTo?.state ?? null;
    }
    get compass() {
      return this.snappedTo?.compass ?? null;
    }
    get isFloating() {
      return this.snappedTo === null;
    }
    floatAt(p) {
      this.floatingAt = {
        x: p.x,
        y: p.y
      };
      this.snappedTo = null;
    }
    /** Attach to a compass point of `state` - or its CENTER, if that shape has no such point (e.g. the dots). */
    snapTo(state, compass) {
      if (compass !== Compass.CENTER && !state.snapPoints.includes(compass)) compass = Compass.CENTER;
      this.snappedTo = {
        state,
        compass
      };
    }
    /** Leave a snapped end floating where it is now - updateConnectorPoints() in the Flash version. */
    unsnap() {
      this.floatAt(this.point);
    }
    moveBy(dx, dy) {
      const p = this.point;
      this.floatAt({
        x: p.x + dx,
        y: p.y + dy
      });
    }
  };

  // src/model/WebEvents.ts
  function entry(category, on, camel, eventClass, target, description, pointer = false, key = false) {
    return {
      on,
      category,
      eventClass,
      target,
      pointer,
      key,
      camel,
      description
    };
  }
  var PALETTE = [
    entry("Pointer", "click", "click", "MouseEvent", "element", "pressed and released (a button, a link, anything)", true),
    entry("Pointer", "dblclick", "dblClick", "MouseEvent", "element", "double-clicked", true),
    entry("Pointer", "pointerdown", "pointerDown", "PointerEvent", "element", "mouse button, pen or finger goes down", true),
    entry("Pointer", "pointerup", "pointerUp", "PointerEvent", "document", "mouse button, pen or finger comes up", true),
    entry("Pointer", "pointermove", "pointerMove", "PointerEvent", "document", "the pointer moves", true),
    entry("Pointer", "pointerenter", "pointerEnter", "PointerEvent", "element", "the pointer moves onto it", true),
    entry("Pointer", "pointerleave", "pointerLeave", "PointerEvent", "element", "the pointer moves off it", true),
    entry("Pointer", "contextmenu", "contextMenu", "MouseEvent", "element", "right-click (or long press)", true),
    entry("Pointer", "wheel", "wheel", "WheelEvent", "element", "the mouse wheel or trackpad scrolls", true),
    entry("Keyboard", "keydown", "keyDown", "KeyboardEvent", "document", "a key goes down (and repeats)", false, true),
    entry("Keyboard", "keyup", "keyUp", "KeyboardEvent", "document", "a key comes up", false, true),
    entry("Form", "input", "input", "Event", "element", "a text field's value changes as you type"),
    entry("Form", "change", "change", "Event", "element", "a field's value has changed (a select, a checkbox)"),
    entry("Form", "submit", "submit", "SubmitEvent", "element", "a form is submitted"),
    entry("Form", "focus", "focus", "FocusEvent", "element", "it gets the keyboard focus"),
    entry("Form", "blur", "blur", "FocusEvent", "element", "it loses the keyboard focus"),
    entry("Media", "play", "play", "Event", "media", "a video or sound starts playing"),
    entry("Media", "pause", "pause", "Event", "media", "it is paused"),
    entry("Media", "ended", "ended", "Event", "media", "it has played to the end"),
    entry("Media", "timeupdate", "timeUpdate", "Event", "media", "its current time changes (a few times a second)"),
    entry("Media", "canplaythrough", "canPlayThrough", "Event", "media", "it has loaded enough to play to the end"),
    entry("CSS", "animationend", "animationEnd", "AnimationEvent", "element", "a CSS animation has finished"),
    entry("CSS", "transitionend", "transitionEnd", "TransitionEvent", "element", "a CSS transition has finished"),
    entry("Page", "resize", "resize", "UIEvent", "window", "the window changes size"),
    entry("Page", "visibilitychange", "visibilityChange", "Event", "document", "the tab is hidden or shown again"),
    entry("Page", "hashchange", "hashChange", "HashChangeEvent", "window", "the #part of the address changes"),
    entry("Drag and drop", "dragstart", "dragStart", "DragEvent", "element", "something starts being dragged", true),
    entry("Drag and drop", "dragover", "dragOver", "DragEvent", "element", "something is dragged over it", true),
    entry("Drag and drop", "drop", "drop", "DragEvent", "element", "something is dropped on it", true)
  ];
  var CATEGORIES = [
    ...new Set(PALETTE.map((e) => e.category))
  ];
  function paletteEntry(on) {
    return PALETTE.find((e) => e.on === on) ?? null;
  }
  function isKeyEvent(on) {
    return paletteEntry(on)?.key ?? false;
  }
  var SPECIAL_KEY_NAMES = {
    SPACE: "Space",
    ESCAPE: "Escape",
    CONTROL: "Control",
    SHIFT: "Shift",
    UP: "ArrowUp",
    DOWN: "ArrowDown",
    LEFT: "ArrowLeft",
    RIGHT: "ArrowRight",
    DELETE: "Delete",
    BACKSPACE: "Backspace"
  };
  var KEY_CODES = new Map([
    [
      8,
      "Backspace"
    ],
    [
      9,
      "Tab"
    ],
    [
      13,
      "Enter"
    ],
    [
      16,
      "Shift"
    ],
    [
      17,
      "Control"
    ],
    [
      18,
      "Alt"
    ],
    [
      27,
      "Escape"
    ],
    [
      32,
      "Space"
    ],
    [
      33,
      "PageUp"
    ],
    [
      34,
      "PageDown"
    ],
    [
      35,
      "End"
    ],
    [
      36,
      "Home"
    ],
    [
      37,
      "ArrowLeft"
    ],
    [
      38,
      "ArrowUp"
    ],
    [
      39,
      "ArrowRight"
    ],
    [
      40,
      "ArrowDown"
    ],
    [
      46,
      "Delete"
    ],
    ...[
      ..."0123456789"
    ].map((d, i) => [
      48 + i,
      d
    ]),
    ...[
      ..."abcdefghijklmnopqrstuvwxyz"
    ].map((c, i) => [
      65 + i,
      c
    ]),
    ...Array.from({
      length: 12
    }, (_, i) => [
      112 + i,
      "F" + (i + 1)
    ]),
    [
      186,
      ";"
    ],
    [
      187,
      "="
    ],
    [
      188,
      ","
    ],
    [
      189,
      "-"
    ],
    [
      190,
      "."
    ],
    [
      191,
      "/"
    ],
    [
      192,
      "`"
    ],
    [
      219,
      "["
    ],
    [
      220,
      "\\"
    ],
    [
      221,
      "]"
    ],
    [
      222,
      "'"
    ]
  ]);
  function keyForCode(code) {
    return KEY_CODES.get(code) ?? null;
  }
  function codeForKey(key) {
    const k = key.length === 1 ? key.toLowerCase() : key;
    for (const [code, name] of KEY_CODES) if (name === k) return code;
    return null;
  }
  function specialKeyName(key) {
    return Object.entries(SPECIAL_KEY_NAMES).find(([, k]) => k === key)?.[0] ?? null;
  }
  var MODIFIERS = [
    "mod",
    "shift",
    "alt"
  ];
  function normalizeMod(mod) {
    const parts = mod.toLowerCase().split(/[\s+]+/).map((m) => m === "ctrl" || m === "cmd" ? "mod" : m);
    return MODIFIERS.filter((m) => parts.includes(m)).join("+");
  }

  // src/model/TransitionEvents.ts
  var TransitionEvent = class {
    /** Add any names this event needs declared at the top of a version 1/2 XML file. Most events need none. */
    declare(_declarations, _mouseArea) {
    }
    /** Says which event this is: two events with the same identity are the same event. */
    identity() {
      return this.group + this.attributes().map(([n, v]) => ` ${n}=${v}`).join("");
    }
  };
  var CompletionEvent = class extends TransitionEvent {
    group = "completion";
    /** no id: written in the XML as <event newState='...'> */
    legacyId() {
      return "";
    }
    attributes() {
      return [];
    }
    label() {
      return "";
    }
  };
  var TimeEvent = class extends TransitionEvent {
    group = "time";
    /** how long, in milliseconds (default 1 second) */
    ms = 1e3;
    legacyId() {
      return "EVENT_AFTER_" + this.ms;
    }
    attributes() {
      return [
        [
          "after",
          String(this.ms)
        ]
      ];
    }
    /** UML style: after(2000ms) */
    label() {
      return `after(${this.ms}ms)`;
    }
  };
  var FrameEvent = class extends TransitionEvent {
    group = "frame";
    /** true = every animation frame (the default), false = the old ON_LOAD */
    onEnterFrame = true;
    legacyId() {
      return this.onEnterFrame ? "EVENT_ON_ENTER_FRAME" : "EVENT_ON_LOAD";
    }
    attributes() {
      return this.onEnterFrame ? [
        [
          "on",
          "animationframe"
        ]
      ] : [];
    }
    label() {
      return this.onEnterFrame ? "animationFrame" : "pageLoad";
    }
  };
  var WebEvent = class extends TransitionEvent {
    group = "web";
    /** the DOM event type, e.g. "click" */
    on = "click";
    /** an element id, or "document" or "window" */
    target = "document";
    /** keyboard events only: the KeyboardEvent.key to match, e.g. "Escape", "d" ("Space" for " "). "" = any key */
    key = "";
    /** keyboard events only: the modifier keys, e.g. "mod" (Ctrl, or Cmd on a Mac), "mod+shift" */
    mod = "";
    /** an old (deprecated) key code that has no key name - from a version 1/2 file - or null */
    keyCode = null;
    /** the target, with "" meaning the document */
    get targetId() {
      return this.target.trim() || "document";
    }
    /** true if it targets an element (not the document or the window) */
    get onElement() {
      return this.targetId !== "document" && this.targetId !== "window";
    }
    /** true for a keyboard event that says which key */
    get hasKey() {
      return isKeyEvent(this.on) && (this.key !== "" || this.keyCode !== null);
    }
    legacyId(mouseArea) {
      const t = this.targetId;
      if (this.on === "click" && this.onElement) return "EVENT_BUTTON_ON_RELEASE_" + t;
      if (this.on === "pointerdown" && (t === "document" || t === mouseArea)) return "EVENT_ON_MOUSE_DOWN";
      if (this.on === "pointerdown" && this.onElement) return "EVENT_BUTTON_ON_PRESS_" + t;
      if (this.on === "pointerup" && t === "document") return "EVENT_ON_MOUSE_UP";
      if (this.on === "pointermove" && t === "document") return "EVENT_ON_MOUSE_MOVE";
      if ((this.on === "keydown" || this.on === "keyup") && t === "document" && this.mod === "" && this.hasKey) {
        const keyName = this.keyCode ?? specialKeyName(this.key) ?? codeForKey(this.key)?.toString();
        if (keyName) return `EVENT_KEY_${this.on === "keydown" ? "DOWN" : "UP"}_${keyName}`;
      }
      return null;
    }
    declare(declarations, mouseArea) {
      const id = this.legacyId(mouseArea);
      if (id?.startsWith("EVENT_BUTTON_")) declarations.buttons.add(this.targetId);
      const code = id?.match(/^EVENT_KEY_(?:DOWN|UP)_(\d+)$/)?.[1];
      if (code) declarations.keyCodes.add(code);
    }
    attributes() {
      const a = [
        [
          "on",
          this.on
        ]
      ];
      if (this.targetId !== "document") a.push([
        "target",
        this.targetId
      ]);
      if (isKeyEvent(this.on)) {
        if (this.key) a.push([
          "key",
          this.key
        ]);
        if (this.keyCode !== null) a.push([
          "keyCode",
          this.keyCode
        ]);
        if (normalizeMod(this.mod)) a.push([
          "mod",
          normalizeMod(this.mod)
        ]);
      }
      return a;
    }
    /** "playButton.click", "keydown(mod+d)", "pointermove", "window.resize" */
    label() {
      const on = this.targetId === "document" ? this.on : `${this.targetId}.${this.on}`;
      if (!this.hasKey) return on;
      const key = this.keyCode !== null ? "#" + this.keyCode : this.key;
      return `${on}(${[
        normalizeMod(this.mod),
        key
      ].filter((k) => k).join("+")})`;
    }
  };
  function webEventFor(id, mouseArea) {
    const e = new WebEvent();
    let m;
    if (m = id.match(/^EVENT_BUTTON_ON_(RELEASE|PRESS)_(.+)$/)) {
      e.on = m[1] === "RELEASE" ? "click" : "pointerdown";
      e.target = m[2];
    } else if (m = id.match(/^EVENT_ON_MOUSE_(DOWN|UP|MOVE)$/)) {
      e.on = "pointer" + m[1].toLowerCase();
      e.target = m[1] === "DOWN" && mouseArea ? mouseArea : "document";
    } else if (m = id.match(/^EVENT_KEY_(DOWN|UP)_(.+)$/)) {
      e.on = m[1] === "DOWN" ? "keydown" : "keyup";
      const key = SPECIAL_KEY_NAMES[m[2]] ?? (/^\d+$/.test(m[2]) ? keyForCode(Number(m[2])) : null);
      if (key !== null) e.key = key;
      else e.keyCode = m[2];
    } else {
      return null;
    }
    return e;
  }
  var CustomNamedEvent = class extends TransitionEvent {
    group = "custom";
    /**
     * e.g. "END_OF_FILM_REACHED" or "coinInserted". Spaces become underscores, but upper/lower case is kept
     * as typed (the Flash version forced it to UPPER CASE).
     */
    eventName = "";
    /** the name, spaces as underscores */
    get name() {
      return underScored(this.eventName.trim());
    }
    legacyId() {
      return "EVENT_USER_DEFINED_" + this.name;
    }
    declare(declarations) {
      declarations.userDefinedEvents.add(this.legacyId());
    }
    attributes() {
      return [
        [
          "custom",
          this.name
        ]
      ];
    }
    /** just the event's own name, e.g. "COIN_INSERTED" or "coinInserted" */
    label() {
      return this.name || "CUSTOM";
    }
  };

  // src/model/Connector.ts
  var Connector = class {
    start;
    end;
    completionEvent = new CompletionEvent();
    timeEvent = new TimeEvent();
    frameEvent = new FrameEvent();
    /** NEW (version 3): a DOM event on a target - replaces the Flash button, mouse and key groups */
    webEvent = new WebEvent();
    /** a custom event, fired by the page's code (version 1/2: "user defined") */
    customEvent = new CustomNamedEvent();
    /**
     * which of the events above fires this transition. Default: none - a completion transition, as in UML,
     * where an arrow with no event is followed as soon as its state has been entered
     */
    eventGroup = "completion";
    /**
     * the functions to call, in order, when the transition happens (may be empty). A name written "name(p)"
     * is passed the mouse position (see Actions.ts). The Flash version had one function name here.
     */
    actions = [];
    /**
     * NEW: a guard condition, e.g. "gumballs > 0" - the transition only happens if it is true. Written
     * without the [ ] UML puts round it. "else" means "if none of the other guards is true".
     */
    guard = "";
    /**
     * NEW (after son-of-fungus-JS): how far the line bends out sideways, in pixels - 0 means straight. Two or
     * more arrows between the same two states bend apart so they don't sit on top of each other, and an arrow
     * from a state back to itself bends out into a loop. Set by Diagram.updateBends().
     */
    bend = 0;
    /** which way it bends: a unit vector at right angles to the line (set with `bend`) */
    bendSide = {
      x: 0,
      y: 0
    };
    /**
     * NEW: where its label (event [guard] / actions) was last drawn - a box, (x, y) being its center - so
     * clicking the label selects the connector. Set by the view each time it draws; null if no label.
     */
    labelBox = null;
    constructor(start, end) {
      this.start = new ConnectorEnd(start);
      this.end = new ConnectorEnd(end);
      this.start.otherEnd = this.end;
      this.end.otherEnd = this.start;
      const control = () => this.bend === 0 ? null : this.bentControl();
      this.start.curveControl = control;
      this.end.curveControl = control;
    }
    get isCurved() {
      return this.bend !== 0;
    }
    /**
     * The control point of the curve (a quadratic Bezier curve: it starts towards this point, and ends
     * coming from it). For a straight connector, just the middle of the line.
     */
    get control() {
      return this.bend === 0 ? midpoint(this.start.point, this.end.point) : this.bentControl();
    }
    /** the middle of the line between where the ends aim, moved `bend` pixels to the side */
    bentControl() {
      const m = midpoint(this.start.aimPoint, this.end.aimPoint);
      return {
        x: m.x + this.bendSide.x * this.bend,
        y: m.y + this.bendSide.y * this.bend
      };
    }
    /** The event currently chosen for this connector. */
    get event() {
      const events = {
        completion: this.completionEvent,
        time: this.timeEvent,
        frame: this.frameEvent,
        web: this.webEvent,
        custom: this.customEvent
      };
      return events[this.eventGroup];
    }
    /** true if this connector leaves a choice diamond (so it has a guard, but no event of its own) */
    get leavesChoice() {
      return this.start.state?.isChoice ?? false;
    }
    /** true if this connector leaves the initial dot (so it has no event: it happens when the game starts) */
    get leavesInitial() {
      return this.start.state?.isInitial ?? false;
    }
    /** The text on the arrow: "EVENT [guard]", just "[guard]" out of a choice, nothing out of the initial dot. */
    labelText() {
      if (this.leavesInitial) return "";
      const guard = this.guard.trim() ? `[${this.guard.trim()}]` : "";
      if (this.leavesChoice) return guard;
      const event = this.event.label();
      return event && guard ? `${event} ${guard}` : event || guard;
    }
    /** The middle of the line (or curve) - where the little square you grab it by is drawn. */
    get center() {
      const p1 = this.start.point;
      const p2 = this.end.point;
      if (this.bend === 0) return midpoint(p1, p2);
      const c = this.control;
      return {
        x: 0.25 * p1.x + 0.5 * c.x + 0.25 * p2.x,
        y: 0.25 * p1.y + 0.5 * c.y + 0.25 * p2.y
      };
    }
    /** Move the whole connector (both ends become floating) - CONNECTOR_MOVEonMouseMove() in the Flash version. */
    moveCenterTo(p) {
      const c = this.center;
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      if (dx === 0 && dy === 0) return;
      this.start.moveBy(dx, dy);
      this.end.moveBy(dx, dy);
    }
  };

  // src/model/DiagramState.ts
  var DiagramState = class _DiagramState {
    instanceId;
    x;
    y;
    static WIDTH = 140;
    static HEIGHT = 72;
    /** state name, e.g. "MAIN MENU" (the Flash version made it upper case as you typed) */
    stateName;
    /** Flash frame label to go to when this state is entered, e.g. "mainMenu" (may be empty) */
    frameName;
    /**
     * NEW (version 2): the id of the HTML element (a "screen") to show when this state is entered, e.g.
     * "export-screen" - what frameName was in Flash. (May be empty.)
     */
    screen;
    /** ENTRY behaviours: functions to call, in order, when this state is entered (Flash had one name) */
    enterActions;
    /** NEW: DO behaviours - functions to call, in order, every frame while the game is in this state */
    doActions;
    /** EXIT behaviours: functions to call, in order, when this state is exited */
    exitActions;
    /** NEW (version 2): constant values the view can read from the state, e.g. highlightHover = true */
    properties;
    constructor(instanceId, x, y) {
      this.instanceId = instanceId;
      this.x = x;
      this.y = y;
      this.frameName = "";
      this.screen = "";
      this.enterActions = [];
      this.doActions = [];
      this.exitActions = [];
      this.properties = [];
      this.boxWidth = _DiagramState.WIDTH;
      this.boxHeight = _DiagramState.HEIGHT;
      this.stateName = instanceId;
    }
    /**
     * NEW: show each state's behaviours (entry/, do/, exit/) inside its box, under its name? (The View
     * tools' "behaviours" button.) A state with behaviours showing is taller, so this is here, not in the
     * view: the arrows attach to, and the mouse finds, the box as it is drawn.
     */
    static showBehaviours = true;
    /** the behaviour text's line height (its characters are about 6.8 pixels wide) */
    static BEHAVIOUR_LINE_HEIGHT = 14;
    /** the state name's line height (its characters are about 10 pixels wide) */
    static NAME_LINE_HEIGHT = 17;
    /** NEW: the smallest a state can be resized to */
    static MIN_WIDTH = 80;
    static MIN_HEIGHT = 40;
    /** NEW: how near (diagram pixels) the mouse must be to the resize handle to grab it */
    static RESIZE_HANDLE_REACH = 9;
    boxWidth;
    boxHeight;
    get width() {
      return this.boxWidth;
    }
    /** The box's height - taller than it was resized to, if that's what it takes to show its behaviours. */
    get height() {
      const behaviours = this.shownBehaviours();
      if (behaviours.length === 0) return this.boxHeight;
      return Math.max(this.boxHeight, 10 + this.nameLines().length * _DiagramState.NAME_LINE_HEIGHT + 8 + behaviours.length * _DiagramState.BEHAVIOUR_LINE_HEIGHT + 8);
    }
    /** NEW: the size the user resized the box to (the height leaves out any extra room for behaviours) */
    get boxSize() {
      return {
        width: this.boxWidth,
        height: this.boxHeight
      };
    }
    /** NEW: has it been resized? (Only then is its size saved in the XML.) */
    get isResized() {
      return this.boxWidth !== _DiagramState.WIDTH || this.boxHeight !== _DiagramState.HEIGHT;
    }
    /** NEW: can the user resize it? Only a real state - the pseudostates are a fixed size. */
    get canResize() {
      return this.isRealState;
    }
    /** NEW: set the box's size (whole pixels, no smaller than MIN_WIDTH x MIN_HEIGHT), keeping its center */
    resizeTo(width, height) {
      if (!this.canResize) return;
      this.boxWidth = Math.max(_DiagramState.MIN_WIDTH, Math.round(width));
      this.boxHeight = Math.max(_DiagramState.MIN_HEIGHT, Math.round(height));
    }
    /** NEW: the resize handle - the bottom-right corner of the box */
    get resizeHandle() {
      return {
        x: this.x + this.width / 2,
        y: this.y + this.height / 2
      };
    }
    /** NEW: is p on the resize handle? */
    onResizeHandle(p) {
      if (!this.canResize) return false;
      const h = this.resizeHandle;
      return Math.abs(p.x - h.x) <= _DiagramState.RESIZE_HANDLE_REACH && Math.abs(p.y - h.y) <= _DiagramState.RESIZE_HANDLE_REACH;
    }
    /** NEW: drag the bottom-right corner to p - the top-left corner stays where it is */
    dragCornerTo(p) {
      const left = this.x - this.width / 2;
      const top = this.y - this.height / 2;
      this.resizeTo(p.x - left, p.y - top);
      this.x = left + this.width / 2;
      this.y = top + this.height / 2;
    }
    /** how many characters of the name fit across the box (12 at the usual width) */
    get nameLineLength() {
      return Math.max(4, Math.floor((this.width - 20) / 10));
    }
    /** how many characters of a behaviour fit across the box (18 at the usual width) */
    get behaviourLineLength() {
      return Math.max(6, Math.floor((this.width - 14) / 6.8));
    }
    /** the state name, split into lines that fit in the box (at most 3) */
    nameLines() {
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
    shownBehaviours() {
      if (!_DiagramState.showBehaviours || !this.isRealState) return [];
      const lines = [];
      for (const [label, actions2] of [
        [
          "entry",
          this.enterActions
        ],
        [
          "do",
          this.doActions
        ],
        [
          "exit",
          this.exitActions
        ]
      ]) {
        if (actions2.length > 0) {
          lines.push(...wrapText(`${label}/ ${actions2.join(", ")}`, this.behaviourLineLength, true));
        }
      }
      return lines;
    }
    /** how rounded the corners are (a UML state is a rounded box) */
    get cornerRadius() {
      return Math.min(_DiagramState.HEIGHT * 0.4, this.width / 2, this.height / 2);
    }
    /**
     * What sort of thing this is. NEW: as well as states, the diagram can have UML "pseudostates" - things
     * that are drawn and connected like states, but that the game never waits in:
     *   "choice"   a decision diamond (ChoicePoint.ts)
     *   "initial"  the filled dot the state machine starts from (Pseudostates.ts)
     *   "final"    the bullseye: the state machine has ended (Pseudostates.ts)
     *   "terminate" the X: the state machine's object is deleted (Pseudostates.ts)
     */
    get kind() {
      return "state";
    }
    /** true for a choice (decision) diamond - see ChoicePoint.ts */
    get isChoice() {
      return this.kind === "choice";
    }
    /** true for the initial (start) dot */
    get isInitial() {
      return this.kind === "initial";
    }
    /** true for a final (end) bullseye */
    get isFinal() {
      return this.kind === "final";
    }
    /** true for a terminate X (NEW) */
    get isTerminate() {
      return this.kind === "terminate";
    }
    /** true for the round pseudostates: the initial dot, the final bullseye and the terminate X */
    get isRound() {
      return this.isInitial || this.isFinal || this.isTerminate;
    }
    /** true for a real state - one the game can be in, written to game.xml as a <state> */
    get isRealState() {
      return this.kind === "state";
    }
    /**
     * The compass points a connector end can snap to (the red handles). Its CENTER is always allowed too:
     * drop an end inside the shape to attach it there.
     */
    get snapPoints() {
      return ALL_COMPASS_POINTS;
    }
    /** The XML id, e.g. "STATE_MAIN_MENU". */
    get xmlId() {
      return upperCaseUnderScored("STATE_" + this.stateName);
    }
    moveTo(p) {
      this.x = p.x;
      this.y = p.y;
    }
    /** true if the point is inside the box (the Flash version used movieClip.hitTest()) */
    contains(p) {
      return Math.abs(p.x - this.x) <= this.width / 2 && Math.abs(p.y - this.y) <= this.height / 2;
    }
    /**
     * Where one of the 8 compass points of the box is right now. The diagonal ones (NORTH_EAST, ...) are half
     * way round the rounded corners, so they sit on the outline instead of at the old square corners.
     */
    compassPoint(compass) {
      const w = this.width / 2;
      const h = this.height / 2;
      const r = this.cornerRadius;
      const diagonal = (sx, sy) => ({
        x: this.x + sx * (w - r + r * Math.SQRT1_2),
        y: this.y + sy * (h - r + r * Math.SQRT1_2)
      });
      switch (compass) {
        case Compass.NORTH:
          return {
            x: this.x,
            y: this.y - h
          };
        case Compass.SOUTH:
          return {
            x: this.x,
            y: this.y + h
          };
        case Compass.EAST:
          return {
            x: this.x + w,
            y: this.y
          };
        case Compass.WEST:
          return {
            x: this.x - w,
            y: this.y
          };
        case Compass.NORTH_EAST:
          return diagonal(1, -1);
        case Compass.NORTH_WEST:
          return diagonal(-1, -1);
        case Compass.SOUTH_EAST:
          return diagonal(1, 1);
        case Compass.SOUTH_WEST:
          return diagonal(-1, 1);
        case Compass.CENTER:
          return {
            x: this.x,
            y: this.y
          };
      }
    }
    /**
     * Where a line from the center of the box toward `target` crosses the box's outline
     * (the outline is a rounded rectangle, the same shape DiagramView draws).
     */
    outlinePointToward(target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return {
        x: this.x,
        y: this.y - this.height / 2
      };
      const ux = dx / length;
      const uy = dy / length;
      const w = this.width / 2;
      const h = this.height / 2;
      const r = this.cornerRadius;
      let t = Math.min(ux === 0 ? Infinity : w / Math.abs(ux), uy === 0 ? Infinity : h / Math.abs(uy));
      if (Math.abs(t * ux) > w - r && Math.abs(t * uy) > h - r) {
        const cx = Math.sign(ux) * (w - r);
        const cy = Math.sign(uy) * (h - r);
        const along = ux * cx + uy * cy;
        t = along + Math.sqrt(along * along - (cx * cx + cy * cy) + r * r);
      }
      return {
        x: this.x + t * ux,
        y: this.y + t * uy
      };
    }
  };
  function wrapText(text2, width, breakLongWords = false) {
    const lines = [];
    let line = "";
    const words = text2.split(" ").flatMap((word) => breakLongWords && word.length > width ? word.match(new RegExp(`.{1,${width}}`, "g")) ?? [
      word
    ] : [
      word
    ]);
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

  // src/model/ChoicePoint.ts
  var ChoicePoint = class _ChoicePoint extends DiagramState {
    static CHOICE_WIDTH = 96;
    static CHOICE_HEIGHT = 64;
    get width() {
      return _ChoicePoint.CHOICE_WIDTH;
    }
    get height() {
      return _ChoicePoint.CHOICE_HEIGHT;
    }
    get kind() {
      return "choice";
    }
    /** inside the diamond: |dx| / (w/2) + |dy| / (h/2) <= 1 */
    contains(p) {
      return Math.abs(p.x - this.x) / (this.width / 2) + Math.abs(p.y - this.y) / (this.height / 2) <= 1;
    }
    /** N/S/E/W are the diamond's 4 corners; the diagonals are half way along its 4 sides. */
    compassPoint(compass) {
      const w = this.width / 2;
      const h = this.height / 2;
      switch (compass) {
        case Compass.NORTH:
          return {
            x: this.x,
            y: this.y - h
          };
        case Compass.SOUTH:
          return {
            x: this.x,
            y: this.y + h
          };
        case Compass.EAST:
          return {
            x: this.x + w,
            y: this.y
          };
        case Compass.WEST:
          return {
            x: this.x - w,
            y: this.y
          };
        case Compass.NORTH_EAST:
          return {
            x: this.x + w / 2,
            y: this.y - h / 2
          };
        case Compass.NORTH_WEST:
          return {
            x: this.x - w / 2,
            y: this.y - h / 2
          };
        case Compass.SOUTH_EAST:
          return {
            x: this.x + w / 2,
            y: this.y + h / 2
          };
        case Compass.SOUTH_WEST:
          return {
            x: this.x - w / 2,
            y: this.y + h / 2
          };
        case Compass.CENTER:
          return {
            x: this.x,
            y: this.y
          };
      }
    }
    /** Where a line from the center toward `target` crosses the diamond's edge. */
    outlinePointToward(target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return this.compassPoint(Compass.NORTH);
      const ux = dx / length;
      const uy = dy / length;
      const t = 1 / (Math.abs(ux) / (this.width / 2) + Math.abs(uy) / (this.height / 2));
      return {
        x: this.x + t * ux,
        y: this.y + t * uy
      };
    }
  };

  // src/model/Pseudostates.ts
  var RoundPoint = class extends DiagramState {
    /** (width and height are set by each subclass: the circle's diameter) */
    get radius() {
      return this.width / 2;
    }
    /** inside the circle - or nearly: it's small, so it's given a few pixels more to make it easy to hit */
    contains(p) {
      return Math.hypot(p.x - this.x, p.y - this.y) <= this.radius + 10;
    }
    /** no edge points: an arrow always attaches to the CENTER, and is drawn from the edge facing the other end */
    get snapPoints() {
      return [];
    }
    /** the 8 compass points are spread evenly round the circle */
    compassPoint(compass) {
      if (compass === Compass.CENTER) return {
        x: this.x,
        y: this.y
      };
      const angles = {
        EAST: 0,
        SOUTH_EAST: 45,
        SOUTH: 90,
        SOUTH_WEST: 135,
        WEST: 180,
        NORTH_WEST: 225,
        NORTH: 270,
        NORTH_EAST: 315
      };
      const angle = angles[compass] * Math.PI / 180;
      return {
        x: this.x + Math.cos(angle) * this.radius,
        y: this.y + Math.sin(angle) * this.radius
      };
    }
    outlinePointToward(target) {
      const length = Math.hypot(target.x - this.x, target.y - this.y);
      if (length === 0) return this.compassPoint(Compass.NORTH);
      return {
        x: this.x + (target.x - this.x) / length * this.radius,
        y: this.y + (target.y - this.y) / length * this.radius
      };
    }
  };
  var InitialPoint = class extends RoundPoint {
    get width() {
      return 22;
    }
    get height() {
      return 22;
    }
    get kind() {
      return "initial";
    }
  };
  var FinalPoint = class extends RoundPoint {
    get width() {
      return 28;
    }
    get height() {
      return 28;
    }
    get kind() {
      return "final";
    }
  };
  var TerminatePoint = class extends RoundPoint {
    get width() {
      return 24;
    }
    get height() {
      return 24;
    }
    get kind() {
      return "terminate";
    }
  };

  // src/model/Diagram.ts
  var Diagram = class _Diagram {
    /** how close (pixels) the mouse must be to a connector end or center to pick it ("game.minDistance") */
    static PICK_DISTANCE = 20;
    /** how close (pixels) a connector end must be to a compass point to snap to it (10 in the Flash version) */
    static SNAP_DISTANCE = 20;
    /** how far apart (pixels) the curves of arrows between the same two states bend (son-of-fungus: 90) */
    static CURVE_STEP = 60;
    /** how far an arrow from a state back to itself bends out */
    static LOOP_BEND = 80;
    states = [];
    connectors = [];
    /**
     * NEW: the game.xml version. 2 if the file said <game version='2'> - or if the diagram uses anything only
     * version 2 has (screens, state properties, a mouse area): then the XML is written with <action call/>s.
     * 3 (TDDs/version03.md) if the file said <game version='3'>, or an event has no version 1/2 id.
     */
    version = 1;
    /**
     * NEW (version 2): the id of the HTML element mouse DOWN events count on, e.g. "diagram" (empty: the whole
     * page). Mouse moves and ups always count anywhere, so a drag that leaves the element carries on.
     */
    mouseArea = "";
    stateNum = 1;
    choiceNum = 1;
    initialNum = 1;
    finalNum = 1;
    terminateNum = 1;
    /** Add a new state, named "state1", "state2", ... - newStateButtonActions() in the Flash version. */
    addState(p) {
      const state = new DiagramState("state" + this.stateNum++, p.x, p.y);
      this.states.push(state);
      return state;
    }
    /** Add a new choice (decision) diamond, named "choice1", "choice2", ... (NEW) */
    addChoice(p) {
      const choice = new ChoicePoint("choice" + this.choiceNum++, p.x, p.y);
      this.states.push(choice);
      return choice;
    }
    /** Add a new initial (start) dot, named "initial1", ... (NEW) */
    addInitial(p) {
      const initial = new InitialPoint("initial" + this.initialNum++, p.x, p.y);
      this.states.push(initial);
      return initial;
    }
    /** Add a new final (end) bullseye, named "final1", ... (NEW) */
    addFinal(p) {
      const final = new FinalPoint("final" + this.finalNum++, p.x, p.y);
      this.states.push(final);
      return final;
    }
    /** Add a new terminate X, named "terminate1", ... (NEW) */
    addTerminate(p) {
      const terminate = new TerminatePoint("terminate" + this.terminateNum++, p.x, p.y);
      this.states.push(terminate);
      return terminate;
    }
    /** Add a new connector - newConnectorObject() in the Flash version. */
    addConnector(start, end) {
      const connector = new Connector(start, end);
      this.connectors.push(connector);
      return connector;
    }
    /** how far down and right a duplicate is put (NEW, Ctrl/Cmd-D) */
    static DUPLICATE_OFFSET = 30;
    /**
     * NEW: a copy of a state (or choice, initial dot or final bullseye), a little down and right of it, with
     * the same frame name, screen, behaviours and properties. A state you have named gets the next free
     * name - "NO COIN" -> "NO COIN 2" - since each state's XML id must be different. No arrows are copied.
     */
    duplicateState(original) {
      const p = {
        x: original.x + _Diagram.DUPLICATE_OFFSET,
        y: original.y + _Diagram.DUPLICATE_OFFSET
      };
      const copy = original.isChoice ? this.addChoice(p) : original.isInitial ? this.addInitial(p) : original.isFinal ? this.addFinal(p) : original.isTerminate ? this.addTerminate(p) : this.addState(p);
      if (original.stateName !== original.instanceId) copy.stateName = this.unusedName(original.stateName);
      copy.frameName = original.frameName;
      copy.screen = original.screen;
      copy.enterActions = [
        ...original.enterActions
      ];
      copy.doActions = [
        ...original.doActions
      ];
      copy.exitActions = [
        ...original.exitActions
      ];
      copy.properties = original.properties.map((property) => ({
        ...property
      }));
      copy.resizeTo(original.boxSize.width, original.boxSize.height);
      return copy;
    }
    /** "NO COIN" -> "NO COIN 2" (or 3, ...): the first name no state has. "NO COIN 2" -> "NO COIN 3". */
    unusedName(name) {
      const base = name.replace(/ \d+$/, "");
      const taken = (candidate) => this.states.some((s) => s.xmlId === upperCaseUnderScored("STATE_" + candidate));
      let n = 2;
      while (taken(`${base} ${n}`)) n++;
      return `${base} ${n}`;
    }
    /**
     * NEW: a copy of a connector, with the same event, guard and actions, attached to the same states at
     * the same points. (Two arrows between the same states curve apart - see updateBends() - so the copy can
     * be told from the original. An end that isn't attached is put a little down and right.)
     */
    duplicateConnector(original) {
      const offset = (end) => ({
        x: end.point.x + _Diagram.DUPLICATE_OFFSET,
        y: end.point.y + _Diagram.DUPLICATE_OFFSET
      });
      const copy = this.addConnector(offset(original.start), offset(original.end));
      for (const [from, to] of [
        [
          original.start,
          copy.start
        ],
        [
          original.end,
          copy.end
        ]
      ]) {
        if (from.state && from.compass !== null) to.snapTo(from.state, from.compass);
      }
      copy.eventGroup = original.eventGroup;
      Object.assign(copy.frameEvent, original.frameEvent);
      Object.assign(copy.timeEvent, original.timeEvent);
      Object.assign(copy.webEvent, original.webEvent);
      Object.assign(copy.customEvent, original.customEvent);
      copy.actions = [
        ...original.actions
      ];
      copy.guard = original.guard;
      return copy;
    }
    /**
     * Remove a state. Any connector ends snapped to it are left floating where they were
     * (the Flash version left them pointing at a missing state - the "anonymous STATE_" bug).
     */
    removeState(state) {
      for (const c of this.connectors) {
        if (c.start.state === state) c.start.unsnap();
        if (c.end.state === state) c.end.unsnap();
      }
      this.states.splice(this.states.indexOf(state), 1);
    }
    removeConnector(connector) {
      this.connectors.splice(this.connectors.indexOf(connector), 1);
    }
    /** The state under the mouse, or null - findNearestStateMovieClip(). (Later states are on top, so win.) */
    findStateAt(p) {
      let found = null;
      for (const state of this.states) {
        if (state.contains(p)) found = state;
      }
      return found;
    }
    /**
     * NEW: the connector whose label is under the mouse, or null. (Labels are drawn on top of everything,
     * later ones on top of earlier ones, so the last one found wins.)
     */
    findLabelAt(p) {
      let found = null;
      for (const connector of this.connectors) {
        const box = connector.labelBox;
        if (box && Math.abs(p.x - box.x) <= box.width / 2 && Math.abs(p.y - box.y) <= box.height / 2) {
          found = connector;
        }
      }
      return found;
    }
    /**
     * NEW (after son-of-fungus-JS): curve the arrows that would otherwise sit on top of each other.
     *   - one arrow between two states: straight
     *   - N arrows between the same two states (either way round): curves, CURVE_STEP apart, spread evenly
     *     either side of the straight line
     *   - an arrow from a state back to itself: a loop, bending away from the state
     * Called before drawing and picking, so it is always up to date however the arrows were changed.
     */
    updateBends() {
      const pairs = /* @__PURE__ */ new Map();
      for (const c of this.connectors) {
        c.bend = 0;
        const a = c.start.state;
        const b = c.end.state;
        if (!a || !b) continue;
        const [i, j] = [
          this.states.indexOf(a),
          this.states.indexOf(b)
        ].sort((x, y) => x - y);
        const key = `${i}-${j}`;
        pairs.set(key, [
          ...pairs.get(key) ?? [],
          c
        ]);
      }
      for (const group of pairs.values()) {
        const a = group[0].start.state;
        const b = group[0].end.state;
        if (a === b) {
          group.forEach((c, n) => this.bendLoop(c, _Diagram.LOOP_BEND + n * _Diagram.CURVE_STEP));
          continue;
        }
        if (group.length < 2) continue;
        const [first, second] = this.states.indexOf(a) < this.states.indexOf(b) ? [
          a,
          b
        ] : [
          b,
          a
        ];
        const side = rightAngle({
          x: second.x - first.x,
          y: second.y - first.y
        });
        group.forEach((c, n) => {
          c.bend = (n - (group.length - 1) / 2) * _Diagram.CURVE_STEP;
          c.bendSide = side;
        });
      }
    }
    /** a loop: bend at right angles to the line between the ends, away from the state's center */
    bendLoop(c, bend) {
      const p1 = c.start.aimPoint;
      const p2 = c.end.aimPoint;
      const state = c.start.state;
      let side = rightAngle({
        x: p2.x - p1.x,
        y: p2.y - p1.y
      });
      const out = {
        x: (p1.x + p2.x) / 2 - state.x,
        y: (p1.y + p2.y) / 2 - state.y
      };
      if (side.x * out.x + side.y * out.y < 0) side = {
        x: -side.x,
        y: -side.y
      };
      c.bend = bend;
      c.bendSide = side;
    }
    /** The connector whose start, end or center is near the mouse, or null - findNearestConnector(). */
    findConnectorNear(p) {
      this.updateBends();
      let found = null;
      for (const connector of this.connectors) {
        const near = (q) => distance(p, q) < _Diagram.PICK_DISTANCE;
        if (near(connector.center)) found = {
          connector,
          part: "center"
        };
        else if (near(connector.end.point)) found = {
          connector,
          part: "end"
        };
        else if (near(connector.start.point)) found = {
          connector,
          part: "start"
        };
      }
      return found;
    }
    /**
     * Put a connector end at the mouse position, then snap it (the big 8-way copy-and-paste loop in
     * CONNECTOR_DRAGonMouseMove()):
     *   - near one of a state's 8 compass points (within SNAP_DISTANCE)? snap to the closest one
     *   - otherwise, inside a state? snap to its CENTER (NEW)
     * (Inside a small round shape - the initial dot or final bullseye - always means its CENTER: every point
     * in it is that close to a compass point.)
     *   - otherwise leave the end floating at the mouse.
     * Returns true if it snapped.
     */
    dragEndTo(end, p) {
      end.floatAt(p);
      let closest = _Diagram.SNAP_DISTANCE;
      let snapped = false;
      for (const state of this.states) {
        for (const compass of state.snapPoints) {
          const d = distance(p, state.compassPoint(compass));
          if (d < closest) {
            closest = d;
            end.snapTo(state, compass);
            snapped = true;
          }
        }
      }
      if (snapped) return true;
      const inside = this.findStateAt(p);
      if (inside) {
        end.snapTo(inside, Compass.CENTER);
        return true;
      }
      return false;
    }
    /** Index number of a connector, used for its "e0", "e1" label and "stateTransition_0" instance ID. */
    indexOf(connector) {
      return this.connectors.indexOf(connector);
    }
    clear() {
      this.states.length = 0;
      this.connectors.length = 0;
      this.stateNum = 1;
      this.choiceNum = 1;
      this.initialNum = 1;
      this.finalNum = 1;
      this.terminateNum = 1;
      this.version = 1;
      this.mouseArea = "";
    }
    /**
     * The XML version this diagram is written as: 3 if it was read from a version 3 file, or any event can
     * only be written in version 3 (e.g. ended on a video); otherwise 2 or 1, as before - so an old example
     * that has only been moved about still saves in its old format.
     */
    get xmlVersion() {
      if (this.version === 3) return 3;
      const ownEvent = this.connectors.filter((c) => c.start.state?.isRealState);
      if (ownEvent.some((c) => c.event.legacyId(this.mouseArea) === null)) return 3;
      return this.isVersion2 ? 2 : 1;
    }
    /** true if this diagram is written as version 2 of the XML: it uses screens, state properties, DO behaviours, resized states or a mouse area */
    get isVersion2() {
      return this.version >= 2 || this.mouseArea !== "" || this.states.some((s) => s.screen !== "" || s.properties.length > 0 || s.doActions.length > 0 || s.isResized || s.isTerminate) || // (arrows from the initial dot or out of a choice don't write their own event, so don't count)
      this.connectors.some((c) => c.eventGroup === "completion" && !c.leavesInitial && !c.leavesChoice);
    }
  };
  function rightAngle(v) {
    const length = Math.hypot(v.x, v.y);
    return length === 0 ? {
      x: 0,
      y: -1
    } : {
      x: v.y / length,
      y: -v.x / length
    };
  }

  // src/editor/EditorState.ts
  var EditorState = class {
    editor;
    constructor(editor2) {
      this.editor = editor2;
    }
    // ----- entering and leaving the state (<enterStateActions> / <exitStateActions>) -----
    enter() {
    }
    exit() {
    }
    // ----- frame events -----
    /** EVENT_ON_LOAD: the application has just started */
    onLoad() {
    }
    /** EVENT_ON_ENTER_FRAME: called every animation frame (about 60 times a second) */
    onEnterFrame() {
    }
    // ----- mouse events (p is the mouse position on the diagram) -----
    onMouseMove(_p) {
    }
    onMouseDown(_p) {
    }
    onMouseUp(_p) {
    }
    // ----- toolbar buttons -----
    /** EVENT_BUTTON_ON_PRESS_selectButton */
    onSelectTool() {
    }
    /** EVENT_BUTTON_ON_PRESS_newStateButton (p = where the mouse is) */
    onNewStateTool(_p) {
    }
    /** EVENT_BUTTON_ON_PRESS_newChoiceButton (p = where the mouse is) - NEW: a choice (decision) diamond */
    onNewChoiceTool(_p) {
    }
    /** EVENT_BUTTON_ON_PRESS_newInitialButton - NEW: the initial (start) dot */
    onNewInitialTool(_p) {
    }
    /** EVENT_BUTTON_ON_PRESS_newFinalButton - NEW: a final (end) bullseye */
    onNewFinalTool(_p) {
    }
    /** newTerminateButton pressed - NEW: a terminate X (the object is deleted) */
    onNewTerminateTool(_p) {
    }
    /** EVENT_BUTTON_ON_PRESS_newConnectorButton (p = where the mouse is) */
    onNewConnectorTool(_p) {
    }
    /** EVENT_BUTTON_ON_RELEASE_tidyUpButton - NEW: lay the diagram out so arrows cross as little as possible */
    onTidyUp() {
    }
    /** EVENT_BUTTON_ON_RELEASE_exportXMLButton */
    onExportXml() {
    }
    /** EVENT_BUTTON_ON_RELEASE_importXMLButton (new - the Flash version had the button but no code for it) */
    onImportXml(_xml) {
    }
    /** EVENT_BUTTON_ON_RELEASE_backToDiagramButton */
    onBackToDiagram() {
    }
    // ----- keys -----
    /** EVENT_KEY_DOWN_222 in the Flash version (the # key) - here Delete or Backspace deletes the selected object */
    onDeleteKey() {
    }
    /** NEW: Ctrl-D (Cmd-D on a Mac) duplicates the selected object */
    onDuplicateKey() {
    }
    // ----- how to draw things in this state (drawStateObjects() and drawConnectors() in the Flash version,
    //       which asked "if( applicationBUILT_IN.state == STATE_SELECT ) ..." - now each state just answers) -----
    stateLook(state) {
      return state === this.editor.selectedState ? "selected" : "normal";
    }
    connectorLook(connector) {
      return {
        line: connector === this.editor.selectedConnector ? "selected" : "normal",
        handle: null
      };
    }
    /** false while the diagram is hidden (EXPORT XML) */
    showsDiagram() {
      return true;
    }
  };

  // src/model/Layout.ts
  var TIDY_SPACING = {
    x: 260,
    y: 170
  };
  var TIDY_ORIGIN = {
    x: 230,
    y: 110
  };
  var STUB_LENGTH = 110;
  var CROSSING = 1e3;
  var THROUGH_STATE = 1500;
  var PER_PIXEL = 0.5;
  var DIAGONAL = 30;
  var LABELS_OVERLAP = 300;
  var DIAGONAL_PAIR = 200;
  function tidyUp(diagram) {
    const nodes = diagram.states;
    if (nodes.length === 0) return;
    for (const c of diagram.connectors) {
      if (c.start.state && c.start.state === c.end.state) continue;
      if (c.start.state) c.start.snapTo(c.start.state, Compass.CENTER);
      if (c.end.state) c.end.snapTo(c.end.state, Compass.CENTER);
    }
    const edges = graphEdges(diagram);
    const columns = Math.ceil(Math.sqrt(nodes.length)) + 1;
    const rows = Math.ceil(nodes.length / (columns - 1)) + 1;
    const grid = new Grid(columns, rows, nodes.length, edges);
    let best = grid.fromPositions(nodes);
    let bestScore = grid.improve(best);
    const random = seededRandom(nodes.length * 7919 + edges.length);
    const tries = nodes.length > 12 ? 4 : 12;
    for (let i = 0; i < tries; i++) {
      const slots = grid.shuffled(random);
      const score = grid.improve(slots);
      if (score < bestScore) {
        best = slots;
        bestScore = score;
      }
    }
    const usedColumns = [
      ...new Set(best.map((s) => s % columns))
    ].sort((a, b) => a - b);
    const usedRows = [
      ...new Set(best.map((s) => Math.floor(s / columns)))
    ].sort((a, b) => a - b);
    nodes.forEach((node, i) => {
      node.x = TIDY_ORIGIN.x + usedColumns.indexOf(best[i] % columns) * TIDY_SPACING.x;
      node.y = TIDY_ORIGIN.y + usedRows.indexOf(Math.floor(best[i] / columns)) * TIDY_SPACING.y;
    });
    pullInInitialDots(diagram);
    separateParallelConnectors(diagram);
    placeStubs(diagram);
  }
  var INITIAL_ARROW_LENGTH = 50;
  function pullInInitialDots(diagram) {
    for (const c of diagram.connectors) {
      const dot = c.start.state;
      const first = c.end.state;
      if (!dot?.isInitial || !first || first === dot) continue;
      const length = Math.hypot(dot.x - first.x, dot.y - first.y);
      if (length === 0) continue;
      const edge = first.outlinePointToward(dot);
      const reach = Math.hypot(edge.x - first.x, edge.y - first.y) + INITIAL_ARROW_LENGTH + dot.width / 2;
      if (reach >= length) continue;
      dot.x = first.x + (dot.x - first.x) / length * reach;
      dot.y = first.y + (dot.y - first.y) / length * reach;
    }
  }
  function separateParallelConnectors(diagram) {
    const pairs = /* @__PURE__ */ new Map();
    for (const c of diagram.connectors) {
      const a = c.start.state;
      const b = c.end.state;
      if (!a || !b || a === b || c.start.compass !== Compass.CENTER || c.end.compass !== Compass.CENTER) continue;
      const key = [
        a.instanceId,
        b.instanceId
      ].sort().join("/");
      pairs.set(key, [
        ...pairs.get(key) ?? [],
        c
      ]);
    }
    for (const group of pairs.values()) {
      if (group.length < 2) continue;
      const a = group[0].start.state;
      const b = group[0].end.state;
      group.slice(0, 2).forEach((c, lane) => {
        const [pointA, pointB] = lanePoints(a, b, lane);
        if (c.start.state === a) {
          c.start.snapTo(a, pointA);
          c.end.snapTo(b, pointB);
        } else {
          c.start.snapTo(b, pointB);
          c.end.snapTo(a, pointA);
        }
      });
    }
  }
  function lanePoints(a, b, lane) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const east = dx > 0;
    const south = dy > 0;
    if (Math.abs(dy) < a.height / 2) {
      return lane === 0 ? [
        east ? Compass.NORTH_EAST : Compass.NORTH_WEST,
        east ? Compass.NORTH_WEST : Compass.NORTH_EAST
      ] : [
        east ? Compass.SOUTH_EAST : Compass.SOUTH_WEST,
        east ? Compass.SOUTH_WEST : Compass.SOUTH_EAST
      ];
    }
    if (Math.abs(dx) < a.width / 2) {
      return lane === 0 ? [
        south ? Compass.SOUTH_WEST : Compass.NORTH_WEST,
        south ? Compass.NORTH_WEST : Compass.SOUTH_WEST
      ] : [
        south ? Compass.SOUTH_EAST : Compass.NORTH_EAST,
        south ? Compass.NORTH_EAST : Compass.SOUTH_EAST
      ];
    }
    return lane === 0 ? [
      east ? Compass.EAST : Compass.WEST,
      south ? Compass.NORTH : Compass.SOUTH
    ] : [
      south ? Compass.SOUTH : Compass.NORTH,
      east ? Compass.WEST : Compass.EAST
    ];
  }
  function placeStubs(diagram) {
    const segments = [];
    for (const c of diagram.connectors) {
      if (c.start.state && c.end.state) segments.push([
        c.start.state,
        c.end.state
      ]);
    }
    for (const c of diagram.connectors) {
      const from = c.start.state;
      if (!from || c.end.state) continue;
      let bestEnd = null;
      let bestScore = Infinity;
      for (let i = 0; i < 8; i++) {
        const angle = -Math.PI / 4 + i * Math.PI / 4;
        const reach = STUB_LENGTH + Math.max(from.width, from.height) / 2;
        const end = {
          x: from.x + Math.cos(angle) * reach,
          y: from.y + Math.sin(angle) * reach
        };
        let score = i;
        for (const [p, q] of segments) {
          if (p !== from && q !== from && segmentsCross(from, end, p, q)) score += CROSSING;
        }
        for (const state of diagram.states) {
          if (state !== from && segmentHitsBox(from, end, state, 12)) score += THROUGH_STATE;
        }
        if (score < bestScore) {
          bestScore = score;
          bestEnd = end;
        }
      }
      c.start.snapTo(from, Compass.CENTER);
      c.end.floatAt(bestEnd);
    }
  }
  function graphEdges(diagram) {
    const index = new Map(diagram.states.map((s, i) => [
      s,
      i
    ]));
    const edges = /* @__PURE__ */ new Map();
    for (const c of diagram.connectors) {
      if (!c.start.state || !c.end.state || c.start.state === c.end.state) continue;
      const a = index.get(c.start.state);
      const b = index.get(c.end.state);
      const key = Math.min(a, b) + "/" + Math.max(a, b);
      const old = edges.get(key);
      if (old) old.multiple = true;
      else edges.set(key, {
        a,
        b,
        multiple: false
      });
    }
    return [
      ...edges.values()
    ];
  }
  var Grid = class {
    columns;
    rows;
    nodeCount;
    edges;
    constructor(columns, rows, nodeCount, edges) {
      this.columns = columns;
      this.rows = rows;
      this.nodeCount = nodeCount;
      this.edges = edges;
    }
    get size() {
      return this.columns * this.rows;
    }
    center(slot) {
      return {
        x: slot % this.columns * TIDY_SPACING.x,
        y: Math.floor(slot / this.columns) * TIDY_SPACING.y
      };
    }
    /** Each state in the free square nearest to where it is now (top-left states first). */
    fromPositions(nodes) {
      const minX = Math.min(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));
      const order = nodes.map((_, i) => i).sort((i, j) => nodes[i].y - nodes[j].y || nodes[i].x - nodes[j].x);
      const slots = new Array(nodes.length);
      const taken = /* @__PURE__ */ new Set();
      for (const i of order) {
        const here = {
          x: nodes[i].x - minX,
          y: nodes[i].y - minY
        };
        let best = -1;
        for (let s = 0; s < this.size; s++) {
          if (!taken.has(s) && (best < 0 || distance(this.center(s), here) < distance(this.center(best), here))) {
            best = s;
          }
        }
        slots[i] = best;
        taken.add(best);
      }
      return slots;
    }
    /** A random layout. */
    shuffled(random) {
      const all = [
        ...Array(this.size).keys()
      ];
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [all[i], all[j]] = [
          all[j],
          all[i]
        ];
      }
      return all.slice(0, this.nodeCount);
    }
    /** Improve a layout (in place) by moving one state at a time while that helps. Returns its final score. */
    improve(slots) {
      const owner = new Array(this.size).fill(-1);
      slots.forEach((s, i) => owner[s] = i);
      let score = this.score(slots);
      for (let pass = 0; pass < 30; pass++) {
        let improved = false;
        for (let i = 0; i < slots.length; i++) {
          for (let s = 0; s < this.size; s++) {
            const old = slots[i];
            if (s === old) continue;
            const other = owner[s];
            slots[i] = s;
            if (other >= 0) slots[other] = old;
            const newScore = this.score(slots);
            if (newScore < score - 1e-9) {
              score = newScore;
              owner[s] = i;
              owner[old] = other;
              improved = true;
            } else {
              slots[i] = old;
              if (other >= 0) slots[other] = s;
            }
          }
        }
        if (!improved) break;
      }
      return score;
    }
    /** How untidy a layout is (lower is better). */
    score(slots) {
      const points = slots.map((s) => this.center(s));
      const edges = this.edges;
      let score = 0;
      for (let e = 0; e < edges.length; e++) {
        const { a, b } = edges[e];
        const p = points[a];
        const q = points[b];
        score += distance(p, q) * PER_PIXEL;
        if (p.x !== q.x && p.y !== q.y) score += edges[e].multiple ? DIAGONAL_PAIR : DIAGONAL;
        for (let n = 0; n < points.length; n++) {
          if (n !== a && n !== b && segmentHitsBox(p, q, {
            x: points[n].x,
            y: points[n].y,
            width: 150,
            height: 90
          }, 0)) {
            score += THROUGH_STATE;
          }
        }
        for (let f = e + 1; f < edges.length; f++) {
          const other = edges[f];
          const r = points[other.a];
          const t = points[other.b];
          const m1 = {
            x: (p.x + q.x) / 2,
            y: (p.y + q.y) / 2
          };
          const m2 = {
            x: (r.x + t.x) / 2,
            y: (r.y + t.y) / 2
          };
          if (Math.abs(m1.x - m2.x) < 90 && Math.abs(m1.y - m2.y) < 24) score += LABELS_OVERLAP;
          if (other.a === a || other.a === b || other.b === a || other.b === b) continue;
          if (segmentsCross(p, q, r, t)) score += CROSSING;
        }
      }
      return score;
    }
  };
  function segmentsCross(p, q, r, t) {
    const d1 = cross(r, t, p);
    const d2 = cross(r, t, q);
    const d3 = cross(p, q, r);
    const d4 = cross(p, q, t);
    return (d1 > 0 && d2 < 0 || d1 < 0 && d2 > 0) && (d3 > 0 && d4 < 0 || d3 < 0 && d4 > 0);
  }
  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }
  function segmentHitsBox(p, q, box, margin) {
    const left = box.x - box.width / 2 - margin;
    const right = box.x + box.width / 2 + margin;
    const top = box.y - box.height / 2 - margin;
    const bottom = box.y + box.height / 2 + margin;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    let t0 = 0;
    let t1 = 1;
    const checks = [
      [
        -dx,
        p.x - left
      ],
      [
        dx,
        right - p.x
      ],
      [
        -dy,
        p.y - top
      ],
      [
        dy,
        bottom - p.y
      ]
    ];
    for (const [pk, qk] of checks) {
      if (pk === 0) {
        if (qk < 0) return false;
      } else {
        const t = qk / pk;
        if (pk < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
        if (t0 > t1) return false;
      }
    }
    return true;
  }
  function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // src/io/XmlImporter.ts
  var GRID_ORIGIN = {
    x: 220,
    y: 130
  };
  var GRID_SPACING = {
    x: 330,
    y: 230
  };
  function importXml(xml, diagram) {
    const warnings = [];
    const parsed = parseStates(xml, warnings);
    if (parsed.length === 0) throw new Error("No <state> elements found - is this a stateGEN game.xml file?");
    const hasLayout = parsed.every((p) => p.position !== null);
    diagram.clear();
    const game = xml.replace(/<!--[\s\S]*?-->/g, "");
    const version = attribute(game.match(/<game\b([^>]*)>/)?.[1] ?? "", "version");
    if (version === "2") diagram.version = 2;
    if (version === "3") diagram.version = 3;
    diagram.mouseArea = attribute(game.match(/<mouseArea\b([^>]*?)\/?>/)?.[1] ?? "", "id") ?? "";
    const columns = Math.ceil(Math.sqrt(parsed.length));
    const byId2 = /* @__PURE__ */ new Map();
    parsed.forEach((p, i) => {
      const state = diagram.addState(hasLayout ? p.position : {
        x: GRID_ORIGIN.x + i % columns * GRID_SPACING.x,
        y: GRID_ORIGIN.y + Math.floor(i / columns) * GRID_SPACING.y
      });
      state.stateName = p.id.replace(/^STATE_/, "").replaceAll("_", " ");
      state.frameName = p.frameName;
      state.screen = p.screen;
      state.properties = p.properties;
      state.enterActions = actionList(p.enter, `${p.id} <enterStateActions>`, warnings);
      state.doActions = actionList(p.do, `${p.id} <doStateActions>`, warnings);
      state.exitActions = actionList(p.exit, `${p.id} <exitStateActions>`, warnings);
      if (p.size) state.resizeTo(p.size.x, p.size.y);
      byId2.set(p.id, state);
    });
    const finals = /* @__PURE__ */ new Map();
    const finalFor = (at, near) => {
      const key = at ? `${at.x},${at.y}` : "";
      let final = finals.get(key);
      if (!final) {
        final = diagram.addFinal(at ?? {
          x: near.x + GRID_SPACING.x / 2,
          y: near.y
        });
        finals.set(key, final);
      }
      return final;
    };
    const terminates = /* @__PURE__ */ new Map();
    const terminateFor = (at, near) => {
      const key = at ? `${at.x},${at.y}` : "";
      let x = terminates.get(key);
      if (!x) {
        x = diagram.addTerminate(at ?? {
          x: near.x + GRID_SPACING.x / 2,
          y: near.y + GRID_SPACING.y / 2
        });
        terminates.set(key, x);
      }
      return x;
    };
    const choices = /* @__PURE__ */ new Map();
    const choiceFor = (at, otherwise) => {
      const key = at ? `${at.x},${at.y}` : null;
      const found = key ? choices.get(key) : void 0;
      if (found) return found;
      const made = {
        choice: diagram.addChoice(at ?? otherwise),
        outs: /* @__PURE__ */ new Set()
      };
      if (key) choices.set(key, made);
      return made;
    };
    const choiceOut = (c, e, to, actions2) => {
      const key = `${e.newState ?? ""}|${e.final}|${e.terminate}|${e.guard}`;
      if (c.outs.has(key)) return;
      c.outs.add(key);
      const out = connect(diagram, c.choice, e.layout.choiceOutPoint, to, e.layout.toPoint, e.layout.to);
      out.guard = e.guard;
      out.actions = actions2;
    };
    const targetOf = (p, e) => {
      if (e.final) return finalFor(e.layout.final, byId2.get(p.id));
      if (e.terminate) return terminateFor(e.layout.terminate, byId2.get(p.id));
      const to = e.newState ? byId2.get(e.newState) ?? null : null;
      if (e.newState && !to) {
        warnings.push(`${p.id}: ${eventName(e)} goes to unknown state ${e.newState}`);
      }
      return to;
    };
    for (const p of parsed) {
      const from = byId2.get(p.id);
      let choiceCount = 0;
      for (const group of groupById(p.events).values()) {
        if (group.length > 1 && group.some((e) => e.guard)) {
          const layout2 = group[0].layout;
          const c = choiceFor(layout2.choice, {
            x: from.x + GRID_SPACING.x / 2,
            y: from.y + GRID_SPACING.y / 2 + choiceCount++ * 80
          });
          const into = connect(diagram, from, layout2.fromPoint, c.choice, layout2.choiceInPoint, null);
          setEvent(into, group[0], diagram.mouseArea, warnings);
          const lists = group.map((e) => actionList(e.body, `${p.id} ${eventName(e)}`, warnings));
          const shared = lists.every((l) => l.join("\n") === lists[0].join("\n"));
          if (shared) into.actions = lists[0];
          group.forEach((e, i) => choiceOut(c, e, targetOf(p, e), shared ? [] : lists[i]));
        } else {
          for (const e of group) {
            const connector = connect(diagram, from, e.layout.fromPoint, targetOf(p, e), e.layout.toPoint, e.layout.to);
            setEvent(connector, e, diagram.mouseArea, warnings);
            connector.actions = actionList(e.body, `${p.id} ${eventName(e)}`, warnings);
            connector.guard = e.guard;
          }
        }
      }
    }
    const initial = parseInitial(xml);
    if (initial && initial.events.length > 0) {
      const at = initial.position ?? GRID_ORIGIN;
      const dot = diagram.addInitial(at);
      const c = choiceFor(initial.choice, {
        x: at.x + 130,
        y: at.y
      });
      connect(diagram, dot, initial.fromPoint, c.choice, initial.choiceInPoint, null);
      for (const e of initial.events) {
        let to = null;
        if (e.final) to = finalFor(e.layout.final, c.choice);
        else if (e.terminate) to = terminateFor(e.layout.terminate, c.choice);
        else if (e.newState) {
          to = byId2.get(e.newState) ?? null;
          if (!to) warnings.push(`<initialState> goes to unknown state ${e.newState}`);
        }
        choiceOut(c, e, to, actionList(e.body, "<initialState>", warnings));
      }
    } else if (initial) {
      const first = initial.newState ? byId2.get(initial.newState) ?? null : null;
      if (initial.newState && !first) warnings.push(`<initialState> goes to unknown state ${initial.newState}`);
      const at = initial.position ?? (first ? {
        x: first.x - 130,
        y: first.y
      } : GRID_ORIGIN);
      const dot = diagram.addInitial(at);
      if (first) connect(diagram, dot, initial.fromPoint, first, initial.toPoint, null);
    }
    if (!hasLayout) tidyUp(diagram);
    return [
      ...new Set(warnings)
    ];
  }
  function groupById(events) {
    const groups = /* @__PURE__ */ new Map();
    for (const e of events) groups.set(e.id, [
      ...groups.get(e.id) ?? [],
      e
    ]);
    return groups;
  }
  function connect(diagram, from, fromPoint, to, toPoint, toAt) {
    const connector = diagram.addConnector({
      x: 0,
      y: 0
    }, {
      x: 0,
      y: 0
    });
    if (to === from && fromPoint === Compass.CENTER && toPoint === Compass.CENTER) {
      connector.start.snapTo(from, Compass.NORTH_EAST);
      connector.end.snapTo(from, Compass.SOUTH_EAST);
      return connector;
    }
    connector.start.snapTo(from, fromPoint);
    if (to) connector.end.snapTo(to, toPoint);
    else connector.end.floatAt(toAt ?? {
      x: from.x + from.width / 2 + 80,
      y: from.y - 30
    });
    return connector;
  }
  function eventName(e) {
    return e.id || "completion transition";
  }
  function setEvent(connector, e, mouseArea, warnings) {
    const a = e.attributes;
    if (a.on !== void 0 || a.after !== void 0 || a.custom !== void 0) {
      setVersion3Event(connector, a, warnings);
    } else {
      setLegacyEvent(connector, e.id, mouseArea, warnings);
    }
  }
  function setVersion3Event(connector, a, warnings) {
    if (a.after !== void 0) {
      const ms = Number(a.after);
      connector.eventGroup = "time";
      if (Number.isFinite(ms) && ms >= 0) connector.timeEvent.ms = Math.round(ms);
      else warnings.push(`after='${a.after}' is not a number of milliseconds - 1000 used`);
    } else if (a.custom !== void 0) {
      connector.eventGroup = "custom";
      connector.customEvent.eventName = a.custom;
    } else if (a.on === "animationframe") {
      connector.eventGroup = "frame";
      connector.frameEvent.onEnterFrame = true;
    } else {
      connector.eventGroup = "web";
      const w = connector.webEvent;
      w.on = a.on.trim();
      w.target = a.target?.trim() || "document";
      w.key = a.key ?? "";
      w.mod = normalizeMod(a.mod ?? "");
      w.keyCode = a.keyCode ?? null;
    }
  }
  function setLegacyEvent(connector, id, mouseArea, warnings) {
    let m;
    const web = webEventFor(id, mouseArea);
    if (id === "") {
      connector.eventGroup = "completion";
    } else if (m = id.match(/^EVENT_AFTER_(\d+)$/)) {
      connector.eventGroup = "time";
      connector.timeEvent.ms = Number(m[1]);
    } else if (id === "EVENT_ON_ENTER_FRAME" || id === "EVENT_ON_LOAD") {
      connector.eventGroup = "frame";
      connector.frameEvent.onEnterFrame = id === "EVENT_ON_ENTER_FRAME";
    } else if (web) {
      connector.eventGroup = "web";
      Object.assign(connector.webEvent, web);
    } else if (m = id.match(/^EVENT_USER_DEFINED_(.+)$/)) {
      connector.eventGroup = "custom";
      connector.customEvent.eventName = m[1];
    } else {
      connector.eventGroup = "custom";
      connector.customEvent.eventName = id.replace(/^EVENT_/, "");
      warnings.push(`${id} is not a stateGEN event type - imported as a custom event`);
    }
  }
  function actionList(body, where, warnings) {
    const calls = [
      ...body.matchAll(/<action\b([^>]*?)\/?>/g)
    ].map((m) => attribute(m[1], "call") ?? "");
    const code = body.replace(/<action\b[^>]*?\/?>(\s*<\/action>)?/g, "").replace(/\/\/.*$/gm, "").trim();
    if (code === "") return calls.filter((c) => c !== "");
    const call = /^([A-Za-z_$][\w$]*)\s*\(\s*(p?)\s*\)\s*;?/;
    const names = [];
    for (let rest = code; rest !== ""; rest = rest.trim()) {
      const m = rest.match(call);
      if (!m) {
        warnings.push(`${where}: action code is not just function calls - left out`);
        return calls.filter((c) => c !== "");
      }
      names.push(m[2] ? `${m[1]}(p)` : m[1]);
      rest = rest.slice(m[0].length);
    }
    return [
      ...calls.filter((c) => c !== ""),
      ...names
    ];
  }
  var PROPERTY_TYPES = [
    "boolean",
    "number",
    "string"
  ];
  function parseProperties(inner, where, warnings) {
    const properties = [];
    for (const m of inner.matchAll(/<property\b([^>]*?)\/?>/g)) {
      const name = attribute(m[1], "name") ?? "";
      const type = attribute(m[1], "type") ?? "string";
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
        warnings.push(`${where}: <property name='${name}'> is not a valid name - left out`);
        continue;
      }
      if (!PROPERTY_TYPES.includes(type)) {
        warnings.push(`${where}: property ${name} has type '${type}' - must be boolean, number or string`);
      }
      properties.push({
        name,
        type: PROPERTY_TYPES.includes(type) ? type : "string",
        value: unescapeXml(attribute(m[1], "value") ?? "")
      });
    }
    return properties;
  }
  function attribute(tag, name) {
    const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`));
    return m ? m[2] : null;
  }
  function parseInitial(xml) {
    const m = xml.replace(/<!--[\s\S]*?-->/g, "").match(/<initialState\b([^>]*?)(\/>|>([\s\S]*?)<\/initialState>)/);
    if (!m) return null;
    return {
      newState: attribute(m[1], "newState"),
      position: pointAttributes(m[1], "x", "y"),
      fromPoint: compassAttribute(m[1], "fromPoint"),
      toPoint: compassAttribute(m[1], "toPoint"),
      choice: pointAttributes(m[1], "choiceX", "choiceY"),
      choiceInPoint: compassAttribute(m[1], "choiceInPoint"),
      events: parseEvents(m[3] ?? "")
    };
  }
  function compassAttribute(tag, name) {
    const value = attribute(tag, name);
    return ALL_COMPASS_POINTS.find((c) => c === value) ?? Compass.CENTER;
  }
  function pointAttributes(tag, xName, yName) {
    const x = Number(attribute(tag, xName) ?? NaN);
    const y = Number(attribute(tag, yName) ?? NaN);
    return Number.isFinite(x) && Number.isFinite(y) ? {
      x,
      y
    } : null;
  }
  function unescapeXml(text2) {
    return text2.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&apos;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
  }
  function parseStates(xml, warnings) {
    const text2 = xml.replace(/<!--[\s\S]*?-->/g, "");
    const states = [];
    for (const m of text2.matchAll(/<state\b([^>]*?)(\/>|>([\s\S]*?)<\/state>)/g)) {
      const inner = m[3] ?? "";
      const events = parseEvents(inner);
      const id = attribute(m[1], "id") ?? "STATE_";
      states.push({
        id,
        frameName: attribute(m[1], "frameName") ?? "",
        screen: attribute(m[1], "screen") ?? "",
        // (the events can't have properties, so take them out first)
        properties: parseProperties(inner.replace(/<event\b[^>]*?(\/>|>[\s\S]*?<\/event>)/g, ""), id, warnings),
        enter: inner.match(/<enterStateActions>([\s\S]*?)<\/enterStateActions>/)?.[1] ?? "",
        do: inner.match(/<doStateActions>([\s\S]*?)<\/doStateActions>/)?.[1] ?? "",
        exit: inner.match(/<exitStateActions>([\s\S]*?)<\/exitStateActions>/)?.[1] ?? "",
        events,
        position: pointAttributes(m[1], "x", "y"),
        size: pointAttributes(m[1], "width", "height")
      });
    }
    return states;
  }
  function parseEvents(inner) {
    const events = [];
    for (const e of inner.matchAll(/<event\b([^>]*?)(\/>|>([\s\S]*?)<\/event>)/g)) {
      const attributes = {};
      for (const name of [
        "on",
        "target",
        "key",
        "mod",
        "keyCode",
        "after",
        "custom"
      ]) {
        const value = attribute(e[1], name);
        if (value !== null) attributes[name] = unescapeXml(value);
      }
      events.push({
        id: attribute(e[1], "id") ?? Object.entries(attributes).map(([n, v]) => `${n}=${v}`).join(" "),
        attributes,
        newState: attribute(e[1], "newState"),
        guard: unescapeXml(attribute(e[1], "guard") ?? ""),
        body: e[3] ?? "",
        final: attribute(e[1], "final") === "true",
        terminate: attribute(e[1], "terminate") === "true",
        layout: {
          fromPoint: compassAttribute(e[1], "fromPoint"),
          toPoint: compassAttribute(e[1], "toPoint"),
          to: pointAttributes(e[1], "toX", "toY"),
          choice: pointAttributes(e[1], "choiceX", "choiceY"),
          choiceInPoint: compassAttribute(e[1], "choiceInPoint"),
          choiceOutPoint: compassAttribute(e[1], "choiceOutPoint"),
          final: pointAttributes(e[1], "finalX", "finalY"),
          terminate: pointAttributes(e[1], "terminateX", "terminateY")
        }
      });
    }
    return events;
  }

  // src/editor/importReport.ts
  function importAndReport(xml, diagram) {
    try {
      const warnings = importXml(xml, diagram);
      const states = diagram.states;
      const count = (what, n) => n > 0 ? [
        `${n} ${what}`
      ] : [];
      const parts = [
        ...count("state(s)", states.filter((s) => s.isRealState).length),
        ...count("choice(s)", states.filter((s) => s.isChoice).length),
        ...count("initial state", states.filter((s) => s.isInitial).length),
        ...count("final state(s)", states.filter((s) => s.isFinal).length),
        ...count("terminate state(s)", states.filter((s) => s.isTerminate).length)
      ];
      return {
        imported: true,
        message: `Imported ${parts.join(", ")} and ${diagram.connectors.length} transition(s).` + (warnings.length ? "\n\nNot everything could be imported:\n- " + warnings.join("\n- ") : "")
      };
    } catch (error) {
      return {
        imported: false,
        message: `Could not import: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  // src/editor/states/StateDragState.ts
  var StateDragState = class extends EditorState {
    dragged;
    grabOffset;
    name;
    constructor(editor2, dragged, grabOffset) {
      super(editor2), this.dragged = dragged, this.grabOffset = grabOffset, this.name = "STATE_STATE_DRAG";
    }
    onEnterFrame() {
      this.editor.view.drawScene();
    }
    onMouseMove(p) {
      this.dragged.moveTo({
        x: p.x - this.grabOffset.x,
        y: p.y - this.grabOffset.y
      });
    }
    onMouseUp(p) {
      this.onMouseMove(p);
      this.editor.findHover(p);
      this.editor.changeState(new SelectState(this.editor));
    }
    onSelectTool() {
      this.editor.changeState(new SelectState(this.editor));
    }
    onNewConnectorTool(p) {
      const connector = this.editor.createConnector(p);
      this.editor.changeState(new ConnectorDragState(this.editor, connector, "start"));
    }
  };

  // src/editor/states/ConnectorDragState.ts
  var ConnectorDragState = class extends EditorState {
    connector;
    whichEnd;
    name;
    constructor(editor2, connector, whichEnd) {
      super(editor2), this.connector = connector, this.whichEnd = whichEnd, this.name = "STATE_CONNECTOR_DRAG";
    }
    get draggedEnd() {
      return this.whichEnd === "start" ? this.connector.start : this.connector.end;
    }
    onEnterFrame() {
      this.editor.view.drawScene();
    }
    onMouseMove(p) {
      this.editor.diagram.dragEndTo(this.draggedEnd, p);
    }
    onMouseUp(_p) {
      this.editor.changeState(new SelectState(this.editor));
    }
    onSelectTool() {
      this.editor.changeState(new SelectState(this.editor));
    }
    onNewStateTool(p) {
      const state = this.editor.createState(p);
      this.editor.changeState(new StateDragState(this.editor, state, {
        x: 0,
        y: 0
      }));
    }
    onNewChoiceTool(p) {
      const choice = this.editor.createShape("choice", p);
      this.editor.changeState(new StateDragState(this.editor, choice, {
        x: 0,
        y: 0
      }));
    }
    onNewInitialTool(p) {
      const initial = this.editor.createShape("initial", p);
      this.editor.changeState(new StateDragState(this.editor, initial, {
        x: 0,
        y: 0
      }));
    }
    onNewFinalTool(p) {
      const final = this.editor.createShape("final", p);
      this.editor.changeState(new StateDragState(this.editor, final, {
        x: 0,
        y: 0
      }));
    }
    onNewTerminateTool(p) {
      const terminate = this.editor.createShape("terminate", p);
      this.editor.changeState(new StateDragState(this.editor, terminate, {
        x: 0,
        y: 0
      }));
    }
    // show the compass points of the state the dragged end has snapped to - setStateDragHandles()
    stateLook(state) {
      if (state === this.draggedEnd.state) return "snap";
      return super.stateLook(state);
    }
    connectorLook(connector) {
      if (connector === this.connector) return {
        line: "moving",
        handle: null
      };
      return super.connectorLook(connector);
    }
  };

  // src/editor/states/ConnectorMoveState.ts
  var ConnectorMoveState = class extends EditorState {
    connector;
    grabOffset;
    name;
    constructor(editor2, connector, grabOffset = {
      x: 0,
      y: 0
    }) {
      super(editor2), this.connector = connector, this.grabOffset = grabOffset, this.name = "STATE_CONNECTOR_MOVE";
    }
    onEnterFrame() {
      this.editor.view.drawScene();
    }
    onMouseMove(p) {
      this.connector.moveCenterTo({
        x: p.x + this.grabOffset.x,
        y: p.y + this.grabOffset.y
      });
    }
    onMouseUp(_p) {
      this.editor.changeState(new SelectState(this.editor));
    }
    connectorLook(connector) {
      if (connector === this.connector) return {
        line: "moving",
        handle: null
      };
      return super.connectorLook(connector);
    }
  };

  // src/model/Actions.ts
  function takesPoint(call) {
    return /\(\s*p\s*\)$/.test(call.trim());
  }
  function parseActions(text2) {
    return text2.split(",").map((a) => a.trim()).filter((a) => a.length > 0);
  }
  function actionsText(actions2) {
    return actions2.join(", ");
  }
  function propertiesText(properties) {
    return properties.map((p) => `${p.name} = ${p.type === "string" ? JSON.stringify(p.value) : p.value}`).join(", ");
  }
  function parseProperties2(text2) {
    const properties = [];
    for (const m of text2.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*("(?:[^"\\]|\\.)*"?|[^,]*)/g)) {
      const raw = m[2].trim();
      if (raw === "true" || raw === "false") {
        properties.push({
          name: m[1],
          type: "boolean",
          value: raw
        });
      } else if (raw !== "" && Number.isFinite(Number(raw))) {
        properties.push({
          name: m[1],
          type: "number",
          value: String(Number(raw))
        });
      } else if (raw.startsWith('"')) {
        let value = raw.slice(1, raw.endsWith('"') && raw.length > 1 ? -1 : void 0);
        try {
          value = JSON.parse(`"${value}"`);
        } catch {
        }
        properties.push({
          name: m[1],
          type: "string",
          value
        });
      } else {
        properties.push({
          name: m[1],
          type: "string",
          value: raw
        });
      }
    }
    return properties;
  }

  // src/model/Transitions.ts
  function resolveTransitions(diagram) {
    const transitions = [];
    for (const c of diagram.connectors) {
      const from = c.start.state;
      if (!from || !from.isRealState) continue;
      const start = {
        from,
        event: c.event,
        guards: [],
        to: null,
        final: false,
        terminate: false,
        actions: [],
        path: []
      };
      follow(diagram, c, start, /* @__PURE__ */ new Set(), transitions);
    }
    return transitions;
  }
  function follow(diagram, c, sofar, visited, out) {
    const t = {
      ...sofar,
      guards: c.guard.trim() ? [
        ...sofar.guards,
        c.guard.trim()
      ] : sofar.guards,
      actions: [
        ...sofar.actions,
        ...c.actions
      ],
      path: [
        ...sofar.path,
        c
      ]
    };
    const target = c.end.state;
    if (!target || !target.isChoice || visited.has(target)) {
      out.push({
        ...t,
        to: target?.isRealState ? target : null,
        final: target?.isFinal ?? false,
        terminate: target?.isTerminate ?? false
      });
      return;
    }
    const outs = diagram.connectors.filter((o) => o.start.state === target);
    if (outs.length === 0) {
      out.push({
        ...t,
        to: null
      });
      return;
    }
    const seen = new Set(visited).add(target);
    for (const o of outs) follow(diagram, o, t, seen, out);
  }
  function initialTransitions(diagram) {
    const dot = diagram.states.find((s) => s.isInitial);
    const c = dot ? diagram.connectors.find((o) => o.start.state === dot) : void 0;
    if (!dot || !c) return [];
    const out = [];
    const start = {
      from: dot,
      event: c.event,
      guards: [],
      to: null,
      final: false,
      terminate: false,
      actions: [],
      path: []
    };
    follow(diagram, c, start, /* @__PURE__ */ new Set(), out);
    return out;
  }
  function isElse(guards) {
    return guards.some((g) => g.toLowerCase() === "else");
  }
  function guardCondition(guards) {
    return guards.filter((g) => g.toLowerCase() !== "else").join(" && ");
  }

  // src/io/XmlExporter.ts
  var NL = "\n";
  var TAB = "	";
  function generateXml(diagram) {
    const transitions = resolveTransitions(diagram);
    const version = diagram.xmlVersion;
    const w = {
      version,
      mouseArea: diagram.mouseArea
    };
    let s = "<?xml version='1.0'?>" + NL + (version === 1 ? "<game>" : `<game version='${version}'>`);
    if (version < 3) {
      const declarations = {
        buttons: /* @__PURE__ */ new Set(),
        keyCodes: /* @__PURE__ */ new Set(),
        userDefinedEvents: /* @__PURE__ */ new Set()
      };
      for (const t of transitions) t.event.declare(declarations, diagram.mouseArea);
      s += list(NL + "<!-- ****************************** BUTTON INSTANCE NAMES  ******************** -->", "buttonInstanceList", [
        ...declarations.buttons
      ].map((name) => `<button id='${name}'/>`));
      s += list(NL + NL + "<!-- *************************** KEYS for key UP/DOWN events  ***************** -->", "keyEventList", [
        ...declarations.keyCodes
      ].map((code) => `<keyEvent keyCode='${code}'/>`));
      s += list(NL + NL + "<!-- ****************************** USER DEFINED EVENTS  ******************** -->", "userDefinedEventList", [
        ...declarations.userDefinedEvents
      ].map((id) => `<event id='${id}'/>`));
      if (diagram.mouseArea) {
        s += NL + NL + "<!-- ****************************** WHERE MOUSE DOWN COUNTS  ******************** -->" + NL + `<mouseArea id='${escapeAttribute(diagram.mouseArea)}'/>`;
      }
    }
    s += initialElement(diagram, w);
    s += NL + NL + "<!-- ****************************** STATE ELEMENTS  ******************** -->";
    for (const state of diagram.states) {
      if (state.isRealState) s += stateElement(state, transitions.filter((t) => t.from === state), w);
    }
    s += NL + "</game>";
    return s;
  }
  function initialElement(diagram, w) {
    const dot = diagram.states.find((s) => s.isInitial);
    if (!dot) return "";
    const comment = NL + NL + "<!-- ****************************** INITIAL STATE  ******************** -->" + NL;
    const arrow = diagram.connectors.find((c) => c.start.state === dot && c.end.state?.isRealState);
    const toChoice = diagram.connectors.find((c) => c.start.state === dot && c.end.state?.isChoice);
    const attributes = [];
    if (arrow) attributes.push([
      "newState",
      arrow.end.state.xmlId
    ]);
    attributes.push([
      "x",
      Math.round(dot.x)
    ], [
      "y",
      Math.round(dot.y)
    ]);
    if (arrow) {
      attributes.push([
        "fromPoint",
        edgePoint(arrow.start)
      ], [
        "toPoint",
        edgePoint(arrow.end)
      ]);
    } else if (toChoice) {
      const choice = toChoice.end.state;
      attributes.push([
        "fromPoint",
        edgePoint(toChoice.start)
      ], [
        "choiceX",
        Math.round(choice.x)
      ], [
        "choiceY",
        Math.round(choice.y)
      ], [
        "choiceInPoint",
        edgePoint(toChoice.end)
      ]);
      const events = initialTransitions(diagram).map((t) => initialEventElement(t, w));
      return comment + `<initialState${attributeText(attributes)}>` + events.join("") + NL + "</initialState>";
    }
    return comment + `<initialState${attributeText(attributes)}/>`;
  }
  function initialEventElement(t, w) {
    const condition = isElse(t.guards) ? "else" : guardCondition(t.guards);
    const attributes = [
      [
        "newState",
        t.to ? t.to.xmlId : null
      ],
      [
        "final",
        t.final ? "true" : null
      ],
      [
        "terminate",
        !t.final && t.terminate ? "true" : null
      ],
      [
        "guard",
        condition ? escapeAttribute(condition) : null
      ]
    ];
    if (t.path.length > 1) attributes.push([
      "choiceOutPoint",
      edgePoint(t.path[1].start)
    ]);
    attributes.push(...endLayout(t.path[t.path.length - 1]));
    let s = NL + TAB + `<event${attributeText(attributes)}`;
    if (t.actions.length > 0) {
      s += ">";
      for (const action of t.actions) s += NL + TAB + TAB + actionText(action, w.version >= 2);
      s += NL + TAB + "</event>";
    } else {
      s += "/>";
    }
    return s;
  }
  function list(comment, tag, items) {
    if (items.length === 0) return "";
    return comment + NL + `<${tag}>` + items.map((item) => NL + TAB + item).join("") + NL + `</${tag}>`;
  }
  function stateElement(state, transitions, w) {
    const v2 = w.version >= 2;
    const frameName = state.frameName.length > 0 ? ` frameName='${state.frameName}'` : "";
    const screen = state.screen.length > 0 ? ` screen='${escapeAttribute(state.screen)}'` : "";
    const size = state.isResized ? ` width='${state.boxSize.width}' height='${state.boxSize.height}'` : "";
    let s = NL + "<!-- ****************************** STATE ******************** -->";
    s += NL + `<state id='${state.xmlId}'${frameName}${screen} x='${Math.round(state.x)}' y='${Math.round(state.y)}'${size}>`;
    for (const p of state.properties) {
      s += NL + TAB + `<property name='${p.name}' type='${p.type}' value='${escapeAttribute(p.value)}'/>`;
    }
    s += actions("enterStateActions", state.enterActions, v2);
    s += actions("doStateActions", state.doActions, v2);
    s += actions("exitStateActions", state.exitActions, v2);
    for (const t of transitions) s += eventElement(t, w);
    s += NL + "</state>";
    s += NL;
    return s;
  }
  function actions(tag, calls, v2) {
    if (calls.length === 0) return "";
    return NL + TAB + `<${tag}>` + calls.map((c) => NL + TAB + TAB + actionText(c, v2)).join("") + NL + TAB + `</${tag}>`;
  }
  function actionText(call, v2) {
    if (v2) return `<action call='${escapeAttribute(call)}'/>`;
    return takesPoint(call) ? call + ";" : call + "();";
  }
  function eventElement(t, w = {
    version: 1,
    mouseArea: ""
  }) {
    const v2 = w.version >= 2;
    const newState = t.to ? ` newState='${t.to.xmlId}'` : "";
    const condition = isElse(t.guards) ? "else" : guardCondition(t.guards);
    const guard = condition ? ` guard='${escapeAttribute(condition)}'` : "";
    const final = t.final ? " final='true'" : t.terminate ? " terminate='true'" : "";
    const legacy = w.version < 3 ? t.event.legacyId(w.mouseArea) : null;
    const id = legacy ? ` id='${legacy}'` : w.version === 3 ? attributeText(t.event.attributes().map(([name, value]) => [
      name,
      escapeAttribute(value)
    ])) : "";
    let s = NL + TAB + `<event${id}${newState}${final}${guard}${layout(t)}`;
    if (t.actions.length > 0) {
      s += ">";
      for (const action of t.actions) s += NL + TAB + TAB + actionText(action, v2);
      s += NL + TAB + "</event>";
    } else {
      s += "/>";
    }
    return s;
  }
  function layout(t) {
    if (t.path.length === 0) return "";
    const attributes = [];
    const first = t.path[0];
    const last = t.path[t.path.length - 1];
    attributes.push([
      "fromPoint",
      edgePoint(first.start)
    ]);
    if (t.path.length > 1 && first.end.state) {
      const choice = first.end.state;
      attributes.push([
        "choiceX",
        Math.round(choice.x)
      ], [
        "choiceY",
        Math.round(choice.y)
      ], [
        "choiceInPoint",
        edgePoint(first.end)
      ], [
        "choiceOutPoint",
        edgePoint(t.path[1].start)
      ]);
    }
    attributes.push(...endLayout(last));
    return attributeText(attributes);
  }
  function endLayout(last) {
    const to = last.end.state;
    if (to?.isFinal) return [
      [
        "toPoint",
        edgePoint(last.end)
      ],
      [
        "finalX",
        Math.round(to.x)
      ],
      [
        "finalY",
        Math.round(to.y)
      ]
    ];
    if (to?.isTerminate) {
      return [
        [
          "toPoint",
          edgePoint(last.end)
        ],
        [
          "terminateX",
          Math.round(to.x)
        ],
        [
          "terminateY",
          Math.round(to.y)
        ]
      ];
    }
    if (to) return [
      [
        "toPoint",
        edgePoint(last.end)
      ]
    ];
    return [
      [
        "toX",
        Math.round(last.end.point.x)
      ],
      [
        "toY",
        Math.round(last.end.point.y)
      ]
    ];
  }
  function attributeText(attributes) {
    return attributes.filter(([, value]) => value !== null).map(([name, value]) => ` ${name}='${value}'`).join("");
  }
  function edgePoint(end) {
    return end.compass === null || end.compass === Compass.CENTER ? null : end.compass;
  }
  function escapeAttribute(text2) {
    return text2.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&apos;");
  }

  // src/editor/states/ExportXmlState.ts
  var ExportXmlState = class extends EditorState {
    name = "STATE_EXPORT_XML";
    enter() {
      this.editor.view.showExportScreen(generateXml(this.editor.diagram));
    }
    onBackToDiagram() {
      this.editor.view.showDiagramScreen();
      this.editor.changeState(new SelectState(this.editor));
    }
    showsDiagram() {
      return false;
    }
  };

  // src/editor/states/StateResizeState.ts
  var StateResizeState = class extends EditorState {
    resized;
    grabOffset;
    name;
    constructor(editor2, resized, grabOffset) {
      super(editor2), this.resized = resized, this.grabOffset = grabOffset, this.name = "STATE_STATE_RESIZE";
    }
    onEnterFrame() {
      this.editor.view.drawScene();
    }
    onMouseMove(p) {
      this.resized.dragCornerTo({
        x: p.x + this.grabOffset.x,
        y: p.y + this.grabOffset.y
      });
    }
    onMouseUp(p) {
      this.onMouseMove(p);
      this.editor.findHover(p);
      this.editor.changeState(new SelectState(this.editor));
    }
  };

  // src/editor/states/SelectState.ts
  var SelectState = class extends EditorState {
    name = "STATE_SELECT";
    onEnterFrame() {
      this.editor.view.drawScene();
    }
    onNewStateTool(p) {
      const state = this.editor.createState(p);
      this.editor.changeState(new StateDragState(this.editor, state, {
        x: 0,
        y: 0
      }));
    }
    onNewChoiceTool(p) {
      const choice = this.editor.createShape("choice", p);
      this.editor.changeState(new StateDragState(this.editor, choice, {
        x: 0,
        y: 0
      }));
    }
    onNewInitialTool(p) {
      const initial = this.editor.createShape("initial", p);
      this.editor.changeState(new StateDragState(this.editor, initial, {
        x: 0,
        y: 0
      }));
    }
    onNewFinalTool(p) {
      const final = this.editor.createShape("final", p);
      this.editor.changeState(new StateDragState(this.editor, final, {
        x: 0,
        y: 0
      }));
    }
    onNewTerminateTool(p) {
      const terminate = this.editor.createShape("terminate", p);
      this.editor.changeState(new StateDragState(this.editor, terminate, {
        x: 0,
        y: 0
      }));
    }
    onNewConnectorTool(p) {
      const connector = this.editor.createConnector(p);
      this.editor.changeState(new ConnectorDragState(this.editor, connector, "start"));
    }
    onMouseMove(p) {
      this.editor.findHover(p);
    }
    onMouseDown(p) {
      const editor2 = this.editor;
      const selected = editor2.selectedState;
      if (selected?.onResizeHandle(p)) {
        const corner = selected.resizeHandle;
        editor2.changeState(new StateResizeState(editor2, selected, {
          x: corner.x - p.x,
          y: corner.y - p.y
        }));
        return;
      }
      editor2.deselect();
      editor2.findHover(p);
      const labelled = editor2.diagram.findLabelAt(p);
      if (labelled) {
        editor2.selectedConnector = labelled;
        editor2.view.showProperties();
        const c = labelled.center;
        editor2.changeState(new ConnectorMoveState(editor2, labelled, {
          x: c.x - p.x,
          y: c.y - p.y
        }));
      } else if (editor2.hoverState) {
        const state = editor2.hoverState;
        editor2.selectedState = state;
        editor2.view.showProperties();
        const grabOffset = {
          x: p.x - state.x,
          y: p.y - state.y
        };
        editor2.changeState(new StateDragState(editor2, state, grabOffset));
      } else if (editor2.hoverConnector) {
        const { connector, part } = editor2.hoverConnector;
        editor2.selectedConnector = connector;
        editor2.view.showProperties();
        if (part === "center") {
          editor2.changeState(new ConnectorMoveState(editor2, connector));
        } else {
          editor2.changeState(new ConnectorDragState(editor2, connector, part));
        }
      } else {
        editor2.view.showProperties();
      }
    }
    onTidyUp() {
      tidyUp(this.editor.diagram);
    }
    onExportXml() {
      this.editor.changeState(new ExportXmlState(this.editor));
    }
    onImportXml(xml) {
      const editor2 = this.editor;
      editor2.deselect();
      editor2.hoverState = null;
      editor2.hoverConnector = null;
      const { imported, message } = importAndReport(xml, editor2.diagram);
      if (imported) editor2.view.diagramLoaded();
      editor2.view.showMessage(message);
      editor2.view.showProperties();
    }
    onDeleteKey() {
      const editor2 = this.editor;
      if (editor2.selectedState) {
        editor2.diagram.removeState(editor2.selectedState);
      } else if (editor2.selectedConnector) {
        editor2.diagram.removeConnector(editor2.selectedConnector);
      } else {
        return;
      }
      editor2.deselect();
      editor2.hoverState = null;
      editor2.hoverConnector = null;
      editor2.view.showProperties();
    }
    onDuplicateKey() {
      const editor2 = this.editor;
      if (editor2.selectedState) {
        editor2.selectedState = editor2.diagram.duplicateState(editor2.selectedState);
      } else if (editor2.selectedConnector) {
        editor2.selectedConnector = editor2.diagram.duplicateConnector(editor2.selectedConnector);
      } else {
        return;
      }
      editor2.view.showProperties();
    }
    // in SELECT, things under the mouse are highlighted
    stateLook(state) {
      if (state === this.editor.selectedState) return "selected";
      return state === this.editor.hoverState ? "hover" : "normal";
    }
    connectorLook(connector) {
      const look = super.connectorLook(connector);
      const hover = this.editor.hoverConnector;
      if (hover?.connector === connector) look.handle = hover.part;
      return look;
    }
  };

  // src/editor/states/LoadingState.ts
  var LoadingState = class extends EditorState {
    name = "STATE_GAME_LOADING";
    onLoad() {
      this.editor.changeState(new SelectState(this.editor));
    }
    // nothing to draw yet
    showsDiagram() {
      return false;
    }
  };

  // src/editor/StateGenEditor.ts
  var StateGenEditor = class _StateGenEditor {
    view;
    diagram;
    /** where new connectors are anchored, near the top left ("var p2 = new Point(80, 40)" in Flash, just right of its Tools palette) */
    static NEW_CONNECTOR_END = {
      x: 125,
      y: 40
    };
    // ----- the shared "game" object -----
    selectedState;
    selectedConnector;
    /** the state under the mouse ("game.nearestStateIndex") */
    hoverState;
    /** the connector end/center near the mouse ("game.nearestConnectorIndex", "game.isStart", "game.isCenter") */
    hoverConnector;
    /** the last known mouse position (Flash: _xmouse, _ymouse) */
    mouse;
    state;
    constructor(view2) {
      this.view = view2;
      this.diagram = new Diagram();
      this.selectedState = null;
      this.selectedConnector = null;
      this.hoverState = null;
      this.hoverConnector = null;
      this.mouse = {
        x: 0,
        y: 0
      };
      this.state = new LoadingState(this);
      this.state.enter();
    }
    get currentState() {
      return this.state;
    }
    /** each state says how to draw things in it (stateLook() / connectorLook()) */
    get look() {
      return this.state;
    }
    /** Leave the current state and enter a new one (the generated exitSTATE_...() / enterSTATE_...() calls). */
    changeState(newState) {
      this.state.exit();
      this.state = newState;
      this.state.enter();
      this.view.stateChanged(newState);
    }
    // ----- events: every one is passed straight on to the current state -----
    load() {
      this.state.onLoad();
    }
    enterFrame() {
      this.state.onEnterFrame();
    }
    mouseMove(p) {
      this.mouse = p;
      this.state.onMouseMove(p);
    }
    mouseDown(p) {
      this.mouse = p;
      this.state.onMouseDown(p);
    }
    mouseUp(p) {
      this.mouse = p;
      this.state.onMouseUp(p);
    }
    selectTool() {
      this.state.onSelectTool();
    }
    newStateTool(p) {
      this.mouse = p;
      this.state.onNewStateTool(p);
    }
    newChoiceTool(p) {
      this.mouse = p;
      this.state.onNewChoiceTool(p);
    }
    newInitialTool(p) {
      this.mouse = p;
      this.state.onNewInitialTool(p);
    }
    newFinalTool(p) {
      this.mouse = p;
      this.state.onNewFinalTool(p);
    }
    newTerminateTool(p) {
      this.mouse = p;
      this.state.onNewTerminateTool(p);
    }
    newConnectorTool(p) {
      this.mouse = p;
      this.state.onNewConnectorTool(p);
    }
    tidyUp() {
      this.state.onTidyUp();
    }
    exportXml() {
      this.state.onExportXml();
    }
    importXml(xml) {
      this.state.onImportXml(xml);
    }
    backToDiagram() {
      this.state.onBackToDiagram();
    }
    deleteKey() {
      this.state.onDeleteKey();
    }
    duplicateKey() {
      this.state.onDuplicateKey();
    }
    // ----- actions shared by several states -----
    /** Deselect everything ("game.selectedStateIndex = -1; game.selectedConnectorIndex = -1;"). */
    deselect() {
      this.selectedState = null;
      this.selectedConnector = null;
    }
    /** Work out what is under the mouse. A state takes precedence over a connector. */
    findHover(p) {
      this.hoverState = this.diagram.findStateAt(p);
      this.hoverConnector = this.hoverState ? null : this.diagram.findConnectorNear(p);
    }
    /** Create a new state at the mouse and select it - newStateButtonActions(). */
    createState(p) {
      this.deselect();
      const state = this.diagram.addState(p);
      this.selectedState = state;
      this.view.showProperties();
      return state;
    }
    /** Create a new choice diamond, initial dot, final bullseye or terminate X at the mouse, and select it. (NEW) */
    createShape(kind, p) {
      this.deselect();
      const shape = kind === "choice" ? this.diagram.addChoice(p) : kind === "initial" ? this.diagram.addInitial(p) : kind === "final" ? this.diagram.addFinal(p) : this.diagram.addTerminate(p);
      this.selectedState = shape;
      this.view.showProperties();
      return shape;
    }
    /** Create a new connector from the mouse to the top-left corner and select it - newConnectorObject(). */
    createConnector(p) {
      this.deselect();
      const connector = this.diagram.addConnector(p, _StateGenEditor.NEW_CONNECTOR_END);
      this.selectedConnector = connector;
      this.view.showProperties();
      return connector;
    }
  };

  // src/examples.ts
  var EXAMPLES = [
    {
      title: "dvd-menu.xml",
      file: "dvd-menu.xml",
      xml: "<?xml version='1.0'?>\r\n<game>\r\n<!-- ****************************** BUTTON INSTANCE NAMES  ******************** -->\r\n<buttonInstanceList>\r\n	<button id='playFilmButton'/>\r\n	<button id='mainMenuButton'/>\r\n	<button id='extrasButton'/>\r\n</buttonInstanceList>\r\n\r\n<!-- ****************************** USER DEFINED EVENTS  ******************** -->\r\n<userDefinedEventList>\r\n	<event id='EVENT_USER_DEFINED_END_OF_FILM_REACHED'/>\r\n</userDefinedEventList>\r\n\r\n<!-- ****************************** STATE ELEMENTS  ******************** -->\r\n<!-- (the order of the states, and of their events, decides which way each pair of curved arrows bends) -->\r\n<!-- ****************************** STATE ******************** -->\r\n<state id='STATE_FILM_PLAYING' frameName='filmPlaying' x='230' y='110'>\r\n	<event id='EVENT_USER_DEFINED_END_OF_FILM_REACHED' newState='STATE_MAIN_MENU'/>\r\n</state>\r\n\r\n<!-- ****************************** STATE ******************** -->\r\n<state id='STATE_GAME_LOADING' frameName='gameLoading' x='230' y='450'>\r\n	<event id='EVENT_ON_LOAD' newState='STATE_MAIN_MENU'/>\r\n</state>\r\n\r\n<!-- ****************************** STATE ******************** -->\r\n<state id='STATE_EXTRAS' frameName='extras' x='600' y='280'>\r\n	<event id='EVENT_BUTTON_ON_RELEASE_mainMenuButton' newState='STATE_MAIN_MENU'/>\r\n</state>\r\n\r\n<!-- ****************************** STATE ******************** -->\r\n<state id='STATE_MAIN_MENU' frameName='mainMenu' x='230' y='280'>\r\n	<event id='EVENT_BUTTON_ON_RELEASE_playFilmButton' newState='STATE_FILM_PLAYING'/>\r\n	<event id='EVENT_BUTTON_ON_RELEASE_extrasButton' newState='STATE_EXTRAS'/>\r\n</state>\r\n\r\n</game>\r\n"
    },
    {
      title: "gumball.xml",
      file: "gumball.xml",
      xml: "<?xml version='1.0'?>\n<game version='2'>\n\n<!-- ****************************** USER DEFINED EVENTS  ******************** -->\n<userDefinedEventList>\n	<event id='EVENT_USER_DEFINED_COIN_INSERTED'/>\n	<event id='EVENT_USER_DEFINED_CRANK_TURNED'/>\n</userDefinedEventList>\n\n<!-- ****************************** INITIAL STATE  ******************** -->\n<initialState x='79' y='280' choiceX='230' choiceY='280'>\n	<event newState='STATE_NO_COIN' guard='gumballs &gt; 0'/>\n	<event newState='STATE_OUT_OF_GUMBALLS' guard='gumballs == 0'/>\n</initialState>\n\n<!-- ****************************** STATE ELEMENTS  ******************** -->\n<!-- ****************************** STATE ******************** -->\n<state id='STATE_NO_COIN' x='490' y='280'>\n	<event id='EVENT_USER_DEFINED_COIN_INSERTED' newState='STATE_HAS_COIN'/>\n</state>\n\n<!-- ****************************** STATE ******************** -->\n<state id='STATE_HAS_COIN' x='490' y='110'>\n	<event id='EVENT_USER_DEFINED_CRANK_TURNED' newState='STATE_GUMBALL_SOLD'/>\n</state>\n\n<!-- ****************************** STATE ******************** -->\n<state id='STATE_GUMBALL_SOLD' x='230' y='110'>\n	<enterStateActions>\n		<action call='releaseGumball'/>\n	</enterStateActions>\n	<event newState='STATE_NO_COIN' guard='gumballs &gt; 0' choiceX='230' choiceY='280'/>\n	<event newState='STATE_OUT_OF_GUMBALLS' guard='gumballs == 0' choiceX='230' choiceY='280'/>\n</state>\n\n<!-- ****************************** STATE ******************** -->\n<state id='STATE_OUT_OF_GUMBALLS' x='230' y='450'>\n</state>\n\n</game>\n"
    },
    {
      title: "stateGEN-itself-v3.xml",
      file: "stateGEN-itself-v3.xml",
      xml: `<?xml version="1.0" ?>
<game version='3'>

<!-- stateGEN's own editor, in version 3 of the XML (TDDs/version03.md): every event says what it is -
     "this DOM event, on this target" - so there are no declaration lists, and no <mouseArea> (mouse down
     is pointerdown on the diagram). Ctrl/Cmd-D and Escape in the import dialog are events here too. -->

<!-- INITIAL STATE -->
<initialState newState='STATE_GAME_LOADING'/>

<!-- ****************************** STATE ******************** -->
<state id='STATE_GAME_LOADING'>
	<property name='hidesDiagram' type='boolean' value='true'/>
	<!-- (version 2's ON_LOAD: no event, so it happens straight away) -->
	<event newState='STATE_SELECT'/>
</state>

<!-- ****************************** STATE ******************** -->
<state id='STATE_SELECT' screen='diagram-screen'>
	<property name='highlightHover' type='boolean' value='true'/>

	<event on='animationframe'><action call='drawScene'/></event>
	<event on='pointermove'><action call='findHover(p)'/></event>

	<!-- what is under the mouse decides the next state: a choice diamond on the diagram -->
	<!-- (the selected state's resize handle comes first, then an arrow's label - on top of everything -
	     which grabs the arrow, like its center) -->
	<event on='pointerdown' target='diagram' guard='overResizeHandle(p)' newState='STATE_STATE_RESIZE'>
		<action call='grabResizeHandleAt(p)'/>
	</event>
	<event on='pointerdown' target='diagram' guard='overConnectorLabel(p)' newState='STATE_CONNECTOR_MOVE'>
		<action call='grabConnectorByLabelAt(p)'/>
	</event>
	<event on='pointerdown' target='diagram' guard='overState(p)' newState='STATE_STATE_DRAG'>
		<action call='grabStateAt(p)'/>
	</event>
	<event on='pointerdown' target='diagram' guard='overConnectorCenter(p)' newState='STATE_CONNECTOR_MOVE'>
		<action call='grabConnectorAt(p)'/>
	</event>
	<event on='pointerdown' target='diagram' guard='overConnectorEnd(p)' newState='STATE_CONNECTOR_DRAG'>
		<action call='grabConnectorEndAt(p)'/>
	</event>
	<event on='pointerdown' target='diagram' guard='else'><action call='deselect'/></event>

	<event on='pointerdown' target='newStateButton' newState='STATE_STATE_DRAG'><action call='createStateAt(p)'/></event>
	<event on='pointerdown' target='newChoiceButton' newState='STATE_STATE_DRAG'><action call='createChoiceAt(p)'/></event>
	<event on='pointerdown' target='newInitialButton' newState='STATE_STATE_DRAG'><action call='createInitialAt(p)'/></event>
	<event on='pointerdown' target='newFinalButton' newState='STATE_STATE_DRAG'><action call='createFinalAt(p)'/></event>
	<event on='pointerdown' target='newTerminateButton' newState='STATE_STATE_DRAG'><action call='createTerminateAt(p)'/></event>
	<event on='pointerdown' target='newConnectorButton' newState='STATE_CONNECTOR_DRAG'><action call='createConnectorAt(p)'/></event>

	<event on='click' target='tidyUpButton'><action call='tidyUp'/></event>
	<event on='click' target='exportXMLButton' newState='STATE_EXPORT_XML'/>
	<event on='click' target='importXMLButton' newState='STATE_IMPORT_DIALOG'/>

	<event on='keydown' key='Delete'><action call='deleteSelected'/></event>
	<event on='keydown' key='Backspace'><action call='deleteSelected'/></event>
	<event on='keydown' key='d' mod='mod'><action call='duplicateSelected'/></event>
</state>

<!-- ****************************** STATE ******************** -->
<state id='STATE_STATE_DRAG' screen='diagram-screen'>
	<event on='animationframe'><action call='drawScene'/></event>
	<event on='pointermove'><action call='dragStateTo(p)'/></event>
	<event on='pointerup' newState='STATE_SELECT'><action call='dropStateAt(p)'/></event>
	<event on='pointerdown' target='selectButton' newState='STATE_SELECT'/>
	<event on='pointerdown' target='newConnectorButton' newState='STATE_CONNECTOR_DRAG'><action call='createConnectorAt(p)'/></event>
</state>

<!-- ****************************** STATE ******************** (NEW) -->
<state id='STATE_STATE_RESIZE' screen='diagram-screen'>
	<event on='animationframe'><action call='drawScene'/></event>
	<event on='pointermove'><action call='resizeStateTo(p)'/></event>
	<event on='pointerup' newState='STATE_SELECT'><action call='resizeStateTo(p)'/></event>
</state>

<!-- ****************************** STATE ******************** -->
<state id='STATE_CONNECTOR_DRAG' screen='diagram-screen'>
	<property name='showSnapHandles' type='boolean' value='true'/>
	<property name='connectorMoving' type='boolean' value='true'/>

	<event on='animationframe'><action call='drawScene'/></event>
	<event on='pointermove'><action call='dragConnectorEndTo(p)'/></event>
	<event on='pointerup' newState='STATE_SELECT'/>
	<event on='pointerdown' target='selectButton' newState='STATE_SELECT'/>
	<event on='pointerdown' target='newStateButton' newState='STATE_STATE_DRAG'><action call='createStateAt(p)'/></event>
	<event on='pointerdown' target='newChoiceButton' newState='STATE_STATE_DRAG'><action call='createChoiceAt(p)'/></event>
	<event on='pointerdown' target='newInitialButton' newState='STATE_STATE_DRAG'><action call='createInitialAt(p)'/></event>
	<event on='pointerdown' target='newFinalButton' newState='STATE_STATE_DRAG'><action call='createFinalAt(p)'/></event>
	<event on='pointerdown' target='newTerminateButton' newState='STATE_STATE_DRAG'><action call='createTerminateAt(p)'/></event>
</state>

<!-- ****************************** STATE ******************** -->
<state id='STATE_CONNECTOR_MOVE' screen='diagram-screen'>
	<property name='connectorMoving' type='boolean' value='true'/>

	<event on='animationframe'><action call='drawScene'/></event>
	<event on='pointermove'><action call='moveConnectorTo(p)'/></event>
	<event on='pointerup' newState='STATE_SELECT'/>
</state>

<!-- ****************************** STATE ******************** -->
<state id='STATE_EXPORT_XML' screen='export-screen'>
	<property name='hidesDiagram' type='boolean' value='true'/>
	<enterStateActions><action call='showGeneratedFiles'/></enterStateActions>

	<event on='click' target='backToDiagramButton' newState='STATE_SELECT'/>
</state>

<!-- ****************************** STATE ******************** (NEW) -->
<state id='STATE_IMPORT_DIALOG' screen='diagram-screen'>
	<enterStateActions><action call='openImportDialog'/></enterStateActions>
	<exitStateActions><action call='closeImportDialog'/></exitStateActions>

	<event on='click' target='importOkButton' newState='STATE_SELECT'><action call='importFromDialog'/></event>
	<event on='click' target='importCancelButton' newState='STATE_SELECT'/>
	<!-- NEW: Escape cancels too. (On the dialog itself, so it counts while typing in it; matching it stops the
	     browser closing the dialog on its own, behind the state machine's back) -->
	<event on='keydown' target='import-dialog' key='Escape' newState='STATE_SELECT'/>
</state>

</game>
`
    },
    {
      title: "traffic-lights.xml",
      file: "traffic-lights.xml",
      xml: "<?xml version='1.0'?>\n<game>\n<!-- Traffic lights (new): time events, after(ms). Each light stays on for a while, then changes.\n     Pressing the WAIT button while the light is green changes it sooner: the GREEN timer is cancelled. -->\n\n<!-- ****************************** BUTTON INSTANCE NAMES  ******************** -->\n<buttonInstanceList>\n	<button id='waitButton'/>\n</buttonInstanceList>\n\n<!-- ****************************** INITIAL STATE  ******************** -->\n<initialState newState='STATE_RED'/>\n\n<!-- ****************************** STATE ELEMENTS  ******************** -->\n<!-- ****************************** STATE ******************** -->\n<state id='STATE_RED'>\n	<event id='EVENT_AFTER_4000' newState='STATE_GREEN'/>\n</state>\n\n<!-- ****************************** STATE ******************** -->\n<state id='STATE_GREEN'>\n	<event id='EVENT_AFTER_8000' newState='STATE_AMBER'/>\n	<event id='EVENT_BUTTON_ON_RELEASE_waitButton' newState='STATE_AMBER'/>\n</state>\n\n<!-- ****************************** STATE ******************** -->\n<state id='STATE_AMBER'>\n	<event id='EVENT_AFTER_2000' newState='STATE_RED'/>\n</state>\n\n</game>\n"
    }
  ];

  // src/view/labels.ts
  var ABOVE = 17;
  var STEP = 12;
  var GAP = 2;
  function placeLabels(requests, avoid = []) {
    const placed = [];
    return requests.map((r) => {
      const dx = r.to.x - r.from.x;
      const dy = r.to.y - r.from.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const middle = {
        x: (r.from.x + r.to.x) / 2,
        y: (r.from.y + r.to.y) / 2
      };
      const reach = Math.max(0, length / 2 - 16);
      let best = null;
      for (let step = 0; step * STEP <= reach; step++) {
        for (const along of step === 0 ? [
          0
        ] : [
          step * STEP,
          -step * STEP
        ]) {
          for (const below of [
            false,
            true
          ]) {
            const box2 = {
              x: middle.x + ux * along,
              y: middle.y + uy * along + (below ? ABOVE : -ABOVE),
              width: r.width,
              height: r.height
            };
            if (placed.some((p) => overlaps(p, box2))) continue;
            const cost = Math.abs(along) + (below ? 20 : 0) + (avoid.some((a) => overlaps(a, box2)) ? 1e3 : 0);
            if (!best || cost < best.cost) best = {
              box: box2,
              cost
            };
          }
        }
        if (best && best.cost < (step + 1) * STEP) break;
      }
      const box = best?.box ?? {
        x: middle.x,
        y: middle.y - ABOVE,
        width: r.width,
        height: r.height
      };
      placed.push(box);
      return {
        x: box.x,
        y: box.y
      };
    });
  }
  function overlaps(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + GAP && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + GAP;
  }

  // src/view/Viewport.ts
  var MIN_SCALE = 0.2;
  var MAX_SCALE = 4;
  var ZOOM_STEP = 1.25;
  var FIT_MARGIN = 40;
  var Viewport = class {
    scale = 1;
    panX = 0;
    panY = 0;
    /** The SVG transform that draws diagram coordinates at their place on screen. */
    get transform() {
      return `translate(${this.panX} ${this.panY}) scale(${this.scale})`;
    }
    toDiagram(screen) {
      return {
        x: (screen.x - this.panX) / this.scale,
        y: (screen.y - this.panY) / this.scale
      };
    }
    toScreen(p) {
      return {
        x: p.x * this.scale + this.panX,
        y: p.y * this.scale + this.panY
      };
    }
    /** Move the whole diagram by (dx, dy) screen pixels - dragging with the middle mouse button. */
    panBy(dx, dy) {
      this.panX += dx;
      this.panY += dy;
    }
    /** Pan (keeping the zoom) so diagram point `p` is in the middle of a width x height screen - the minimap. */
    centerOn(p, width, height) {
      this.panX = width / 2 - p.x * this.scale;
      this.panY = height / 2 - p.y * this.scale;
    }
    /** Zoom by `factor`, keeping the diagram point under `screen` (the mouse, or the middle) where it is. */
    zoomAt(screen, factor) {
      this.zoomTo(this.scale * factor, screen);
    }
    /** Zoom to `scale` (1 = 100%), keeping the diagram point under `screen` where it is. */
    zoomTo(scale, screen) {
      const fixed = this.toDiagram(screen);
      this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      this.panX = screen.x - fixed.x * this.scale;
      this.panY = screen.y - fixed.y * this.scale;
    }
    /**
     * Zoom as far in as possible (up to `maxScale`) with all of `bounds` (diagram coordinates) on a
     * `width` x `height` screen, and center it. `keepClear` is screen space down the right (the Tools palette).
     */
    fit(bounds, width, height, keepClear = 0, maxScale = MAX_SCALE) {
      if (!bounds) {
        this.scale = 1;
        this.panX = this.panY = 0;
        return;
      }
      const roomX = Math.max(1, width - keepClear - 2 * FIT_MARGIN);
      const roomY = Math.max(1, height - 2 * FIT_MARGIN);
      const scale = Math.min(roomX / Math.max(1, bounds.width), roomY / Math.max(1, bounds.height));
      this.scale = Math.min(maxScale, MAX_SCALE, Math.max(MIN_SCALE, scale));
      this.panX = (width - keepClear) / 2 - bounds.x * this.scale;
      this.panY = height / 2 - bounds.y * this.scale;
    }
  };
  function boundsOf(boxes) {
    if (boxes.length === 0) return null;
    const left = Math.min(...boxes.map((b) => b.x - b.width / 2));
    const right = Math.max(...boxes.map((b) => b.x + b.width / 2));
    const top = Math.min(...boxes.map((b) => b.y - b.height / 2));
    const bottom = Math.max(...boxes.map((b) => b.y + b.height / 2));
    return {
      x: (left + right) / 2,
      y: (top + bottom) / 2,
      width: right - left,
      height: bottom - top
    };
  }

  // src/view/DiagramView.ts
  var DiagramView = class {
    svg;
    /** how far the diagram is panned and zoomed (NEW) */
    viewport;
    /** where the labels were drawn last time (for "fit") */
    labelBoxes;
    constructor(svg2) {
      this.svg = svg2;
      this.viewport = new Viewport();
      this.labelBoxes = [];
    }
    /** Convert a mouse event's position to diagram coordinates (allowing for the pan and zoom). */
    toDiagram(e) {
      return this.viewport.toDiagram(this.toScreen(e));
    }
    /** A mouse event's position on the <svg>, in screen pixels. */
    toScreen(e) {
      const r = this.svg.getBoundingClientRect();
      return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
      };
    }
    /** The middle of the <svg>, in screen pixels. */
    get screenMiddle() {
      const r = this.svg.getBoundingClientRect();
      return {
        x: r.width / 2,
        y: r.height / 2
      };
    }
    /** Zoom (up to `maxScale`) and center so the whole diagram (states, arrows and labels) fits on screen. */
    fit(diagram, keepClear, maxScale) {
      const boxes = [
        ...diagram.states,
        ...this.labelBoxes
      ];
      for (const c of diagram.connectors) {
        for (const p of [
          c.start.point,
          c.end.point
        ]) boxes.push({
          x: p.x,
          y: p.y,
          width: 0,
          height: 0
        });
      }
      const r = this.svg.getBoundingClientRect();
      this.viewport.fit(boundsOf(boxes), r.width, r.height, keepClear, maxScale);
    }
    draw(diagram, editorState) {
      diagram.updateBends();
      let s = "";
      diagram.connectors.forEach((c) => s += this.connectorSvg(c, editorState));
      for (const state of diagram.states) s += this.stateSvg(state, editorState);
      s += this.labelsSvg(diagram);
      this.svg.innerHTML = `<g transform="${this.viewport.transform}">${s}</g>`;
    }
    stateSvg(state, editorState) {
      const look = editorState.stateLook(state);
      const left = state.x - state.width / 2;
      const top = state.y - state.height / 2;
      if (state.isChoice) return this.choiceSvg(state, look);
      if (state.isRound) return this.roundSvg(state, look);
      let s = `<g class="state ${look}">`;
      const radius = state.cornerRadius;
      s += `<rect class="state-box" x="${left}" y="${top}" width="${state.width}" height="${state.height}" rx="${radius}"/>`;
      const lines = state.nameLines();
      const lineHeight = DiagramState.NAME_LINE_HEIGHT;
      const behaviours = state.shownBehaviours();
      if (behaviours.length === 0) {
        const firstBaseline = state.y - (lines.length - 1) * lineHeight / 2 + 5;
        lines.forEach((text2, i) => {
          s += `<text class="state-name" x="${state.x}" y="${firstBaseline + i * lineHeight}">${escape(text2)}</text>`;
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
    behavioursSvg(state, nameLines, behaviours) {
      const left = state.x - state.width / 2;
      const top = state.y - state.height / 2;
      let s = "";
      nameLines.forEach((text2, i) => {
        const y = top + 23 + i * DiagramState.NAME_LINE_HEIGHT;
        s += `<text class="state-name" x="${state.x}" y="${y}">${escape(text2)}</text>`;
      });
      const lineY = top + 10 + nameLines.length * DiagramState.NAME_LINE_HEIGHT + 3;
      const r = state.cornerRadius;
      const dy = Math.max(0, r - (lineY - top));
      const inset = r - Math.sqrt(r * r - dy * dy);
      s += `<line class="state-divider" x1="${left + inset}" y1="${lineY}" x2="${left + state.width - inset}" y2="${lineY}"/>`;
      behaviours.forEach((text2, i) => {
        const y = lineY + 16 + i * DiagramState.BEHAVIOUR_LINE_HEIGHT;
        s += `<text class="state-behaviour" x="${left + 10}" y="${y}">${escape(text2)}</text>`;
      });
      return s;
    }
    /** A UML choice: a diamond (NEW - see ChoicePoint.ts). */
    choiceSvg(choice, look) {
      const w = choice.width / 2;
      const h = choice.height / 2;
      const { x, y } = choice;
      let s = `<g class="state choice ${look}">`;
      s += `<path class="state-box" d="M${x} ${y - h} L${x + w} ${y} L${x} ${y + h} L${x - w} ${y} Z"/>`;
      if (look === "snap") s += snapHandles(choice);
      return s + "</g>";
    }
    /** The UML initial dot (filled), final bullseye (a ring round a dot) or terminate X - NEW, see Pseudostates.ts. */
    roundSvg(shape, look) {
      const r = shape.width / 2;
      let s = `<g class="state ${shape.kind} ${look}">`;
      if (shape.isTerminate) {
        const d = r * 0.7;
        s += `<circle class="state-box terminate-hit" cx="${shape.x}" cy="${shape.y}" r="${r}"/>`;
        s += `<path class="terminate-x" d="M${shape.x - d} ${shape.y - d} L${shape.x + d} ${shape.y + d} M${shape.x + d} ${shape.y - d} L${shape.x - d} ${shape.y + d}"/>`;
      } else if (shape.isFinal) {
        s += `<circle class="state-box final-ring" cx="${shape.x}" cy="${shape.y}" r="${r}"/>`;
        s += `<circle class="final-dot" cx="${shape.x}" cy="${shape.y}" r="${r - 6}"/>`;
      } else {
        s += `<circle class="state-box" cx="${shape.x}" cy="${shape.y}" r="${r}"/>`;
      }
      if (look === "snap") s += snapHandles(shape);
      return s + "</g>";
    }
    connectorSvg(connector, editorState) {
      const look = editorState.connectorLook(connector);
      const p1 = connector.start.point;
      const p2 = connector.end.point;
      const c = connector.center;
      const control = connector.control;
      let path = connector.isCurved ? `M${p1.x} ${p1.y} Q${control.x} ${control.y} ${p2.x} ${p2.y}` : `M${p1.x} ${p1.y} L${p2.x} ${p2.y}`;
      path += arrowHead(connector.isCurved ? control : p1, p2);
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
    labelsSvg(diagram) {
      const labelled = diagram.connectors.map((connector) => ({
        connector,
        text: connector.labelText()
      })).filter((l) => l.text !== "");
      const places = placeLabels(
        // half way back - it touches the curve right in the middle, going the same way)
        labelled.map(({ connector, text: text2 }) => ({
          from: connector.isCurved ? midpoint(connector.start.point, connector.control) : connector.start.point,
          to: connector.isCurved ? midpoint(connector.control, connector.end.point) : connector.end.point,
          width: text2.length * LABEL_CHAR_WIDTH + 10,
          height: 18
        })),
        diagram.states
      );
      let s = "";
      this.labelBoxes = [];
      for (const connector of diagram.connectors) connector.labelBox = null;
      labelled.forEach(({ connector, text: text2 }, i) => {
        const { x, y } = places[i];
        const width = text2.length * LABEL_CHAR_WIDTH + 10;
        this.labelBoxes.push({
          x,
          y,
          width,
          height: 18
        });
        connector.labelBox = {
          x,
          y,
          width,
          height: 18
        };
        s += `<rect class="connector-label-bg" x="${x - width / 2}" y="${y - 9}" width="${width}" height="18" rx="2"/>`;
        s += `<text class="connector-label" x="${x}" y="${y + 5}">${escape(text2)}</text>`;
      });
      return s;
    }
  };
  function resizeHandle(state) {
    const { x, y } = state.resizeHandle;
    return `<rect class="resize-handle" x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2"/>`;
  }
  function snapHandles(state) {
    let s = "";
    const points = state.snapPoints.length > 0 ? state.snapPoints : [
      Compass.CENTER
    ];
    for (const compass of points) {
      const p = state.compassPoint(compass);
      s += `<rect class="snap-handle" x="${p.x - 3}" y="${p.y - 3}" width="6" height="6"/>`;
    }
    return s;
  }
  var LABEL_CHAR_WIDTH = 7.3;
  function arrowHead(from, to) {
    const LENGTH = 16;
    const SPREAD = Math.PI / 7;
    const angle = from.x === to.x && from.y === to.y ? 0 : Math.atan2(to.y - from.y, to.x - from.x);
    const wing = (side) => ({
      x: to.x - LENGTH * Math.cos(angle + side * SPREAD),
      y: to.y - LENGTH * Math.sin(angle + side * SPREAD)
    });
    const a = wing(1);
    const b = wing(-1);
    return ` M${a.x} ${a.y} L${to.x} ${to.y} L${b.x} ${b.y}`;
  }
  function square(p, half) {
    return ` M${p.x - half} ${p.y - half} h${half * 2} v${half * 2} h${-half * 2} Z`;
  }
  function escape(text2) {
    return text2.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // src/view/PropertiesPanel.ts
  var PropertiesPanel = class {
    root;
    editor;
    /** the state name field, while a state is shown */
    stateNameField;
    /** NEW: the arrow in the header minimises the panel to just its header (remembered, if the browser lets it) */
    collapsed;
    /** where show() puts the fields, under the header */
    body;
    constructor(root, editor2) {
      this.root = root;
      this.editor = editor2;
      this.stateNameField = null;
      this.collapsed = false;
      this.body = el("div", {
        className: "prop-body"
      });
      try {
        this.collapsed = localStorage.getItem("stateGEN.propertiesCollapsed") === "true";
      } catch {
      }
    }
    /** Minimise the panel to its header, or open it again. */
    setCollapsed(collapsed) {
      this.collapsed = collapsed;
      this.root.classList.toggle("collapsed", collapsed);
      try {
        localStorage.setItem("stateGEN.propertiesCollapsed", String(collapsed));
      } catch {
      }
      this.show();
    }
    /** Put the cursor in the state name field with all its text selected, so typing replaces the name. */
    focusStateName() {
      if (this.collapsed) this.setCollapsed(false);
      this.stateNameField?.focus();
      this.stateNameField?.select();
    }
    show() {
      const { selectedState, selectedConnector } = this.editor;
      this.body = el("div", {
        className: "prop-body"
      });
      this.stateNameField = null;
      if (selectedState) this.showState(selectedState);
      else if (selectedConnector) this.showConnector(selectedConnector);
      else this.showEmpty();
      const heading = this.body.firstElementChild;
      const toggle = el("button", {
        type: "button",
        className: "prop-toggle",
        textContent: this.collapsed ? "\u25B6" : "\u25BC",
        title: this.collapsed ? "show the properties" : "minimise the properties"
      });
      toggle.setAttribute("aria-expanded", String(!this.collapsed));
      toggle.addEventListener("click", () => this.setCollapsed(!this.collapsed));
      const header = el("div", {
        className: "prop-header"
      }, [
        toggle,
        heading
      ]);
      header.addEventListener("dblclick", (e) => {
        if (e.target !== toggle) this.setCollapsed(!this.collapsed);
      });
      this.body.hidden = this.collapsed;
      this.root.classList.toggle("collapsed", this.collapsed);
      this.root.replaceChildren(header, this.body);
    }
    showEmpty() {
      this.body.append(title("Nothing selected", "Click a state or an arrow to see its properties here."), el("div", {
        className: "prop-empty"
      }, [
        "Press the new state tool and drag a state onto the diagram. Press the new connector tool and drag its start onto a state's edge, then drag its other end onto another state. Click a state or connector to see its properties here."
      ]));
    }
    // ----------------------------------------------------------------------------------------------- STATE
    showState(state) {
      if (state.isTerminate) {
        this.body.append(title("Terminate", "The X: the object is deleted."), row(cell("Instance ID", text(state.instanceId)), cell("", el("div", {
          className: "prop-note"
        }, [
          "Draw arrows into this X, each with an event, e.g. ALIEN HIT. When one happens, the object is deleted: unlike the final state (where it stays, finished), the state machine is gone."
        ]), true)));
        return;
      }
      if (state.isInitial || state.isFinal) {
        this.body.append(title(state.isInitial ? "Initial state" : "Final state", state.isInitial ? "The start: the dot the state machine begins at." : "The end: the bullseye."), row(cell("Instance ID", text(state.instanceId)), cell("", el("div", {
          className: "prop-note"
        }, [
          state.isInitial ? "Draw one arrow from this dot to the state the game starts in. The arrow needs no event: it happens as soon as the game starts." : "Draw arrows into this bullseye, each with an event, e.g. GAME OVER. When one happens, the state machine has ended: it ignores every event from then on."
        ]), true)));
        return;
      }
      if (state.isChoice) {
        this.body.append(title("Choice", "A decision: which arrow out is taken depends on the guards."), row(cell("Instance ID", text(state.instanceId)), cell("", el("div", {
          className: "prop-note"
        }, [
          "One arrow comes in, with an event (e.g. CRANK TURNED). Give each arrow going out a guard, e.g. gumballs > 0 or gumballs = 0, or else. When exported, each arrow out becomes a guarded transition from the state before the choice."
        ]), true)));
        return;
      }
      this.stateNameField = input(state.stateName, (field) => {
        field.value = field.value.toUpperCase();
        state.stateName = field.value;
      });
      this.stateNameField.placeholder = "STATE NAME";
      this.body.append(title("State", "What the game is doing now; the arrows out of it say what can happen next."), row(cell("Instance ID", text(state.instanceId)), cell("State name", this.stateNameField, true, "e.g. GAME PLAYING - always UPPER CASE")), row(cell("Screen", placeholder(input(state.screen, (f) => state.screen = f.value.trim()), "element id"), true, "the id of the HTML element shown in this state"), cell("Frame name", placeholder(input(state.frameName, (f) => state.frameName = f.value), "frame"), true, "Flash only: the frame shown in this state")), row(cell("entry/", placeholder(input(actionsText(state.enterActions), (f) => state.enterActions = parseActions(f.value)), "behaviour, behaviour \u2026"), true, "done once, as the state is entered (comma separated)"), cell("do/", placeholder(input(actionsText(state.doActions), (f) => state.doActions = parseActions(f.value)), "behaviour, behaviour \u2026"), true, "done every frame while in this state"), cell("exit/", placeholder(input(actionsText(state.exitActions), (f) => state.exitActions = parseActions(f.value)), "behaviour, behaviour \u2026"), true, "done once, as the state is left")), row(cell("Properties", placeholder(input(propertiesText(state.properties), (f) => state.properties = parseProperties2(f.value)), "name = value, \u2026"), true, 'what the page can read while in this state, e.g. highlightHover = true, zoom = 1.5, label = "hi"')));
    }
    // ----------------------------------------------------------------------------------------------- CONNECTOR
    showConnector(c) {
      const index = this.editor.diagram.indexOf(c);
      const redraw = (change) => {
        change();
        this.show();
      };
      const eventChooser = eventSelect(c, (value) => redraw(() => chooseEvent(c, value)));
      const details = [];
      switch (c.eventGroup) {
        case "completion":
          details.push(cell("", text("no event: followed as soon as the state has been entered (after its entry/ behaviour)"), true));
          break;
        case "time":
          details.push(cell("After (milliseconds)", input(String(c.timeEvent.ms), (f) => {
            const ms = Math.round(Number(f.value));
            if (f.value.trim() !== "" && Number.isFinite(ms) && ms >= 0) c.timeEvent.ms = ms;
          }), true, "how long in this state before the arrow is followed (1000 = 1 second)"));
          break;
        case "frame":
          details.push(cell("", text(c.frameEvent.onEnterFrame ? "every animation frame (a game loop): about 60 times a second" : "page load (Flash ON_LOAD, from an old file): happens straight away, like no event"), true));
          break;
        case "custom":
          details.push(cell("Custom event name", placeholder(input(c.customEvent.eventName, (f) => {
            const caret = f.selectionStart;
            f.value = underScored(f.value);
            f.setSelectionRange(caret, caret);
            c.customEvent.eventName = f.value;
          }), "e.g. GAME OVER"), true, "e.g. GAME OVER or coinInserted - your own code fires it"));
          break;
        case "web":
          details.push(...this.webEventCells(c.webEvent, () => this.show()));
          break;
      }
      const guard = cell("Guard", placeholder(input(c.guard, (f) => c.guard = f.value), "condition"), true, "the arrow is only followed if this is true, e.g. gumballs > 0, or else");
      if (c.leavesInitial) {
        this.body.append(title("Arrow from the initial state", "Says which state the game starts in."), row(cell("Instance ID", text("stateTransition_" + index)), cell("", el("div", {
          className: "prop-note"
        }, [
          `The game starts in ${c.end.state?.isRealState ? c.end.state.stateName : "the state this arrow points to"}.`
        ]), true)));
        return;
      }
      if (c.leavesChoice) {
        this.body.append(title("Arrow out of a choice", "Followed straight after the arrow coming in, if its guard is true."), row(cell("Instance ID", text("stateTransition_" + index)), guard, actionsCell(c)));
        return;
      }
      this.body.append(title("Transition", "An arrow: when its event happens (and its guard is true), the state changes."), row(cell("Event", eventChooser, false, "what makes this arrow happen"), ...details), row(guard, actionsCell(c)), row(cell("Instance ID", text("stateTransition_" + index))));
    }
    /** NEW (version 3): a web event's fields - the event type, its target, and for keys the key and modifiers */
    webEventCells(w, redraw) {
      const entry2 = paletteEntry(w.on);
      const cells = [];
      const type = input(w.on, (f) => {
        w.on = f.value.trim();
      });
      type.addEventListener("change", redraw);
      cells.push(cell("Event type", type, false, entry2 ? entry2.description : "not in the palette - fine, if the target fires an event of this type"));
      const target = input(w.target, (f) => {
        w.target = f.value.trim();
      });
      const ids = targetSuggestions(this.editor);
      const list2 = el("datalist", {
        id: "event-targets"
      }, ids.map((id) => el("option", {
        value: id
      })));
      target.setAttribute("list", list2.id);
      target.placeholder = "element id";
      cells.push(cell("Target", el("div", {}, [
        target,
        list2
      ]), true, entry2?.target === "media" ? "the <video> or <audio> element's id" : "an element's id, or document, or window"));
      if (isKeyEvent(w.on)) {
        const key = input(w.keyCode !== null ? "" : w.key, (f) => {
          w.key = f.value === " " ? "Space" : f.value;
          w.keyCode = null;
        });
        key.classList.add("keycode");
        key.placeholder = w.keyCode !== null ? "code " + w.keyCode : "any key";
        const press = el("button", {
          type: "button",
          className: "secondary",
          textContent: "press a key\u2026"
        });
        press.addEventListener("click", () => {
          press.textContent = "press it now";
          key.focus();
          key.addEventListener("keydown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if ([
              "Control",
              "Meta",
              "Shift",
              "Alt"
            ].includes(e.key)) return;
            w.key = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toLowerCase() : e.key;
            w.keyCode = null;
            const mods = [
              e.ctrlKey || e.metaKey ? "mod" : "",
              e.shiftKey && e.key.length > 1 ? "shift" : "",
              e.altKey ? "alt" : ""
            ];
            w.mod = normalizeMod(mods.join("+"));
            redraw();
          });
        });
        const modifiers = el("div", {
          className: "checks"
        }, MODIFIERS.map((m) => {
          const box = el("input", {
            type: "checkbox",
            checked: normalizeMod(w.mod).split("+").includes(m)
          });
          box.addEventListener("change", () => {
            const others = normalizeMod(w.mod).split("+").filter((x) => x && x !== m);
            w.mod = normalizeMod([
              ...others,
              ...box.checked ? [
                m
              ] : []
            ].join("+"));
          });
          return el("label", {}, [
            box,
            " " + (m === "mod" ? "mod (Ctrl / Cmd)" : m)
          ]);
        }));
        cells.push(cell("Key", el("div", {
          className: "inline"
        }, [
          key,
          press
        ]), false, "e.g. Escape, ArrowLeft, d, Space"), cell("With", modifiers));
      }
      return cells;
    }
  };
  function eventSelect(c, onChoose) {
    const current = c.eventGroup === "web" ? "web:" + c.webEvent.on : c.eventGroup;
    const option = (value, label) => el("option", {
      value,
      textContent: label,
      selected: value === current
    });
    const select = el("select", {}, [
      el("optgroup", {
        label: "Not a page event"
      }, [
        option("completion", "none (completion)"),
        option("time", "after (time)"),
        option("frame", c.frameEvent.onEnterFrame ? "animation frame" : "page load (old ON_LOAD)"),
        option("custom", "custom event (fired by the page's code)")
      ]),
      ...CATEGORIES.map((category) => el("optgroup", {
        label: category
      }, PALETTE.filter((e) => e.category === category).map((e) => option("web:" + e.on, e.on))))
    ]);
    if (c.eventGroup === "web" && !paletteEntry(c.webEvent.on)) {
      select.append(el("optgroup", {
        label: "Other"
      }, [
        option(current, c.webEvent.on || "(type it in)")
      ]));
    }
    select.addEventListener("change", () => onChoose(select.value));
    return select;
  }
  function chooseEvent(c, value) {
    if (!value.startsWith("web:")) {
      c.eventGroup = value;
      if (value === "frame") c.frameEvent.onEnterFrame = true;
      return;
    }
    c.eventGroup = "web";
    const w = c.webEvent;
    w.on = value.slice(4);
    const entry2 = paletteEntry(w.on);
    if (entry2?.target === "window" || entry2?.target === "document") w.target = entry2.target;
    else if (!w.onElement) w.target = "";
    if (!isKeyEvent(w.on)) {
      w.key = "";
      w.mod = "";
      w.keyCode = null;
    }
  }
  function targetSuggestions(editor2) {
    const ids = /* @__PURE__ */ new Set([
      "document",
      "window"
    ]);
    for (const c of editor2.diagram.connectors) {
      if (c.eventGroup === "web" && c.webEvent.onElement) ids.add(c.webEvent.targetId);
    }
    for (const s of editor2.diagram.states) if (s.screen) ids.add(s.screen);
    return [
      ...ids
    ];
  }
  function actionsCell(c) {
    return cell("Actions", placeholder(input(actionsText(c.actions), (f) => c.actions = parseActions(f.value)), "action, action \u2026"), true, "done as the arrow is followed (comma separated); name(p) gets the mouse position, name(e) the browser event");
  }
  function el(tag, props, children = []) {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  }
  function title(what, about) {
    return el("div", {
      className: "prop-heading"
    }, [
      el("span", {
        className: "prop-title"
      }, [
        "Properties"
      ]),
      el("span", {
        className: "prop-what"
      }, [
        what
      ]),
      el("span", {
        className: "prop-about"
      }, [
        about
      ])
    ]);
  }
  function row(...cells) {
    return el("div", {
      className: "prop-row"
    }, cells);
  }
  function cell(label, content, grow = false, help = "") {
    const children = [];
    if (label) children.push(el("label", {
      className: "field"
    }, [
      label
    ]));
    children.push(content);
    if (help) children.push(el("div", {
      className: "prop-help"
    }, [
      help
    ]));
    return el("div", {
      className: "prop-cell" + (grow ? " grow" : "")
    }, children);
  }
  function placeholder(field, text2) {
    field.placeholder = text2;
    return field;
  }
  function text(value) {
    return el("div", {
      className: "prop-value"
    }, [
      value
    ]);
  }
  function input(value, onChange, readOnly = false) {
    const field = el("input", {
      type: "text",
      value,
      readOnly,
      spellcheck: false
    });
    field.addEventListener("input", () => onChange(field));
    return field;
  }

  // src/view/Minimap.ts
  var MINIMAP_WIDTH = 200;
  var MINIMAP_HEIGHT = 150;
  var PADDING = 60;
  function minimapMapping(bounds, width, height) {
    const w = bounds.width + 2 * PADDING;
    const h = bounds.height + 2 * PADDING;
    const scale = Math.min(width / w, height / h);
    return {
      scale,
      x: width / 2 - bounds.x * scale,
      y: height / 2 - bounds.y * scale
    };
  }
  function minimapToDiagram(m, p) {
    return {
      x: (p.x - m.x) / m.scale,
      y: (p.y - m.y) / m.scale
    };
  }
  var Minimap = class {
    svg;
    box;
    mapping;
    /**
     * @param svg where to draw it
     * @param box what to hide while the diagram is empty (the minimap and its minimise button)
     */
    constructor(svg2, box = svg2) {
      this.svg = svg2;
      this.box = box;
      this.mapping = null;
    }
    /**
     * Draw the diagram, and the box showing what is on a screenWidth x screenHeight screen at the moment.
     * The minimap is hidden while the diagram is empty.
     */
    draw(diagram, viewport, screenWidth, screenHeight) {
      const boxes = [
        ...diagram.states
      ];
      for (const c of diagram.connectors) {
        for (const p of [
          c.start.point,
          c.end.point
        ]) boxes.push({
          x: p.x,
          y: p.y,
          width: 0,
          height: 0
        });
      }
      const bounds = boundsOf(boxes);
      this.box.style.display = bounds ? "" : "none";
      if (!bounds) {
        this.mapping = null;
        return;
      }
      const m = minimapMapping(bounds, MINIMAP_WIDTH, MINIMAP_HEIGHT);
      this.mapping = m;
      let s = "";
      for (const c of diagram.connectors) {
        const p1 = c.start.point;
        const p2 = c.end.point;
        const q = c.control;
        s += c.isCurved ? `<path class="mm-connector" d="M${p1.x} ${p1.y} Q${q.x} ${q.y} ${p2.x} ${p2.y}"/>` : `<path class="mm-connector" d="M${p1.x} ${p1.y} L${p2.x} ${p2.y}"/>`;
      }
      for (const state of diagram.states) {
        if (state.isChoice) {
          const points = [
            Compass.NORTH,
            Compass.EAST,
            Compass.SOUTH,
            Compass.WEST
          ].map((c) => state.compassPoint(c));
          s += `<polygon class="mm-choice" points="${points.map((p) => `${p.x},${p.y}`).join(" ")}"/>`;
        } else if (state.isInitial) {
          s += `<circle class="mm-initial" cx="${state.x}" cy="${state.y}" r="${state.width / 2}"/>`;
        } else if (state.isTerminate) {
          const d = state.width * 0.35;
          s += `<path class="mm-terminate" d="M${state.x - d} ${state.y - d} L${state.x + d} ${state.y + d} M${state.x + d} ${state.y - d} L${state.x - d} ${state.y + d}"/>`;
        } else if (state.isFinal) {
          s += `<circle class="mm-final" cx="${state.x}" cy="${state.y}" r="${state.width / 2}"/>`;
        } else {
          s += `<rect class="mm-state" x="${state.x - state.width / 2}" y="${state.y - state.height / 2}" width="${state.width}" height="${state.height}" rx="${state.cornerRadius}"/>`;
        }
      }
      const topLeft = viewport.toDiagram({
        x: 0,
        y: 0
      });
      const bottomRight = viewport.toDiagram({
        x: screenWidth,
        y: screenHeight
      });
      s += `<rect class="mm-view" x="${topLeft.x}" y="${topLeft.y}" width="${bottomRight.x - topLeft.x}" height="${bottomRight.y - topLeft.y}"/>`;
      this.svg.innerHTML = `<g transform="translate(${m.x} ${m.y}) scale(${m.scale})">${s}</g>`;
    }
    /** The diagram point shown at a mouse event's position on the minimap (null if nothing is shown). */
    toDiagram(e) {
      if (!this.mapping) return null;
      const r = this.svg.getBoundingClientRect();
      return minimapToDiagram(this.mapping, {
        x: e.clientX - r.left,
        y: e.clientY - r.top
      });
    }
  };

  // src/main.ts
  function byId(id) {
    const e = document.getElementById(id);
    if (!e) throw new Error(`index.html has no element with id="${id}"`);
    return e;
  }
  var svg = document.getElementById("diagram");
  var diagramView = new DiagramView(svg);
  var minimapSvg = document.getElementById("minimap");
  var minimapBox = byId("minimap-box");
  var minimap = new Minimap(minimapSvg, minimapBox);
  var BrowserView = class {
    properties;
    drawScene() {
      diagramView.draw(editor.diagram, editor.look);
      const r = svg.getBoundingClientRect();
      minimap.draw(editor.diagram, diagramView.viewport, r.width, r.height);
    }
    showProperties() {
      this.properties.show();
    }
    showExportScreen(xml) {
      byId("xml-output").value = xml;
      byId("diagram-screen").hidden = true;
      byId("export-screen").hidden = false;
    }
    showDiagramScreen() {
      byId("export-screen").hidden = true;
      byId("diagram-screen").hidden = false;
    }
    stateChanged(newState) {
      const toolFor = {
        STATE_SELECT: "selectButton",
        STATE_STATE_DRAG: "newStateButton",
        STATE_STATE_RESIZE: "selectButton",
        STATE_CONNECTOR_DRAG: "newConnectorButton",
        STATE_CONNECTOR_MOVE: "newConnectorButton"
      };
      for (const tool of document.querySelectorAll(".tool")) {
        tool.classList.toggle("active", tool.id === toolFor[newState.name]);
      }
      svg.style.cursor = newState.name === "STATE_SELECT" ? "default" : newState.name === "STATE_STATE_RESIZE" ? "nwse-resize" : "move";
    }
    showMessage(text2) {
      byId("message-text").textContent = text2;
      byId("message-dialog").showModal();
    }
    diagramLoaded() {
      fitToScreen();
    }
    /** the import dialog (not one of the editor's states: the import happens when it closes) */
    openImportDialog() {
      importText.value = "";
      exampleSelect.value = "";
      importDialog.showModal();
    }
  };
  var view = new BrowserView();
  var editor = new StateGenEditor(view);
  view.properties = new PropertiesPanel(byId("properties"), editor);
  view.showProperties();
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    document.activeElement?.blur();
    editor.mouseDown(diagramView.toDiagram(e));
  });
  globalThis.addEventListener("pointermove", (e) => {
    if (panning && (e.buttons & MIDDLE_BUTTON) === 0) stopPanning();
    if (panning) {
      diagramView.viewport.panBy(e.clientX - panning.x, e.clientY - panning.y);
      panning = {
        x: e.clientX,
        y: e.clientY
      };
      viewChanged();
    }
    editor.mouseMove(diagramView.toDiagram(e));
  });
  globalThis.addEventListener("pointerup", (e) => {
    if (e.button === 1) {
      stopPanning();
      return;
    }
    editor.mouseUp(diagramView.toDiagram(e));
    checkForDoubleClick(e);
  });
  var panning = null;
  var MIDDLE_BUTTON = 4;
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    panning = {
      x: e.clientX,
      y: e.clientY
    };
    svg.classList.add("panning");
  });
  svg.addEventListener("mousedown", (e) => {
    if (e.button === 1) e.preventDefault();
  });
  svg.addEventListener("auxclick", (e) => e.preventDefault());
  function stopPanning() {
    panning = null;
    svg.classList.remove("panning");
  }
  globalThis.addEventListener("mouseup", (e) => {
    if (e.button === 1) stopPanning();
  });
  globalThis.addEventListener("pointercancel", stopPanning);
  globalThis.addEventListener("blur", stopPanning);
  globalThis.addEventListener("wheel", (e) => {
    if (byId("diagram-screen").hidden || !overDiagram(e)) return;
    e.preventDefault();
    const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    diagramView.viewport.zoomAt(diagramView.toScreen(e), Math.exp(-pixels * 15e-4));
    viewChanged();
  }, {
    passive: false
  });
  new ResizeObserver(() => view.drawScene()).observe(svg);
  var minimapButton = byId("minimapButton");
  function minimiseMinimap(minimised) {
    minimapBox.classList.toggle("minimised", minimised);
    minimapButton.textContent = minimised ? "map" : "\u2212";
    minimapButton.title = minimised ? "show the minimap" : "minimise the minimap";
    minimapButton.setAttribute("aria-expanded", String(!minimised));
    try {
      localStorage.setItem("stateGEN.minimapMinimised", String(minimised));
    } catch {
    }
  }
  minimapButton.addEventListener("click", () => minimiseMinimap(!minimapBox.classList.contains("minimised")));
  try {
    if (localStorage.getItem("stateGEN.minimapMinimised") === "true") minimiseMinimap(true);
  } catch {
  }
  var minimapDragging = false;
  function moveViewTo(e) {
    const p = minimap.toDiagram(e);
    if (!p) return;
    const r = svg.getBoundingClientRect();
    diagramView.viewport.centerOn(p, r.width, r.height);
    viewChanged();
  }
  minimapSvg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    moveViewTo(e);
    minimapDragging = true;
    try {
      minimapSvg.setPointerCapture(e.pointerId);
    } catch {
    }
  });
  minimapSvg.addEventListener("pointermove", (e) => {
    if (minimapDragging) moveViewTo(e);
  });
  for (const type of [
    "pointerup",
    "pointercancel"
  ]) {
    minimapSvg.addEventListener(type, () => minimapDragging = false);
  }
  function overDiagram(e) {
    const r = svg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return false;
    const on = document.elementFromPoint(e.clientX, e.clientY);
    return !on || on === svg || svg.contains(on) || on === document.body || on === document.documentElement;
  }
  function viewChanged() {
    view.drawScene();
    byId("zoom100Button").textContent = `${Math.round(diagramView.viewport.scale * 100)}%`;
  }
  function fitToScreen(maxScale) {
    view.drawScene();
    const keepClear = svg.getBoundingClientRect().right - byId("tools").getBoundingClientRect().left;
    diagramView.fit(editor.diagram, keepClear, maxScale);
    viewChanged();
  }
  var DOUBLE_CLICK_MS = 400;
  var DOUBLE_CLICK_PIXELS = 6;
  var lastClick = null;
  function checkForDoubleClick(e) {
    if (e.target !== svg && !svg.contains(e.target)) return;
    const state = editor.selectedState;
    const p = diagramView.toDiagram(e);
    if (!state || !state.contains(p)) {
      lastClick = null;
      return;
    }
    const click = {
      time: e.timeStamp,
      x: e.clientX,
      y: e.clientY,
      state
    };
    const isDouble = lastClick !== null && lastClick.state === state && click.time - lastClick.time < DOUBLE_CLICK_MS && Math.abs(click.x - lastClick.x) < DOUBLE_CLICK_PIXELS && Math.abs(click.y - lastClick.y) < DOUBLE_CLICK_PIXELS;
    if (isDouble) {
      view.properties.focusStateName();
      lastClick = null;
    } else {
      lastClick = click;
    }
  }
  function onPress(id, handler) {
    byId(id).addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      handler(e);
    });
  }
  onPress("selectButton", () => editor.selectTool());
  onPress("newStateButton", (e) => editor.newStateTool(diagramView.toDiagram(e)));
  onPress("newChoiceButton", (e) => editor.newChoiceTool(diagramView.toDiagram(e)));
  onPress("newInitialButton", (e) => editor.newInitialTool(diagramView.toDiagram(e)));
  onPress("newFinalButton", (e) => editor.newFinalTool(diagramView.toDiagram(e)));
  onPress("newTerminateButton", (e) => editor.newTerminateTool(diagramView.toDiagram(e)));
  onPress("newConnectorButton", (e) => editor.newConnectorTool(diagramView.toDiagram(e)));
  byId("tidyUpButton").addEventListener("click", () => editor.tidyUp());
  byId("exportXMLButton").addEventListener("click", () => editor.exportXml());
  byId("backToDiagramButton").addEventListener("click", () => editor.backToDiagram());
  byId("zoomInButton").addEventListener("click", () => {
    diagramView.viewport.zoomAt(diagramView.screenMiddle, ZOOM_STEP);
    viewChanged();
  });
  byId("zoomOutButton").addEventListener("click", () => {
    diagramView.viewport.zoomAt(diagramView.screenMiddle, 1 / ZOOM_STEP);
    viewChanged();
  });
  byId("zoom100Button").addEventListener("click", () => {
    diagramView.viewport.zoomTo(1, diagramView.screenMiddle);
    viewChanged();
  });
  byId("zoomFitButton").addEventListener("click", () => fitToScreen());
  byId("behavioursButton").addEventListener("click", (e) => {
    DiagramState.showBehaviours = !DiagramState.showBehaviours;
    const button = e.currentTarget;
    button.setAttribute("aria-pressed", String(DiagramState.showBehaviours));
    button.title = `${DiagramState.showBehaviours ? "hide" : "show"} the states' entry/ do/ exit/ behaviours`;
    viewChanged();
  });
  globalThis.addEventListener("keydown", (e) => {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (typing) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      editor.deleteKey();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      editor.duplicateKey();
    }
  });
  var importDialog = byId("import-dialog");
  var importText = byId("import-text");
  var exampleSelect = byId("import-example");
  for (const [i, example] of EXAMPLES.entries()) exampleSelect.add(new Option(example.title, String(i)));
  exampleSelect.addEventListener("change", () => {
    if (exampleSelect.value !== "") importText.value = EXAMPLES[Number(exampleSelect.value)].xml;
  });
  byId("import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) importText.value = await file.text();
  });
  byId("importXMLButton").addEventListener("click", () => view.openImportDialog());
  importDialog.addEventListener("close", () => {
    if (importDialog.returnValue === "import" && importText.value.trim()) editor.importXml(importText.value);
  });
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(byId(button.dataset.copy).value);
      button.textContent = "copied!";
      setTimeout(() => button.textContent = "copy", 1200);
    });
  }
  for (const button of document.querySelectorAll("[data-download]")) {
    button.addEventListener("click", () => {
      const blob = new Blob([
        byId(button.dataset.download).value
      ], {
        type: "text/plain"
      });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: button.dataset.filename
      });
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  editor.load();
  var frame = () => {
    editor.enterFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  if (editor.diagram.states.length > 0) fitToScreen();
})();
