import type { Connector } from "./Connector.ts";
import type { Diagram } from "./Diagram.ts";
import type { DiagramState } from "./DiagramState.ts";
import { Compass, distance, type Point } from "./geometry.ts";

// NEW - laying out the diagram automatically ("tidy up"). Not in the Flash version.
//
// tidyUp() puts the states (and choice diamonds) on a grid, choosing the grid squares so that the arrows
// cross each other, and run through other states, as little as possible. It is a simple "local search":
//
//   1. score a layout: lots of points for each crossing or arrow through a state, a few for long or
//      diagonal arrows and for labels on top of each other (lower is better)
//   2. try moving each state to every other grid square (swapping if one is there already), and keep any
//      move that lowers the score; repeat until no move helps
//   3. do that from the current layout and from a few shuffled ones, and keep the best
//
// It's not guaranteed to find the best layout (that's a hard problem), but for diagrams of the size drawn
// in class it does well, and quickly.

/** distance between grid squares (state boxes are 140 x 72) */
export const TIDY_SPACING: Point = { x: 260, y: 170 };
/** where the top-left grid square is (clear of the Tools palette) */
export const TIDY_ORIGIN: Point = { x: 230, y: 110 };

/** how long a stub arrow (one that goes to no state) is drawn */
const STUB_LENGTH = 110;

// the scores (penalties)
const CROSSING = 1000;
const THROUGH_STATE = 1500;
const PER_PIXEL = 0.5;
const DIAGONAL = 30;
const LABELS_OVERLAP = 300;
const DIAGONAL_PAIR = 200;

/** Tidy up the whole diagram: move the states, and attach the arrows to their centers. */
export function tidyUp(diagram: Diagram): void {
  const nodes = diagram.states;
  if (nodes.length === 0) return;

  // every arrow between two different states now goes center to center (and so follows the states round)
  for (const c of diagram.connectors) {
    if (c.start.state && c.start.state === c.end.state) continue; // an arrow back to the same state
    if (c.start.state) c.start.snapTo(c.start.state, Compass.CENTER);
    if (c.end.state) c.end.snapTo(c.end.state, Compass.CENTER);
  }

  const edges = graphEdges(diagram);
  const columns = Math.ceil(Math.sqrt(nodes.length)) + 1;
  const rows = Math.ceil(nodes.length / (columns - 1)) + 1;
  const grid = new Grid(columns, rows, nodes.length, edges);

  // start from the current layout: each state goes to the free grid square nearest to it
  let best = grid.fromPositions(nodes);
  let bestScore = grid.improve(best);
  // ... and try a few shuffled starts too (always the same ones, so tidy up always gives the same answer)
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

  // move the states, leaving out any empty rows and columns
  const usedColumns = [...new Set(best.map((s) => s % columns))].sort((a, b) => a - b);
  const usedRows = [...new Set(best.map((s) => Math.floor(s / columns)))].sort((a, b) => a - b);
  nodes.forEach((node, i) => {
    node.x = TIDY_ORIGIN.x + usedColumns.indexOf(best[i] % columns) * TIDY_SPACING.x;
    node.y = TIDY_ORIGIN.y + usedRows.indexOf(Math.floor(best[i] / columns)) * TIDY_SPACING.y;
  });

  pullInInitialDots(diagram);
  separateParallelConnectors(diagram);
  placeStubs(diagram);
}

/** how far the initial dot is drawn from the edge of the first state */
const INITIAL_ARROW_LENGTH = 50;

/**
 * The initial dot took up a whole grid square; move it in along its arrow, to just outside the first state.
 * (Moving it straight toward the state can't make the arrow cross anything new.)
 */
function pullInInitialDots(diagram: Diagram): void {
  for (const c of diagram.connectors) {
    const dot = c.start.state;
    const first = c.end.state;
    if (!dot?.isInitial || !first || first === dot) continue;
    const length = Math.hypot(dot.x - first.x, dot.y - first.y);
    if (length === 0) continue;
    const edge = first.outlinePointToward(dot);
    const reach = Math.hypot(edge.x - first.x, edge.y - first.y) + INITIAL_ARROW_LENGTH + dot.width / 2;
    if (reach >= length) continue;
    dot.x = first.x + ((dot.x - first.x) / length) * reach;
    dot.y = first.y + ((dot.y - first.y) / length) * reach;
  }
}

