// stateGEN-TS - the browser side: connects the page (index.html) to the editor.
//
//   src/model/    the diagram: states, connectors, transition events (no State pattern, just data)
//   src/editor/   the editor - THE STATE PATTERN: StateGenEditor (Context) + EditorState and its subclasses
//   src/io/       game.xml export/import
//   src/view/     drawing the diagram and the properties panel
//
// Every mouse/keyboard/button event below is simply passed to the editor, which passes it to its current state.

import type { Editor, EditorView } from "./editor/Editor.ts";
import { StateGenEditor } from "./editor/StateGenEditor.ts";
import { EXAMPLES } from "./examples.ts";
import { DiagramState } from "./model/DiagramState.ts";
import { DiagramView } from "./view/DiagramView.ts";
import { PropertiesPanel } from "./view/PropertiesPanel.ts";
import { Minimap } from "./view/Minimap.ts";
import { ZOOM_STEP } from "./view/Viewport.ts";

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`index.html has no element with id="${id}"`);
  return e as T;
}

const svg = document.getElementById("diagram") as unknown as SVGSVGElement;
const diagramView = new DiagramView(svg);
const minimapSvg = document.getElementById("minimap") as unknown as SVGSVGElement;
const minimapBox = byId("minimap-box");
const minimap = new Minimap(minimapSvg, minimapBox);

/** The editor's view of the page. */
class BrowserView implements EditorView {
  properties!: PropertiesPanel;

  drawScene(): void {
    diagramView.draw(editor.diagram, editor.look);
    const r = svg.getBoundingClientRect();
    minimap.draw(editor.diagram, diagramView.viewport, r.width, r.height);
  }

  showProperties(): void {
    this.properties.show();
  }

  showExportScreen(xml: string): void {
    byId<HTMLTextAreaElement>("xml-output").value = xml;
    byId("diagram-screen").hidden = true;
    byId("export-screen").hidden = false;
  }

  showDiagramScreen(): void {
    byId("export-screen").hidden = true;
    byId("diagram-screen").hidden = false;
  }

  stateChanged(newState: { readonly name: string }): void {
    // show which tool is "down"
    const toolFor: Record<string, string> = {
      STATE_SELECT: "selectButton",
      STATE_STATE_DRAG: "newStateButton",
      STATE_STATE_RESIZE: "selectButton",
      STATE_CONNECTOR_DRAG: "newConnectorButton",
      STATE_CONNECTOR_MOVE: "newConnectorButton",
    };
    for (const tool of document.querySelectorAll(".tool")) {
      tool.classList.toggle("active", tool.id === toolFor[newState.name]);
    }
    svg.style.cursor = newState.name === "STATE_SELECT"
      ? "default"
      : newState.name === "STATE_STATE_RESIZE"
      ? "nwse-resize"
      : "move";
  }

  showMessage(text: string): void {
    byId("message-text").textContent = text;
    byId<HTMLDialogElement>("message-dialog").showModal();
  }

  diagramLoaded(): void {
    fitToScreen(); // all of it on screen, as large as it will go
  }

  /** the import dialog (not one of the editor's states: the import happens when it closes) */
  openImportDialog(): void {
    importText.value = "";
    exampleSelect.value = "";
    importDialog.showModal();
  }
}

const view = new BrowserView();
const editor: Editor = new StateGenEditor(view);
view.properties = new PropertiesPanel(byId("properties"), editor);
view.showProperties();

