import type { Connector } from "./Connector.ts";
import type { Diagram } from "./Diagram.ts";
import type { DiagramState } from "./DiagramState.ts";
import type { TransitionEvent } from "./TransitionEvents.ts";

/**
 * One transition of the state machine, after any choice diamonds have been followed through: from a real
 * state, on an event, if its guards are true, to a real state (or nowhere), running its actions in order.
 *
 * A choice isn't a state the game waits in, so the XML exporter works from these
 * instead of from the connectors. E.g. on the gumball diagram:
 *
 *   GUMBALL SOLD --DISPENSED--> <choice> --[gumballs > 0]--> NO COIN
 *                                        --[gumballs = 0]--> OUT OF GUMBALLS
 * becomes two transitions from GUMBALL SOLD, both on DISPENSED:
 *   [gumballs > 0] -> NO COIN,  and  [gumballs = 0] -> OUT OF GUMBALLS
 */
export interface Transition {
  from: DiagramState;
  event: TransitionEvent;
  /** every guard on the way, e.g. ["gumballs > 0"] (empty: always) */
  guards: string[];
  to: DiagramState | null;
  /** true if it goes to a final state (the bullseye): the state machine ends */
  final: boolean;
  /** NEW: true if it goes to a terminate X: the object is deleted */
  terminate: boolean;
  /** the action functions of every connector on the way */
  actions: string[];
  /** the connectors on the way, in order (just one, unless it goes through a choice) - for the layout */
  path: Connector[];
}

/** All the transitions out of each real (not choice) state, in connector order. */
export function resolveTransitions(diagram: Diagram): Transition[] {
  const transitions: Transition[] = [];
  for (const c of diagram.connectors) {
    const from = c.start.state;
    // out of a choice: handled when following the arrow INTO the choice. Out of the initial dot: that's
    // not a transition, it says which state is first (see initialState()).
    if (!from || !from.isRealState) continue;
    const start: Transition = {
      from,
      event: c.event,
      guards: [],
      to: null,
      final: false,
      terminate: false,
      actions: [],
      path: [],
    };
    follow(diagram, c, start, new Set(), transitions);
  }
  return transitions;
}

function follow(
  diagram: Diagram,
  c: Connector,
  sofar: Transition,
  visited: Set<DiagramState>,
  out: Transition[],
): void {
  const t: Transition = {
    ...sofar,
    guards: c.guard.trim() ? [...sofar.guards, c.guard.trim()] : sofar.guards,
    actions: [...sofar.actions, ...c.actions],
    path: [...sofar.path, c],
  };
  const target = c.end.state;
  if (!target || !target.isChoice || visited.has(target)) {
    out.push({
      ...t,
      to: target?.isRealState ? target : null,
      final: target?.isFinal ?? false,
      terminate: target?.isTerminate ?? false,
    });
    return;
  }
  // into a choice: carry on along every arrow out of it
  const outs = diagram.connectors.filter((o) => o.start.state === target);
  if (outs.length === 0) {
    out.push({ ...t, to: null });
    return;
  }
  const seen = new Set(visited).add(target);
  for (const o of outs) follow(diagram, o, t, seen, out);
}

/** The state the game starts in: the one the initial dot's arrow points to (or null if there isn't one). */
export function initialState(diagram: Diagram): DiagramState | null {
  for (const c of diagram.connectors) {
    if (c.start.state?.isInitial && c.end.state?.isRealState) return c.end.state;
  }
  return null;
}

/**
 * NEW: the initial dot's arrow, followed through any choice diamond - e.g. on a gumball diagram whose
 * initial dot points at the choice: [gumballs > 0] -> NO COIN and [gumballs = 0] -> OUT OF GUMBALLS.
 * `from` is the initial dot itself. Empty if there is no initial dot, or no arrow out of it.
 */
export function initialTransitions(diagram: Diagram): Transition[] {
  const dot = diagram.states.find((s) => s.isInitial);
  const c = dot ? diagram.connectors.find((o) => o.start.state === dot) : undefined;
  if (!dot || !c) return [];
  const out: Transition[] = [];
  const start: Transition = {
    from: dot,
    event: c.event,
    guards: [],
    to: null,
    final: false,
    terminate: false,
    actions: [],
    path: [],
  };
  follow(diagram, c, start, new Set(), out);
  return out;
}

/** True if a guard list means "otherwise" - it has an [else] guard. */
export function isElse(guards: string[]): boolean {
  return guards.some((g) => g.toLowerCase() === "else");
}

/** The guards other than "else", joined with &&, e.g. "coins > 0 && gumballs > 0" (empty: none). */
export function guardCondition(guards: string[]): string {
  return guards.filter((g) => g.toLowerCase() !== "else").join(" && ");
}
