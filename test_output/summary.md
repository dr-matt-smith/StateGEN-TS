# Test report - stateGEN_TS

**All tests passing** - 11/12/2026, 8:37:37 AM

| Passed | Failed | Skipped | Type errors | Lint warnings |
|---:|---:|---:|---:|---:|
| 114 | 0 | 0 | 0 | 0 |

## All tests


**tests/behaviours_test.ts**

- ✓ a state with no behaviours is the usual size
- ✓ behaviours are listed the UML way: entry/, do/, exit/
- ✓ a state showing its behaviours is taller; hiding them puts it back
- ✓ the mouse finds a taller state all the way to its bottom edge
- ✓ long behaviour names are split across lines
- ✓ DO behaviours are saved as <doStateActions> (version 2), and read back
- ✓ a wider state fits more of each behaviour on a line
- ✓ a resized state is saved with its size (version 2), and read back
- ✓ only real states resize: a choice diamond stays the same size

**tests/choice_test.ts**

- ✓ a choice is followed through: GUMBALL SOLD gets two guarded transitions
- ✓ export: guards are a guard='...' attribute, and the choice itself isn't written
- ✓ import: same event + different guards becomes a choice again, and re-exports the same XML
- ✓ an [else] guard is saved in the XML
- ✓ editor: the choice tool drags a new diamond; connectors snap inside it; labels show guards
- ✓ the initial dot can point at a choice: <initialState> with guarded <event>s, and back again
- ✓ the gumball example (initial dot -> choice) imports, then exports, the same XML as it was saved

**tests/completion_test.ts**

- ✓ a choice is followed through: GUMBALL SOLD gets two guarded transitions
- ✓ export: guards are a guard='...' attribute, and the choice itself isn't written
- ✓ import: same event + different guards becomes a choice again, and re-exports the same XML
- ✓ an [else] guard is saved in the XML
- ✓ editor: the choice tool drags a new diamond; connectors snap inside it; labels show guards
- ✓ the initial dot can point at a choice: <initialState> with guarded <event>s, and back again
- ✓ the gumball example (initial dot -> choice) imports, then exports, the same XML as it was saved
- ✓ a completion transition's label is just its guard (or nothing)
- ✓ export: a completion transition is an <event> with no id, and makes the file version 2
- ✓ import: an <event> with no id is a completion transition, and re-exports the same XML
- ✓ the built-in gumball example uses completion transitions (no warnings)
- ✓ an arrow from the initial dot (completion by default) doesn't make the file version 2

**tests/curves_test.ts**

- ✓ one arrow between two states is straight
- ✓ A->B and B->A curve apart, one either side of the straight line
- ✓ three arrows between the same states: one straight, two curved
- ✓ an arrow from a state back to itself is a loop, bending away from the state
- ✓ picking a curved arrow by its middle finds the right one
- ✓ a floating arrow (not attached at both ends) is straight
- ✓ minimap: the whole diagram fits, centered, and points map back
- ✓ viewport: centerOn() puts a diagram point in the middle of the screen, keeping the zoom

**tests/editor_test.ts**

- ✓ the editor starts in STATE_GAME_LOADING, and EVENT_ON_LOAD takes it to STATE_SELECT
- ✓ new state tool: SELECT -> STATE DRAG -> (mouse up) -> SELECT, leaving a selected state
- ✓ mouse down on a state selects it and drags it, without it jumping
- ✓ mouse down on empty space deselects, and stays in SELECT
- ✓ new connector tool: drag its start onto a state's compass point and it snaps
- ✓ dragging a connector's END, then moving the state - the connector follows
- ✓ mouse down on a connector's center: CONNECTOR MOVE, both ends come loose
- ✓ clicking a connector's center selects it, but leaves it snapped to its states
- ✓ the \# key deletes the selected state; connectors attached to it are left floating
- ✓ the \# key deletes the selected connector
- ✓ events a state doesn't handle are ignored (e.g. delete while dragging)
- ✓ export: EXPORT XML shows the files, back to diagram returns to SELECT
- ✓ import replaces the diagram and reports problems
- ✓ dropping a connector end INSIDE a state attaches it to the state's center
- ✓ near one of the 8 compass points (even just inside the state) beats the center
- ✓ a center end's outline point is on the rounded corner, not the square corner
- ✓ the diagonal compass points are on the rounded outline
- ✓ connector labels: target.event for a web event; a custom event shows just its name
- ✓ clicking an arrow's label selects the arrow; it stays attached
- ✓ dragging an arrow's label moves the arrow as far as the mouse moves (no jump)
- ✓ a label on top of a state: pressing it grabs the arrow, not the state
- ✓ Ctrl/Cmd-D duplicates the selected state, a little down and right, with the next free name
- ✓ Ctrl/Cmd-D duplicates the selected arrow: same states, same event, curving apart
- ✓ Ctrl/Cmd-D with nothing selected does nothing
- ✓ drag the selected state's corner: SELECT -> STATE_STATE_RESIZE -> SELECT, top-left stays put
- ✓ a state can't be resized smaller than the minimum
- ✓ the resize handle is only there while the state is selected