// ----- mouse: the diagram, plus moves/releases anywhere (you may drag off a toolbar button onto the diagram)
svg.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  (document.activeElement as HTMLElement | null)?.blur(); // so Delete isn't typed into a properties field
  editor.mouseDown(diagramView.toDiagram(e));
});
globalThis.addEventListener("pointermove", (e) => {
  if (panning && (e.buttons & MIDDLE_BUTTON) === 0) stopPanning(); // (missed the release)
  if (panning) {
    diagramView.viewport.panBy(e.clientX - panning.x, e.clientY - panning.y);
    panning = { x: e.clientX, y: e.clientY };
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

// ----- pan and zoom (NEW): drag with the middle mouse button to move everything, turn the wheel to zoom.
// These only change how the diagram is shown (DiagramView.viewport), so they don't go through the editor's
// states - whatever tool you are using carries on as before.
let panning: { x: number; y: number } | null = null;
/** the middle button's bit in a pointer event's `buttons` */
const MIDDLE_BUTTON = 4;
svg.addEventListener("pointerdown", (e) => {
  if (e.button !== 1) return;
  e.preventDefault(); // no auto-scroll (Windows) or paste (Linux)
  panning = { x: e.clientX, y: e.clientY };
  svg.classList.add("panning");
});
svg.addEventListener("mousedown", (e) => {
  if (e.button === 1) e.preventDefault();
});
svg.addEventListener("auxclick", (e) => e.preventDefault());
/** The pan is over. Browsers tell us in different ways, so any of them will do. */
function stopPanning(): void {
  panning = null;
  svg.classList.remove("panning");
}
globalThis.addEventListener("mouseup", (e) => {
  if (e.button === 1) stopPanning();
});
globalThis.addEventListener("pointercancel", stopPanning);
globalThis.addEventListener("blur", stopPanning);
// The wheel is listened for on the whole window (not just the <svg>), so it still zooms whatever element
// the browser sends it to after a middle-button drag - as long as the mouse is over the diagram.
globalThis.addEventListener("wheel", (e) => {
  if (byId("diagram-screen").hidden || !overDiagram(e)) return;
  e.preventDefault();
  const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  diagramView.viewport.zoomAt(diagramView.toScreen(e), Math.exp(-pixels * 0.0015));
  viewChanged();
}, { passive: false });

// NEW: when the diagram's area changes size (the window, or the Properties panel minimised or opened), draw
// it again so the minimap's view box is right.
new ResizeObserver(() => view.drawScene()).observe(svg);

// ----- the minimap (NEW): click or drag on it to move the view there (only the view changes, like panning)
// Its button minimises it (and shows it again). The page remembers which, if the browser lets it.
const minimapButton = byId("minimapButton");
function minimiseMinimap(minimised: boolean): void {
  minimapBox.classList.toggle("minimised", minimised);
  minimapButton.textContent = minimised ? "map" : "\u2212";
  minimapButton.title = minimised ? "show the minimap" : "minimise the minimap";
  minimapButton.setAttribute("aria-expanded", String(!minimised));
  try {
    localStorage.setItem("stateGEN.minimapMinimised", String(minimised));
  } catch { /* storage blocked - it just isn't remembered */ }
}
minimapButton.addEventListener("click", () => minimiseMinimap(!minimapBox.classList.contains("minimised")));
try {
  if (localStorage.getItem("stateGEN.minimapMinimised") === "true") minimiseMinimap(true);
} catch { /* storage blocked */ }
let minimapDragging = false;
function moveViewTo(e: PointerEvent): void {
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
    minimapSvg.setPointerCapture(e.pointerId); // keep dragging even if the mouse leaves the minimap
  } catch { /* no such pointer (e.g. a pretend event) - dragging still works while over the minimap */ }
});
minimapSvg.addEventListener("pointermove", (e) => {
  if (minimapDragging) moveViewTo(e);
});
for (const type of ["pointerup", "pointercancel"]) {
  minimapSvg.addEventListener(type, () => (minimapDragging = false));
}

/** true if the mouse is over the diagram, not over the Tools palette or Properties panel */
function overDiagram(e: MouseEvent): boolean {
  const r = svg.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return false;
  const on = document.elementFromPoint(e.clientX, e.clientY);
  return !on || on === svg || svg.contains(on) || on === document.body || on === document.documentElement;
}

/** Redraw, and show the zoom on the 100% button. */
function viewChanged(): void {
  view.drawScene();
  byId("zoom100Button").textContent = `${Math.round(diagramView.viewport.scale * 100)}%`;
}

/** Fit the whole diagram on screen, to the left of the Tools palette. */
function fitToScreen(maxScale?: number): void {
  view.drawScene(); // (so the labels' places are up to date)
  const keepClear = svg.getBoundingClientRect().right - byId("tools").getBoundingClientRect().left;
  diagramView.fit(editor.diagram, keepClear, maxScale);
  viewChanged();
}

// Double-click a state to rename it: select all of its name in the Properties panel, so typing replaces it.
// The browser's own "dblclick" event isn't used, because the SVG is redrawn every frame, so the two clicks land
// on different elements, and Safari/WebKit (Celbridge) then doesn't send a dblclick.
const DOUBLE_CLICK_MS = 400;
const DOUBLE_CLICK_PIXELS = 6;
let lastClick: { time: number; x: number; y: number; state: unknown } | null = null;
function checkForDoubleClick(e: PointerEvent): void {
  if (e.target !== svg && !svg.contains(e.target as Node)) return;
  const state = editor.selectedState;
  const p = diagramView.toDiagram(e);
  if (!state || !state.contains(p)) {
    lastClick = null;
    return;
  }
  const click = { time: e.timeStamp, x: e.clientX, y: e.clientY, state };
  const isDouble = lastClick !== null && lastClick.state === state &&
    click.time - lastClick.time < DOUBLE_CLICK_MS &&
    Math.abs(click.x - lastClick.x) < DOUBLE_CLICK_PIXELS && Math.abs(click.y - lastClick.y) < DOUBLE_CLICK_PIXELS;
  if (isDouble) {
    view.properties.focusStateName();
    lastClick = null;
  } else {
    lastClick = click;
  }
}

// ----- toolbar: the tools fire when PRESSED (onPress), the xml buttons when RELEASED (onRelease), as in Flash
function onPress(id: string, handler: (e: PointerEvent) => void): void {
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
// NEW: show or hide the states' entry/ do/ exit/ behaviours (a state showing them is taller)
byId("behavioursButton").addEventListener("click", (e) => {
  DiagramState.showBehaviours = !DiagramState.showBehaviours;
  // (aria-pressed picks the button's picture: states now -> states after a click. Not the "active" class,
  // which stateChanged() sets for the Tools.)
  const button = e.currentTarget as HTMLElement;
  button.setAttribute("aria-pressed", String(DiagramState.showBehaviours));
  button.title = `${DiagramState.showBehaviours ? "hide" : "show"} the states' entry/ do/ exit/ behaviours`;
  viewChanged();
});

// ----- keys: Delete or Backspace delete the selected object (the Flash version used # - key code 222),
// Ctrl/Cmd-D duplicates it.
globalThis.addEventListener("keydown", (e) => {
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  if (typing) return;
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    editor.deleteKey();
  }
  // NEW: Ctrl-D (Cmd-D on a Mac) duplicates the selected object. (preventDefault: not the browser's
  // "bookmark this page")
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
    e.preventDefault();
    editor.duplicateKey();
  }
});

