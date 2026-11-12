// Small geometry helpers - from util.smithit.com.as and the Point() constructor in tool_include1.as

export interface Point {
  x: number;
  y: number;
}

/** Distance between two points (Pythagoras), from distance() in util.smithit.com.as. */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** The point half way between two points (the "center" of a connector line). */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * The 8 compass points around a state's box that a connector end can snap to, plus CENTER.
 * (The Flash version also had FLOATING = 9 - here a floating end is its own class, see ConnectorEnd.ts.)
 *
 * NEW: CENTER is for an end dropped anywhere inside a state. It isn't drawn at the center: the line stops
 * where it crosses the state's outline, on the way to the connector's other end (see ConnectorEnd.point).
 */
export enum Compass {
  NORTH = "NORTH",
  SOUTH = "SOUTH",
  EAST = "EAST",
  WEST = "WEST",
  NORTH_EAST = "NORTH_EAST",
  NORTH_WEST = "NORTH_WEST",
  SOUTH_EAST = "SOUTH_EAST",
  SOUTH_WEST = "SOUTH_WEST",
  CENTER = "CENTER",
}

/** The 8 points on the outline (not CENTER). */
export const ALL_COMPASS_POINTS: readonly Compass[] = [
  Compass.NORTH,
  Compass.SOUTH,
  Compass.EAST,
  Compass.WEST,
  Compass.NORTH_EAST,
  Compass.NORTH_WEST,
  Compass.SOUTH_EAST,
  Compass.SOUTH_WEST,
];

/** Return a string in upper case with all spaces changed to underscores - upperCaseUnderScored() in the original. */
export function upperCaseUnderScored(s: string): string {
  return underScored(s.toUpperCase());
}

/** Return a string with all spaces changed to underscores, keeping its upper/lower case. */
export function underScored(s: string): string {
  return s.replaceAll(" ", "_");
}