**tests/layout_test.ts**

- ✓ a choice is followed through: GUMBALL SOLD gets two guarded transitions
- ✓ export: guards are a guard='...' attribute, and the choice itself isn't written
- ✓ import: same event + different guards becomes a choice again, and re-exports the same XML
- ✓ an [else] guard is saved in the XML
- ✓ editor: the choice tool drags a new diamond; connectors snap inside it; labels show guards
- ✓ the initial dot can point at a choice: <initialState> with guarded <event>s, and back again
- ✓ the gumball example (initial dot -> choice) imports, then exports, the same XML as it was saved
- ✓ import without a layout: tidied up, with arrows attached to the CENTER of their states
- ✓ import without a layout: arrows both ways between two states are moved apart
- ✓ save, then load, puts everything back where it was - including choices
- ✓ tidy up: the gumball machine ends up with no crossings and no arrows through states
- ✓ tidy up: untangles a square drawn with its arrows crossing
- ✓ tidy up: every example comes out with no arrows through states, and the same every time
- ✓ separating parallel arrows: side by side, one above the other, and diagonal

**tests/pseudostate_test.ts**

- ✓ the initial dot says which state is first; it isn't a transition
- ✓ an arrow into the final bullseye ends the state machine - directly, or through a choice
- ✓ export: <initialState>, and final='true' on the events that end it
- ✓ import: the initial dot and final bullseye come back, and re-export the same XML
- ✓ the gumball example's initial dot points at the choice: NO COIN or OUT OF GUMBALLS
- ✓ the round shapes: compass points on the circle, an end dropped inside goes to the center
- ✓ the round shapes have no edge points: an arrow end can only attach to the center
- ✓ editor: the initial and final tools drag out new shapes
- ✓ labels: two parallel arrows get their labels apart; a lone label stays above the middle

**tests/terminate_test.ts**

- ✓ an arrow into the terminate X deletes the object: a transition with terminate, to no state
- ✓ export and import: terminate='true' and where the X is - and back again unchanged
- ✓ a terminate X makes the file version 2 at least (Flash didn't have it)
- ✓ editor: the terminate tool drags out a new X

**tests/time_test.ts**

- ✓ labels: after(ms), and the frame event's web names
- ✓ XML: EVENT_AFTER_<ms> imports as a time event, and re-exports the same

**tests/version3_test.ts**

- ✓ the palette: every entry has a description and a known category; lookups
- ✓ labels: target.event, keys with modifiers, the document left out
- ✓ version 1/2 ids are converted to web events, and give the same ids back
- ✓ every example imports with no warnings (but stateGEN's own Flash file) and only a version 3 file saves as version 3
- ✓ export: version 3 when an event has no old id - no declarations, attributes instead of ids
- ✓ import: version 3 comes back exactly, with no warnings
- ✓ export: an old ON_LOAD is a completion transition in version 3

**tests/viewport_test.ts**

- ✓ viewport: diagram <-> screen, panned and zoomed
- ✓ viewport: zooming keeps the point under the mouse where it is, within limits
- ✓ viewport: fit zooms as far as it can, centered to the right of the palette

**tests/xml_test.ts**

- ✓ export: exactly the Flash version's format (plus the layout attributes)
- ✓ export: default connector is a completion transition (no id), special keys are by name
- ✓ export: the layout - state positions, and only the ends snapped to a compass point
- ✓ export: enter/exit state functions become <enterStateActions>/<exitStateActions>
- ✓ import, then export, gives back the same XML
- ✓ import: works for every example (the Flash version's, and the gumball machine)
- ✓ import: action code that is more than function calls is reported; several calls become a list
- ✓ version 2: actions, (p), screens, properties, the mouse area and DELETE import with no warnings
- ✓ version 2: import, then export, gives back the same XML
- ✓ version 1: several actions are written the Flash way, one call per line
- ✓ import: mouse events (EVENT_ON_MOUSE_...) are pointer events, and each warning is given once

**src/io/XmlExporter.ts**

- ✓ example in the doc comment (lines 64-70)
