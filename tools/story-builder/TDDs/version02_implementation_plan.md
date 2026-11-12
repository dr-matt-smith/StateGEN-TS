# Story Builder version 2: implementation plan

This plan delivers [version02_design.md](version02_design.md). It was agreed in discussion on 3 November 2026.

## Status (3 November 2026)

All four phases are implemented, including the optional choice links. Tested in Celbridge on **macOS only**. Windows
(WebView2) is still to be tested; see the checks under each phase.

Results:

- **Phase 1:** the slide fills the play view. The 1100px cap is gone.
- **Phase 2:** Celbridge's macOS WebView has **no Fullscreen API at all**: neither `requestFullscreen` nor
  `webkitRequestFullscreen` exists. On macOS the button always uses fill-the-editor. Windows is untested, and should get
  true fullscreen. Tested on macOS: the button, F, Esc (leaves fullscreen and keeps playing; a second Esc does nothing),
  the arrow keys and End.
- **Phase 3:** Standard was set to 1× at 0.8, the only candidate that met the 40% target (measurements below). Lowering
  the JPEG quality saves little, because the screenshots dominate the size; the scale is what counts.
- **Phase 4:** checked by reading exported PDFs back with pdf.js:
  - the text comes out complete and in reading order;
  - the text boxes sit over the visible words;
  - accented letters survive, curly quotes and dashes become plain ASCII, and arrows and maths symbols are dropped;
  - Shiki-highlighted code reads back as one line;
  - choice links jump to the right page, and web links open their URL.

  Not yet checked: selecting text by hand in Preview, Acrobat and a browser's PDF viewer.

## Scope

**In scope**

- **2.1 PDF export:** text you can select, search and copy, and smaller files.
- **2.2 Play mode:** slides use all the space available, a fullscreen button, and keyboard controls.

**Out of scope (decided)**

- **Working offline.** Marp, its plugins (Shiki, Mermaid, KaTeX), html2canvas and jsPDF stay on esm.sh. Play, preview
  and PDF export still need an internet connection the first time they are used in a session. Nothing is vendored, so
  the open questions about the Mermaid/elkjs EPL-2.0 licence and the size of Shiki's grammars don't arise.
- **A fully vector PDF**, with slides drawn as PDF text and shapes. Each slide stays a picture, and the selectable text
  is added on top of it.
- **Rendering changes.** Slides look the same in the PDF as in v1, including the known limit that `<!-- fit -->` text
  and auto-scaled code blocks appear at their natural size.

## Order of work

| Phase | Item                                      | Size            |
| ----- | ----------------------------------------- | --------------- |
| 1     | Play view fills the space available (CSS) | Small           |
| 2     | Fullscreen button and keyboard controls   | Small to medium |
| 3     | Smaller PDFs                              | Small           |
| 4     | Selectable text in PDFs                   | Medium          |

Each phase can be released on its own. Phases 1 and 2 are the quick wins. Phase 3 comes before phase 4 so that the
effect of the text layer on file size can be measured against the new baseline.

---

## Phase 1: play view fills the space available

**Problem.** In play mode the slide can come out smaller than the node preview. `#play-content` is capped at
`max-width: 1100px` (`css/story.css`, `#play-content`), and `#play-view` adds 24px of padding, plus 56px on the side
where the previous/next buttons sit. The preview has no cap, so in a wide panel it is bigger.

**Change.**

1. Remove `max-width: 1100px` from `#play-content`. The slide's SVG has a `viewBox`, and
   `#play-text svg[data-marpit-svg]` already fills its box at `width/height: 100%`, so the slide keeps its shape and
   grows to whichever limit it reaches first, width or height.
2. Keep the 24px padding and the space kept for the nav buttons in normal play. Phase 2 removes them in fullscreen.

**Check.** In a wide document panel, a slide in play is at least as big as it is in the preview. In a tall, narrow panel
the slide is limited by width and centred vertically. Slides with a portrait `size` directive keep their shape.

---

## Phase 2: fullscreen button and keyboard controls

### Two levels of fullscreen

1. **True fullscreen:** `#play-view` calls `requestFullscreen()` (or `webkitRequestFullscreen()`), and the slide covers
   the whole screen.
2. **Fill the editor** (fallback): when the request is rejected or the API is missing, a `presenting` class on `<body>`
   hides `#toolbar`, and `#play-view` fills the whole document area.

Either way the play view drops its padding, so only the slide and its nav buttons are on screen.

Whether the host allows level 1 is unknown. WebView2 on Windows normally allows element fullscreen. WKWebView on macOS
only allows it if the host turns on `isElementFullscreenEnabled`. **The first task of this phase is to try it on both
platforms** and record the result here. The code handles either outcome, so the result changes only what we tell users,
not the design.

### Controls

- **Rail button:** a fullscreen button straight after Play/Stop (`bi-arrows-fullscreen`, or `bi-fullscreen-exit` while
  in fullscreen). It is enabled only while playing.
