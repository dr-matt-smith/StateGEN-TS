{
  "name": "Gumball Machine — Version 1 Design",
  "description": "COMP H3032 Design Patterns · Week 9 State · the Mighty Gumball controller as a state machine (Mermaid + nomnoml), before refactoring.",
  "navigation": {
    "show": true,
    "style": "arrows-name",
    "position": "top-right",
    "showNumber": true
  },
  "sequenceArrows": {
    "show": true,
    "style": "dashed",
    "color": "#ffcc00",
    "alpha": 0.55
  },
  "nodes": [
    {
      "name": "Start",
      "x": 0,
      "y": 0,
      "text": "# Mighty Gumball, Inc.\n\n### Version 1 design — the gumball machine as a state machine\n\n*\"Where the Gumball Machine is Never Half Empty\"*\n\n> The engineers' brief: implement the controller (the book says Java; we use TypeScript), and keep the design **as flexible and maintainable as possible** — more behaviour is coming.\n\n<!--\nSpeaker note: this story redraws the engineers' hand-sketched diagram as Mermaid and nomnoml.\nVersion 1 implements it with if-statements; keep an eye on what will hurt when the change request arrives.\n-->\n"
    },
    {
      "name": "States-and-Actions",
      "x": 240,
      "y": 0,
      "text": "# States and actions\n\n| States | Actions (what a customer can do) |\n|---|---|\n| **No Quarter** | insert quarter |\n| **Has Quarter** | eject quarter |\n| **Gumball Sold** | turn crank |\n| **Out of Gumballs** | *(machine)* dispense gumball |\n\nEach state answers *every* action — but most answers are \"you can't do that now\".\n\n<style scoped>section { font-size: 28px; }</style>\n"
    },
    {
      "name": "Mermaid-Diagram",
      "x": 480,
      "y": 0,
      "text": "# The state diagram (Mermaid)\n\n```mermaid\nstateDiagram-v2\n    direction LR\n    [*] --> NoQuarter : gumballs > 0\n    [*] --> OutOfGumballs : gumballs = 0\n    NoQuarter --> HasQuarter : inserts quarter\n    HasQuarter --> NoQuarter : ejects quarter\n    HasQuarter --> GumballSold : turns crank\n    GumballSold --> NoQuarter : dispense gumball [gumballs > 0]\n    GumballSold --> OutOfGumballs : dispense gumball [gumballs = 0]\n```\n\n<!--\nThe two [*] start transitions are not on the original sketch: the controller has to pick a\nstarting state from the initial gumball count.\n-->\n"
    },
    {
      "name": "nomnoml-Diagram",
      "x": 720,
      "y": 0,
      "text": "# The same machine (nomnoml)\n\n```nomnoml\n#direction: right\n#spacing: 90\n#padding: 14\n#edgeMargin: 10\n#gutter: 10\n#.state: visual=roundrect fill=#fdf6e3 bold\n[<start>start]\n[<state>No Quarter]\n[<state>Has Quarter]\n[<state>Gumball Sold]\n[<state>Out of Gumballs]\n[start] gumballs \\> 0 -> [No Quarter]\n[start] gumballs = 0 -> [Out of Gumballs]\n[No Quarter] inserts quarter -> [Has Quarter]\n[Has Quarter] ejects quarter -> [No Quarter]\n[Has Quarter] turns crank -> [Gumball Sold]\n[Gumball Sold] dispense, gumballs \\> 0 -> [No Quarter]\n[Gumball Sold] dispense, gumballs = 0 -> [Out of Gumballs]\n```\n"
    },
    {
      "name": "Transition-Table",
      "x": 960,
      "y": 0,
      "text": "# Every state × every action\n\n| State ↓ / Action → | insert quarter | eject quarter | turn crank | dispense |\n|---|---|---|---|---|\n| **No Quarter** | → Has Quarter | ✗ no quarter | ✗ no quarter | ✗ |\n| **Has Quarter** | ✗ already one | → No Quarter | → Gumball Sold | ✗ |\n| **Gumball Sold** | ✗ wait | ✗ already turned | ✗ turning twice | → No Quarter / Out of Gumballs |\n| **Out of Gumballs** | ✗ sold out | ✗ no quarter | ✗ no gumballs | ✗ |\n\nThe diagram shows only the 6 ✓ arrows. The other **10 cells** are still behaviour the code must handle.\n\n<style scoped>section { font-size: 22px; }</style>\n"
    },
    {
      "name": "Version-1-Code-Shape",
      "x": 1200,
      "y": 0,
      "text": "# Version 1: states as constants, actions as if-chains\n\n```ts\nconst SOLD_OUT = 0, NO_QUARTER = 1, HAS_QUARTER = 2, SOLD = 3;\nprivate state = SOLD_OUT;   // constructor: NO_QUARTER if count > 0\n\npublic insertQuarter(): void {\n  if (this.state === HAS_QUARTER)      { /* can't insert another */ }\n  else if (this.state === NO_QUARTER)  { this.setState(HAS_QUARTER); }\n  else if (this.state === SOLD_OUT)    { /* sold out */ }\n  else if (this.state === SOLD)        { /* please wait */ }\n}\n```\n\nOne method per **action**, one branch per **state** → the table, sliced by column.\nSee `src/ConditionalGumballMachine.ts`.\n\n<style scoped>section { font-size: 24px; }</style>\n"
    },
    {
      "name": "Design-Questions",
      "x": 1440,
      "y": 0,
      "text": "# Before the change request arrives…\n\n- Adding a **new state** touches *every* action method.\n- Adding a **new action** means a new method with a branch for *every* state.\n- Where does the behaviour *for one state* live? Scattered across four methods.\n\n> Is this \"as flexible and maintainable as possible\"? Hold that thought for **version 2**.\n"
    }
  ]
}