/**
 * When two arrows join the same two states, both center to center (A->B and B->A), they would be drawn on
 * top of each other. Move them apart onto two parallel "lanes", using compass points on each state.
 */
export function separateParallelConnectors(diagram: Diagram): void {
  const pairs = new Map<string, Connector[]>();
  for (const c of diagram.connectors) {
    const a = c.start.state;
    const b = c.end.state;
    if (!a || !b || a === b || c.start.compass !== Compass.CENTER || c.end.compass !== Compass.CENTER) continue;
    const key = [a.instanceId, b.instanceId].sort().join("/");
    pairs.set(key, [...(pairs.get(key) ?? []), c]);
  }
  for (const group of pairs.values()) {
    if (group.length < 2) continue;
    const a = group[0].start.state!;
    const b = group[0].end.state!;
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

/** The compass points on a and on b for one of two parallel lanes (0 or 1) between them. */
function lanePoints(a: DiagramState, b: DiagramState, lane: number): [Compass, Compass] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const east = dx > 0;
  const south = dy > 0;
  if (Math.abs(dy) < a.height / 2) {
    // side by side: one lane along the top corners, one along the bottom corners
    return lane === 0
      ? [east ? Compass.NORTH_EAST : Compass.NORTH_WEST, east ? Compass.NORTH_WEST : Compass.NORTH_EAST]
      : [east ? Compass.SOUTH_EAST : Compass.SOUTH_WEST, east ? Compass.SOUTH_WEST : Compass.SOUTH_EAST];
  }
  if (Math.abs(dx) < a.width / 2) {
    // one above the other: one lane down the left corners, one down the right corners
    return lane === 0
      ? [south ? Compass.SOUTH_WEST : Compass.NORTH_WEST, south ? Compass.NORTH_WEST : Compass.SOUTH_WEST]
      : [south ? Compass.SOUTH_EAST : Compass.NORTH_EAST, south ? Compass.NORTH_EAST : Compass.SOUTH_EAST];
  }
  // diagonal: one lane from a's side to b's top/bottom, the other from a's top/bottom to b's side
  return lane === 0
    ? [east ? Compass.EAST : Compass.WEST, south ? Compass.NORTH : Compass.SOUTH]
    : [south ? Compass.SOUTH : Compass.NORTH, east ? Compass.WEST : Compass.EAST];
}

/** Point each arrow that goes to no state in the direction where it crosses the fewest other things. */
function placeStubs(diagram: Diagram): void {
  const segments: [Point, Point][] = [];
  for (const c of diagram.connectors) {
    if (c.start.state && c.end.state) segments.push([c.start.state, c.end.state]);
  }
  for (const c of diagram.connectors) {
    const from = c.start.state;
    if (!from || c.end.state) continue;
    let bestEnd: Point | null = null;
    let bestScore = Infinity;
    // try 8 directions, starting with "up and to the right"
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 4 + (i * Math.PI) / 4;
      const reach = STUB_LENGTH + Math.max(from.width, from.height) / 2;
      const end = { x: from.x + Math.cos(angle) * reach, y: from.y + Math.sin(angle) * reach };
      let score = i; // prefer the earlier directions if nothing else decides
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
    c.end.floatAt(bestEnd!);
  }
}

/** An arrow between two different states, as numbers: node i -> node j (states[i], states[j]). */
interface Edge {
  a: number;
  b: number;
  /** more than one arrow between these two states (they'll be drawn on parallel lanes) */
  multiple: boolean;
}

/** The arrows between different states, with A->B and B->A counted once. */
function graphEdges(diagram: Diagram): Edge[] {
  const index = new Map(diagram.states.map((s, i) => [s, i]));
  const edges = new Map<string, Edge>();
  for (const c of diagram.connectors) {
    if (!c.start.state || !c.end.state || c.start.state === c.end.state) continue;
    const a = index.get(c.start.state)!;
    const b = index.get(c.end.state)!;
    const key = Math.min(a, b) + "/" + Math.max(a, b);
    const old = edges.get(key);
    if (old) old.multiple = true;
    else edges.set(key, { a, b, multiple: false });
  }
  return [...edges.values()];
}

/** The grid of squares the states are placed on. A layout is "which square each state is in". */
class Grid {
  constructor(
    readonly columns: number,
    readonly rows: number,
    readonly nodeCount: number,
    readonly edges: Edge[],
  ) {}

  get size(): number {
    return this.columns * this.rows;
  }

  center(slot: number): Point {
    return {
      x: (slot % this.columns) * TIDY_SPACING.x,
      y: Math.floor(slot / this.columns) * TIDY_SPACING.y,
    };
  }

  /** Each state in the free square nearest to where it is now (top-left states first). */
  fromPositions(nodes: DiagramState[]): number[] {
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const order = nodes.map((_, i) => i).sort((i, j) => nodes[i].y - nodes[j].y || nodes[i].x - nodes[j].x);
    const slots = new Array<number>(nodes.length);
    const taken = new Set<number>();
    for (const i of order) {
      const here = { x: nodes[i].x - minX, y: nodes[i].y - minY };
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
  shuffled(random: () => number): number[] {
    const all = [...Array(this.size).keys()];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, this.nodeCount);
  }

  /** Improve a layout (in place) by moving one state at a time while that helps. Returns its final score. */
  improve(slots: number[]): number {
    const owner = new Array<number>(this.size).fill(-1);
    slots.forEach((s, i) => (owner[s] = i));
    let score = this.score(slots);
    for (let pass = 0; pass < 30; pass++) {
      let improved = false;
      for (let i = 0; i < slots.length; i++) {
        for (let s = 0; s < this.size; s++) {
          const old = slots[i];
          if (s === old) continue;
          const other = owner[s];
          // move state i to square s (swapping with the state there, if any)
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
  score(slots: number[]): number {
    const points = slots.map((s) => this.center(s));
    const edges = this.edges;
    let score = 0;
    for (let e = 0; e < edges.length; e++) {
      const { a, b } = edges[e];
      const p = points[a];
      const q = points[b];
      score += distance(p, q) * PER_PIXEL;
      if (p.x !== q.x && p.y !== q.y) score += edges[e].multiple ? DIAGONAL_PAIR : DIAGONAL;
      // through another state?
      for (let n = 0; n < points.length; n++) {
        if (n !== a && n !== b && segmentHitsBox(p, q, { x: points[n].x, y: points[n].y, width: 150, height: 90 }, 0)) {
          score += THROUGH_STATE;
        }
      }
      for (let f = e + 1; f < edges.length; f++) {
        const other = edges[f];
        const r = points[other.a];
        const t = points[other.b];
        // labels are drawn half way along the arrow
        const m1 = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
        const m2 = { x: (r.x + t.x) / 2, y: (r.y + t.y) / 2 };
        if (Math.abs(m1.x - m2.x) < 90 && Math.abs(m1.y - m2.y) < 24) score += LABELS_OVERLAP;
        // arrows that share a state can't cross
        if (other.a === a || other.a === b || other.b === a || other.b === b) continue;
        if (segmentsCross(p, q, r, t)) score += CROSSING;
      }
    }
    return score;
  }
}

/** True if segments p-q and r-t cross each other. */
export function segmentsCross(p: Point, q: Point, r: Point, t: Point): boolean {
  const d1 = cross(r, t, p);
  const d2 = cross(r, t, q);
  const d3 = cross(p, q, r);
  const d4 = cross(p, q, t);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** True if segment p-q passes through a box (centered at x, y), made `margin` pixels bigger all round. */
export function segmentHitsBox(
  p: Point,
  q: Point,
  box: { x: number; y: number; width: number; height: number },
  margin: number,
): boolean {
  // Liang-Barsky clipping: is any part of the segment inside the box?
  const left = box.x - box.width / 2 - margin;
  const right = box.x + box.width / 2 + margin;
  const top = box.y - box.height / 2 - margin;
  const bottom = box.y + box.height / 2 + margin;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  let t0 = 0;
  let t1 = 1;
  const checks: [number, number][] = [[-dx, p.x - left], [dx, right - p.x], [-dy, p.y - top], [dy, bottom - p.y]];
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

/** A small random number generator that always gives the same numbers for the same seed ("mulberry32"). */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