// ----- import dialog
const importDialog = byId<HTMLDialogElement>("import-dialog");
const importText = byId<HTMLTextAreaElement>("import-text");
const exampleSelect = byId<HTMLSelectElement>("import-example");
for (const [i, example] of EXAMPLES.entries()) exampleSelect.add(new Option(example.title, String(i)));
exampleSelect.addEventListener("change", () => {
  if (exampleSelect.value !== "") importText.value = EXAMPLES[Number(exampleSelect.value)].xml;
});
byId<HTMLInputElement>("import-file").addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) importText.value = await file.text();
});
byId("importXMLButton").addEventListener("click", () => view.openImportDialog());
importDialog.addEventListener("close", () => {
  if (importDialog.returnValue === "import" && importText.value.trim()) editor.importXml(importText.value);
});

// ----- export screen: copy / download buttons
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(byId<HTMLTextAreaElement>(button.dataset.copy!).value);
    button.textContent = "copied!";
    setTimeout(() => (button.textContent = "copy"), 1200);
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-download]")) {
  button.addEventListener("click", () => {
    const blob = new Blob([byId<HTMLTextAreaElement>(button.dataset.download!).value], { type: "text/plain" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: button.dataset.filename,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

// ----- start: EVENT_ON_LOAD, then EVENT_ON_ENTER_FRAME every animation frame
editor.load();
const frame = (): void => {
  editor.enterFrame();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
if (editor.diagram.states.length > 0) fitToScreen();