- **Button over the slide:** a small exit-fullscreen button in the corner of `#play-view`, opposite the nav buttons. In
  both levels the rail is hidden, so this is the way out with the mouse. It appears when the mouse moves and fades out
  after about 2 seconds of no movement.
- **Stop** (rail button or keyboard) leaves fullscreen first.

### Keyboard (while playing only)

| Key                       | Action                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `F`                       | Enter or leave fullscreen                                                                                                                                                                                      |
| `Esc`                     | Leave fullscreen. In true fullscreen the WebView handles it, and we only sync our state. In fill-the-editor mode we handle it. Outside fullscreen it does nothing, so a stray Esc doesn't stop a presentation. |
| `→`, `Page Down`, `Space` | Next node in the default sequence                                                                                                                                                                              |
| `←`, `Page Up`            | Previous node in the default sequence                                                                                                                                                                          |
| `Home` / `End`            | First / last node in the default sequence                                                                                                                                                                      |

Notes:

- A single `keydown` listener on `document`. It does nothing unless `isPlaying` is true, and ignores keys while focus is
  in an input, a textarea or an open `<dialog>`.
- Previous/next use the default sequence (`nodes` order), the same as the nav buttons, and **work even when the story
  hides the nav buttons** (`navigation.show` false). `fillSlideNav` only computes the targets when the buttons show, so
  a small `sequenceNeighbour(node, step)` helper is added and both use it.
- No keys are added outside play mode.

### State

- `isFullscreen` (true or fill-the-editor) and `fullscreenMode` (`'native'` or `'fill'`).
- `enterFullscreen()` / `exitFullscreen()` / `toggleFullscreen()`.
- A `fullscreenchange` (and `webkitfullscreenchange`) listener keeps the state in step when the user leaves true
  fullscreen with Esc or a system gesture.
- `stopPlay()` calls `exitFullscreen()`.
- `updateToolbarState()` enables the fullscreen button only while playing, and sets its icon and label.

### Files

- `index.html`: the rail button and the button over the slide.
- `css/story.css`: `body.presenting` (hide `#toolbar`, `#play-view` fills the document), `#play-view:fullscreen` and
  `body.presenting #play-view` (no padding, black or theme background), and the fading over-slide button.
- `js/story.js`: the state, the functions, the key handling, and `sequenceNeighbour()`.
- `localization/en.json`: `Story_Toolbar_Fullscreen`, `Story_Toolbar_ExitFullscreen`.

### Checks

- Enter and leave by button, `F` and `Esc`, on macOS and Windows. Stop while in fullscreen returns to the editor with
  the rail visible.
- Arrow keys, `Space`, `Home` and `End` move through the sequence, with nav buttons both shown and hidden.
- Clicking choice links still works in fullscreen.
- Typing in the node editor after stopping is not affected by the key handler.

---

## Phase 3: smaller PDFs

Now: each slide is a JPEG at 1.5× scale and quality 0.9 (`PDF_RENDER_SCALE`, `PDF_JPEG_QUALITY`), with jsPDF compression
off.

### Steps

1. **Measure a baseline.** Export `guide/teacher-slides.story` (screenshots) and a code-heavy story with v1 settings.
   Record file size and seconds taken in the table below.
2. **Turn on compression:** `new jsPDF({ ..., compress: true })`. It compresses page content streams, which matters
   little now but does for the phase 4 text layer.
3. **Share repeated images:** pass an alias to `addImage` (a short hash of the JPEG data), so slides that render
   identically are stored once.
4. **Add a quality choice to the save dialog:** _Standard_ (the default) and _High_. Each is a pair of scale and JPEG
   quality. A starting point is Standard = 1.25× at 0.8, and High = 2× at 0.9. Pick the final values from measurements:
   Standard should cut the baseline size by at least 40%, and code and small text should stay readable at 200% zoom. The
   choice is remembered for the session, the same way the last save location is (`lastPdfKey`).
5. **Set document properties:** `pdf.setProperties({ title: <story name>, creator: 'Celbridge Story Builder' })`.

### Files

`js/story.js` (constants become a `PDF_QUALITY` table, and the export loop and the dialog are updated), `index.html`
(the quality control in `#pdf-dialog`), `css/story.css`, and `localization/en.json` (`Story_PdfDialog_Quality`,
`..._Standard`, `..._High`).

### Measurements

Measured on 3 November 2026 on macOS, with v2's compression and text layer on for every row:

| guide/teacher-slides.story (19 slides, mostly screenshots) | Size               | Time  |
| ---------------------------------------------------------- | ------------------ | ----- |
| v1 image settings (1.5×, 0.9)                              | 3.88 MB            | 3.0 s |
| Candidate 1.25×, 0.8                                       | 2.63 MB (−32%)     | 2.0 s |
| Candidate 1.25×, 0.7                                       | 2.39 MB (−38%)     | –     |
| **Standard: 1×, 0.8**                                      | **1.90 MB (−51%)** | –     |
| **High: 2×, 0.9**                                          | **5.79 MB**        | 2.3 s |

