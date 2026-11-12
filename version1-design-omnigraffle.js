// Gumball machine state diagram for OmniGraffle 7 Pro (Omni Automation)
// Paste into: Automation ▸ Console, then press Return.
// Draws on the current canvas. Safe to run again (wrapped in a function).
(() => {
    const cnvs = document.windows[0].selection.canvas;

    const FILL   = Color.RGB(0.99, 0.965, 0.89);   // cream, like the nomnoml slide
    const STROKE = Color.RGB(0.2, 0.2, 0.2);
    const FONT = "HelveticaNeue", FONT_BOLD = "HelveticaNeue-Bold";

    // ---- states ------------------------------------------------------
    function state(name, x, y) {
        const s = cnvs.newShape();
        s.geometry = new Rect(x, y, 170, 70);
        s.shape = "Rectangle";
        s.cornerRadius = 30;
        s.text = name;
        s.fontName = FONT_BOLD;
        s.textSize = 16;
        s.fillColor = FILL;
        s.strokeColor = STROKE;
        s.strokeThickness = 2.5;
        s.name = name;
        return s;
    }

    // Layout follows the engineers' sketch, with a start state added
    const outOf   = state("Out of Gumballs", 60, 120);
    const hasQ    = state("Has Quarter",     440, 160);
    const noQ     = state("No Quarter",      360, 400);
    const sold    = state("Gumball Sold",    700, 520);

    const start = cnvs.newShape();
    start.geometry = new Rect(120, 470, 28, 28);
    start.shape = "Circle";
    start.fillColor = STROKE;
    start.strokeColor = STROKE;
    start.name = "start";

    // ---- transitions -------------------------------------------------
    // bend: optional {x, y} control point to curve the line (null = straight)
    // label + labelPos: free text placed near the line
    function transition(from, to, label, labelPos, bend) {
        const l = cnvs.connect(from, to);
        l.headType = "FilledArrow";
        l.strokeColor = STROKE;
        l.strokeThickness = 2;
        if (bend) {
            l.lineType = LineType.Curved;
            const pts = l.points;
            l.points = [pts[0], new Point(bend.x, bend.y), pts[pts.length - 1]];
        }
        if (label) {
            const t = cnvs.addText(label, new Point(labelPos.x, labelPos.y));
            t.fontName = FONT;
            t.textSize = 14;
            t.textColor = STROKE;
        }
        return l;
    }

    transition(start, noQ,   "gumballs > 0",                 {x: 170, y: 470});
    transition(start, outOf, "gumballs = 0",                 {x: 40,  y: 330});
    transition(noQ,   hasQ,  "inserts quarter",              {x: 270, y: 280}, {x: 360, y: 260});
    transition(hasQ,  noQ,   "ejects quarter",               {x: 600, y: 330}, {x: 610, y: 360});
    transition(hasQ,  sold,  "turns crank",                  {x: 760, y: 230}, {x: 840, y: 330});
    transition(sold,  noQ,   "dispense gumball\n[gumballs > 0]", {x: 470, y: 560}, {x: 520, y: 600});
    transition(sold,  outOf, "dispense gumball\n[gumballs = 0]", {x: 330, y: 690}, {x: 120, y: 700});

    // ---- title -------------------------------------------------------
    const title = cnvs.addText("Mighty Gumball — version 1 state machine", new Point(60, 40));
    title.fontName = FONT_BOLD;
    title.textSize = 22;

    console.log("Gumball state diagram drawn on canvas: " + cnvs.name);
})();
