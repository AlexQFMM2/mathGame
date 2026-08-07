import {
  evaluateGeometryPuzzle,
  findGeometryHint,
  generateGridArchitect,
  parseGridArchitectChallengeId,
  type GeometryConditionResult,
  type GeometryHint,
  type GeometrySelection,
  type GridArchitectPuzzle,
} from "@math-game/grid-architect-core";

export const GRID_ARCHITECT_SAVE_KEY = "math-game:grid-architect:active:v1";
export const GRID_ARCHITECT_SAVE_SCHEMA_VERSION = 1 as const;

interface SelectionSnapshot {
  readonly selectedCellIds: readonly string[];
}

export interface GridArchitectSession {
  readonly puzzle: GridArchitectPuzzle;
  readonly selectedCellIds: readonly string[];
  readonly history: readonly SelectionSnapshot[];
  readonly errors: number;
  readonly hints: number;
  readonly elapsedSeconds: number;
  readonly paused: boolean;
  readonly pendingHint: GeometryHint | null;
  readonly checked: boolean;
  readonly conditionResults: readonly GeometryConditionResult[];
}

export interface SavedGridArchitectGame {
  readonly schemaVersion: typeof GRID_ARCHITECT_SAVE_SCHEMA_VERSION;
  readonly savedAt: string;
  readonly session: GridArchitectSession;
}

export type GridArchitectSessionAction =
  | {readonly type: "toggle-cell"; readonly cellId: string}
  | {readonly type: "undo"}
  | {readonly type: "reset"}
  | {readonly type: "check"}
  | {readonly type: "toggle-pause"}
  | {readonly type: "tick"}
  | {readonly type: "request-hint"}
  | {readonly type: "apply-hint"}
  | {readonly type: "dismiss-hint"};

function selectionOf(session: GridArchitectSession): GeometrySelection {
  return {selectedCellIds: session.selectedCellIds};
}

function withSelection(session: GridArchitectSession, selectedCellIds: readonly string[]): GridArchitectSession {
  return {
    ...session,
    selectedCellIds: [...new Set(selectedCellIds)].sort(),
    history: [...session.history, {selectedCellIds: session.selectedCellIds}].slice(-100),
    checked: false,
    conditionResults: [],
    pendingHint: null,
  };
}

export function createGridArchitectSession(puzzle: GridArchitectPuzzle): GridArchitectSession {
  return {
    puzzle,
    selectedCellIds: [],
    history: [],
    errors: 0,
    hints: 0,
    elapsedSeconds: 0,
    paused: false,
    pendingHint: null,
    checked: false,
    conditionResults: [],
  };
}

export function gridArchitectSessionReducer(
  session: GridArchitectSession,
  action: GridArchitectSessionAction,
): GridArchitectSession {
  switch (action.type) {
    case "toggle-cell": {
      if (session.paused || session.pendingHint !== null) return session;
      const cell = session.puzzle.cells.find((candidate) => candidate.id === action.cellId);
      if (cell === undefined || cell.terrain === "obstacle") return session;
      const selected = new Set(session.selectedCellIds);
      if (selected.has(cell.id)) selected.delete(cell.id);
      else selected.add(cell.id);
      return withSelection(session, [...selected]);
    }
    case "undo": {
      const previous = session.history.at(-1);
      return previous === undefined || session.paused || session.pendingHint !== null
        ? session
        : {
            ...session,
            selectedCellIds: previous.selectedCellIds,
            history: session.history.slice(0, -1),
            checked: false,
            conditionResults: [],
          };
    }
    case "reset":
      return session.selectedCellIds.length === 0 || session.paused || session.pendingHint !== null
        ? session
        : withSelection(session, []);
    case "check": {
      if (session.paused || session.pendingHint !== null) return session;
      const evaluation = evaluateGeometryPuzzle(session.puzzle, selectionOf(session));
      return {
        ...session,
        checked: true,
        conditionResults: evaluation.conditionResults,
        errors: session.errors + (evaluation.solved ? 0 : 1),
      };
    }
    case "toggle-pause":
      return {...session, paused: !session.paused, pendingHint: null};
    case "tick":
      return session.paused || isGridArchitectSessionComplete(session)
        ? session
        : {...session, elapsedSeconds: session.elapsedSeconds + 1};
    case "request-hint": {
      if (session.paused || session.pendingHint !== null) return session;
      const hint = findGeometryHint(session.puzzle, selectionOf(session));
      return hint === null ? session : {...session, pendingHint: hint, checked: false, conditionResults: []};
    }
    case "apply-hint": {
      if (session.pendingHint === null) return session;
      const selected = new Set(session.selectedCellIds);
      if (session.pendingHint.action === "build") selected.add(session.pendingHint.cellId);
      else selected.delete(session.pendingHint.cellId);
      return {...withSelection(session, [...selected]), hints: session.hints + 1};
    }
    case "dismiss-hint":
      return {...session, pendingHint: null};
  }
}

export function isGridArchitectSessionComplete(session: GridArchitectSession): boolean {
  return session.checked && evaluateGeometryPuzzle(session.puzzle, selectionOf(session)).solved;
}

export function createSavedGridArchitectGame(session: GridArchitectSession): SavedGridArchitectGame {
  return {
    schemaVersion: GRID_ARCHITECT_SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    session: {...session, paused: false, pendingHint: null},
  };
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validSelection(value: unknown, puzzle: GridArchitectPuzzle): value is readonly string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) return false;
  const selectable = new Set(puzzle.cells.filter((cell) => cell.terrain !== "obstacle").map((cell) => cell.id));
  return new Set(value).size === value.length && value.every((id) => selectable.has(id));
}

export function restoreSavedGridArchitectGame(value: unknown): SavedGridArchitectGame | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Partial<SavedGridArchitectGame>;
  const raw = candidate.session as Partial<GridArchitectSession> | undefined;
  const reference = typeof raw?.puzzle?.id === "string" ? parseGridArchitectChallengeId(raw.puzzle.id) : null;
  if (candidate.schemaVersion !== GRID_ARCHITECT_SAVE_SCHEMA_VERSION || typeof candidate.savedAt !== "string" || raw === undefined || reference === null) return null;
  const puzzle = generateGridArchitect(reference.difficulty, reference.seed);
  if (
    !validSelection(raw.selectedCellIds, puzzle)
    || !Array.isArray(raw.history)
    || !raw.history.every((snapshot) => typeof snapshot === "object" && snapshot !== null && validSelection((snapshot as SelectionSnapshot).selectedCellIds, puzzle))
    || !isNonNegativeInteger(raw.errors)
    || !isNonNegativeInteger(raw.hints)
    || !isNonNegativeInteger(raw.elapsedSeconds)
    || typeof raw.paused !== "boolean"
  ) return null;
  return {
    schemaVersion: GRID_ARCHITECT_SAVE_SCHEMA_VERSION,
    savedAt: candidate.savedAt,
    session: {
      puzzle,
      selectedCellIds: raw.selectedCellIds,
      history: raw.history as readonly SelectionSnapshot[],
      errors: Number(raw.errors),
      hints: Number(raw.hints),
      elapsedSeconds: Number(raw.elapsedSeconds),
      paused: false,
      pendingHint: null,
      checked: false,
      conditionResults: [],
    },
  };
}