At 200% zoom, 1× is slightly softer than 1.25×, but the small text in screenshots and code is still readable. No
code-heavy story was available in the project to measure.

---

## Phase 4: selectable text in PDFs

### Approach: an invisible text layer

Each page keeps its slide image. On top of it, jsPDF writes the slide's text with `renderingMode: 'invisible'`, placed
where the text is on the slide. The text can't be seen, but the PDF reader can select it, search it and copy it, the
same way scanned documents with OCR work.

### Collecting the text

The slide is already laid out as plain HTML in `.pdf-stage` before html2canvas paints it, so positions can be measured
from the DOM:

1. Walk the text nodes of the slide `<section>` with a `TreeWalker`. Skip whitespace-only nodes, and elements that
   aren't displayed or visible.
2. For each text node, measure each word with a `Range` (`getClientRects()`) relative to the section's
   `getBoundingClientRect()`.
3. Join neighbouring words on the same line (same top, within a pixel or two) into **runs**. One `pdf.text()` call per
   run keeps the file small and makes copied text read naturally.
4. Read each run's font size from `getComputedStyle(parent).fontSize`.

### Writing it

For each run, on the page just added:

- `x` = the run's left × `PX_TO_PT`, and `y` = its baseline (top + about 0.8 × font size) × `PX_TO_PT`.
- Font: Helvetica at the run's font size × `PX_TO_PT`.
- **Width match:** measure `pdf.getTextWidth(run)` and set `horizontalScale` to the run's measured width ÷ that width,
  so the selection highlight lines up with the text on the image.
- Runs are written in DOM order, so copied text follows reading order.

### Characters

jsPDF's standard fonts cover the WinAnsi (Western European) character set. **v2 uses only Latin-1**, a subset of it.
Curly quotes, dashes, the ellipsis and the bullet are written as their plain-ASCII forms (`PDF_PLAIN_TEXT`). Characters
outside it, such as arrows, maths symbols, CJK and emoji, are left out of the text layer. They still show in the image,
but can't be selected. This is recorded as a known limit. Embedding a Unicode TTF would lift it later.

### What isn't covered

- **Text inside SVGs** (Mermaid, nomnoml and KaTeX's SVG parts) isn't in the text layer in v2. A Mermaid/nomnoml
  `<text>` element could be added later from `getBBox()`.
- **Code blocks** are covered: Shiki outputs ordinary spans, which the walk picks up, and line breaks come from separate
  runs.

### Optional: working choice links

If time allows, each choice link (`<a>` to another node) becomes a PDF link to that node's page
(`pdf.link(x, y, w, h, { pageNumber })`). The PDF then works as a clickable story. Links to nodes that don't exist are
skipped.

### Files

`js/story.js`: a new `addTextLayer(pdf, slide)` called in the export loop after `addImage`, with helpers
`collectTextRuns(section)` and `toWinAnsi(text)`. The rendering itself doesn't change.

### Checks

Open exported PDFs in macOS Preview, Acrobat Reader and a browser's PDF viewer:

- Select a heading, a paragraph, a list and a code block. The highlight sits over the visible text, and copying gives
  the right words in the right order.
- Searching (Cmd/Ctrl+F) finds words on the correct page.
- Text with accents (é, ü) is selectable. Out-of-range characters are missing from the copied text, not shown as wrong
  characters.
- File size grows by less than 5% over the phase 3 result.
- (If done) choice links jump to the right page.

---

## Cross-cutting

- **Localisation:** every new string goes in `localization/en.json`, and new controls use `data-loc-key` like the
  existing ones.
- **Code checks:** `node --check js/story.js` after each phase.
- **Platforms:** test each phase in Celbridge on macOS (WKWebView) and Windows (WebView2).
- **Docs:** update the known-limits notes in `README_PROTOTYPE.md`: internet still needed, PDF text is WinAnsi only, SVG
  text not selectable, and which fullscreen level each platform gets.

## Risks

| Risk                                                 | Effect                              | Response                                                                                                              |
| ---------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| macOS host doesn't allow element fullscreen          | Only fill-the-editor on macOS       | Already the fallback. Ask the Celbridge host to turn on `isElementFullscreenEnabled` if wanted.                       |
| jsPDF `horizontalScale` doesn't work in some readers | Selection highlight is slightly off | Fall back to `charSpace`, or accept a small offset. Text is still searchable and copyable.                            |
| Many runs on dense code slides make export slow      | Longer export                       | Join runs by line, not by word. Time it in phase 4's checks.                                                          |
| esm.sh outage or version change                      | Export or play fails                | No change from v1. Versions stay pinned (`jspdf@2`, `html2canvas@1`); pin to exact versions while working on phase 3. |
