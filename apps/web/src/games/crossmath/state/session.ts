import {
  equalRational,
  findCrossMathHint,
  formatRational,
  generateCrossMath,
  getInvalidCrossMathGridRelationIds,
  getInitialValueState,
  getPuzzleDestinationIds,
  isCrossMathSolved,
  parseCrossMathChallengeId,
  setDestinationValue,
  setDestinationSymbol,
  type CrossMathHint,
  type CrossMathPuzzle,
  type CrossMathTile,
  type CrossMathValueState,
  type VariableName,
} from "@math-game/crossmath-core";

export const CROSSMATH_SAVE_KEY = "math-game:crossmath:active:v2";
export const CROSSMATH_SAVE_SCHEMA_VERSION = 2 as const;

interface PlacementSnapshot {
  readonly placements: Readonly<Record<string, string>>;
}

export interface CrossMathSession {
  readonly puzzle: CrossMathPuzzle;
  readonly placements: Readonly<Record<string, string>>;
  readonly selectedTileId: string | null;
  readonly history: readonly PlacementSnapshot[];
  readonly errors: number;
  readonly hints: number;
  readonly elapsedSeconds: number;
  readonly paused: boolean;
  readonly pendingHint: CrossMathHint | null;
  readonly mistakeRelationIds: readonly string[];
}

export interface SavedCrossMathGame {
  readonly schemaVersion: typeof CROSSMATH_SAVE_SCHEMA_VERSION;
  readonly savedAt: string;
  readonly session: CrossMathSession;
}

export type CrossMathSessionAction =
  | {readonly type: "select-tile"; readonly tileId: string}
  | {readonly type: "place"; readonly destinationId: string}
  | {readonly type: "undo"}
  | {readonly type: "reset"}
  | {readonly type: "toggle-pause"}
  | {readonly type: "tick"}
  | {readonly type: "request-hint"}
  | {readonly type: "apply-hint"}
  | {readonly type: "dismiss-hint"};

function tileById(puzzle: CrossMathPuzzle, tileId: string): CrossMathTile | null {
  return puzzle.tiles.find((tile) => tile.id === tileId) ?? null;
}

export function createCrossMathValueState(session: CrossMathSession): CrossMathValueState {
  let values = getInitialValueState(session.puzzle);
  for (const [destinationId, tileId] of Object.entries(session.placements)) {
    const tile = tileById(session.puzzle, tileId);
    if (tile?.kind === "number") values = setDestinationValue(values, destinationId, tile.value);
    if (tile?.kind === "symbol") values = setDestinationSymbol(values, destinationId, tile.symbol);
  }
  return values;
}

export function getUnusedCrossMathTiles(session: CrossMathSession): readonly CrossMathTile[] {
  const used = new Set(Object.values(session.placements));
  return session.puzzle.tiles.filter((tile) => !used.has(tile.id));
}

function withPlacement(
  session: CrossMathSession,
  destinationId: string,
  tileId: string | null,
  countError: boolean,
): CrossMathSession {
  const placements = {...session.placements};
  if (tileId === null) {
    delete placements[destinationId];
  } else {
    for (const [existingDestination, existingTileId] of Object.entries(placements)) {
      if (existingTileId === tileId) delete placements[existingDestination];
    }
    placements[destinationId] = tileId;
  }
  const nextValues = createCrossMathValueState({...session, placements});
  const isFull = Object.keys(placements).length === session.puzzle.tiles.length;
  const mistakeRelationIds = isFull
    ? getInvalidCrossMathGridRelationIds(session.puzzle, nextValues, true)
    : [];
  if (mistakeRelationIds.length > 0) {
    const mistakes = new Set(mistakeRelationIds);
    const destinationsToEject = new Set<string>();
    for (const relation of session.puzzle.relations.filter((candidate) => mistakes.has(candidate.id))) {
      relation.cellIds.forEach((cellId) => destinationsToEject.add(cellId));
      relation.variableNames.forEach((name) => destinationsToEject.add(`var:${name}`));
    }
    session.puzzle.cells
      .filter((cell) => cell.kind === "symbol" && cell.fillable === true && cell.relationIds.some((relationId) => mistakes.has(relationId)))
      .forEach((cell) => destinationsToEject.add(cell.id));
    destinationsToEject.forEach((candidate) => delete placements[candidate]);
  }
  return {
    ...session,
    placements,
    selectedTileId: null,
    history: [...session.history, {placements: session.placements}].slice(-100),
    errors: session.errors + (countError && isFull && mistakeRelationIds.length > 0 ? 1 : 0),
    pendingHint: null,
    mistakeRelationIds,
  };
}

function destinationAcceptsTile(puzzle: CrossMathPuzzle, destinationId: string, tile: CrossMathTile): boolean {
  const symbolDestination = puzzle.cells.some((cell) => (
    cell.id === destinationId && cell.kind === "symbol" && cell.fillable === true
  ));
  return symbolDestination ? tile.kind === "symbol" : tile.kind === "number";
}

function solutionValueAt(puzzle: CrossMathPuzzle, destinationId: string) {
  return destinationId.startsWith("var:")
    ? puzzle.solution.variables[destinationId.slice(4) as VariableName]
    : puzzle.solution.cells[destinationId];
}

function findRelocationHint(session: CrossMathSession): CrossMathHint | null {
  const currentValues = createCrossMathValueState(session);
  const destinationByTile = new Map(Object.entries(session.placements).map(([destinationId, tileId]) => [tileId, destinationId]));
  for (const destinationId of getPuzzleDestinationIds(session.puzzle)) {
    if (currentValues.cells[destinationId] !== undefined || destinationId.startsWith("var:") && currentValues.variables[destinationId.slice(4) as VariableName] !== undefined) {
      continue;
    }
    const expected = solutionValueAt(session.puzzle, destinationId);
    if (expected === undefined) continue;
    const misplacedTile = session.puzzle.tiles.find((tile) => {
      if (tile.kind !== "number" || !equalRational(tile.value, expected)) return false;
      const currentDestination = destinationByTile.get(tile.id);
      if (currentDestination === undefined || currentDestination === destinationId) return false;
      const expectedThere = solutionValueAt(session.puzzle, currentDestination);
      return expectedThere === undefined || !equalRational(tile.value, expectedThere);
    });
    if (misplacedTile === undefined) continue;
    const relation = session.puzzle.relations.find((item) => (
      destinationId.startsWith("var:")
        ? item.variableNames.includes(destinationId.slice(4) as VariableName)
        : item.cellIds.includes(destinationId)
    ));
    return {
      destinationId,
      value: expected,
      relationId: relation?.id ?? null,
      movesExistingTile: true,
      explanation: `当前牌序已经无法直接完成。把放在别处的 ${formatRational(expected)} 移到这里，原来的位置会重新空出。`,
    };
  }
  return null;
}

export function createCrossMathSession(puzzle: CrossMathPuzzle): CrossMathSession {
  return {
    puzzle,
    placements: {},
    selectedTileId: null,
    history: [],
    errors: 0,
    hints: 0,
    elapsedSeconds: 0,
    paused: false,
    pendingHint: null,
    mistakeRelationIds: [],
  };
}

export function crossMathSessionReducer(
  session: CrossMathSession,
  action: CrossMathSessionAction,
): CrossMathSession {
  switch (action.type) {
    case "select-tile":
      return session.paused || session.pendingHint !== null || tileById(session.puzzle, action.tileId) === null
        ? session
        : {...session, selectedTileId: session.selectedTileId === action.tileId ? null : action.tileId, mistakeRelationIds: []};

    case "place": {
      if (
        session.paused
        || session.pendingHint !== null
        || !getPuzzleDestinationIds(session.puzzle).includes(action.destinationId)
      ) {
        return session;
      }
      if (session.selectedTileId === null) {
        return session.placements[action.destinationId] === undefined
          ? session
          : withPlacement(session, action.destinationId, null, false);
      }
      const selectedTile = tileById(session.puzzle, session.selectedTileId);
      if (selectedTile === null || !destinationAcceptsTile(session.puzzle, action.destinationId, selectedTile)) return session;
      return withPlacement(session, action.destinationId, session.selectedTileId, true);
    }

    case "undo": {
      const previous = session.history.at(-1);
      return previous === undefined || session.paused || session.pendingHint !== null
        ? session
        : {
            ...session,
            placements: previous.placements,
            selectedTileId: null,
            history: session.history.slice(0, -1),
            mistakeRelationIds: [],
          };
    }

    case "reset":
      return session.paused || session.pendingHint !== null || Object.keys(session.placements).length === 0
        ? session
        : {
            ...session,
            placements: {},
            selectedTileId: null,
            history: [...session.history, {placements: session.placements}].slice(-100),
            mistakeRelationIds: [],
          };

    case "toggle-pause":
      return {...session, paused: !session.paused, pendingHint: null, mistakeRelationIds: []};

    case "tick":
      return session.paused ? session : {...session, elapsedSeconds: session.elapsedSeconds + 1};

    case "request-hint": {
      if (session.paused || session.pendingHint !== null) return session;
      const values = createCrossMathValueState(session);
      const hint = findRelocationHint(session)
        ?? findCrossMathHint(
            session.puzzle,
            values,
            getUnusedCrossMathTiles(session).filter((tile) => tile.kind === "number").map((tile) => tile.value),
          );
      return hint === null ? session : {...session, pendingHint: hint, selectedTileId: null, mistakeRelationIds: []};
    }

    case "apply-hint": {
      if (session.pendingHint === null) return session;
      const value = session.pendingHint.value;
      const tile = getUnusedCrossMathTiles(session)
        .find((candidate) => candidate.kind === "number" && equalRational(candidate.value, value))
        ?? (session.pendingHint.movesExistingTile
          ? session.puzzle.tiles.find((candidate) => {
              if (candidate.kind !== "number" || !equalRational(candidate.value, value)) return false;
              const currentDestination = Object.entries(session.placements).find(([, tileId]) => tileId === candidate.id)?.[0];
              if (currentDestination === undefined) return false;
              const expectedThere = solutionValueAt(session.puzzle, currentDestination);
              return expectedThere === undefined || !equalRational(candidate.value, expectedThere);
            })
          : undefined);
      if (tile === undefined) return {...session, pendingHint: null};
      const next = withPlacement(session, session.pendingHint.destinationId, tile.id, false);
      return {...next, hints: session.hints + 1};
    }

    case "dismiss-hint":
      return {...session, pendingHint: null};
  }
}

export function isCrossMathSessionComplete(session: CrossMathSession): boolean {
  return isCrossMathSolved(session.puzzle, createCrossMathValueState(session));
}

export function createSavedCrossMathGame(session: CrossMathSession): SavedCrossMathGame {
  return {
    schemaVersion: CROSSMATH_SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    session: {...session, paused: false, pendingHint: null, mistakeRelationIds: []},
  };
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isValidPlacements(
  value: unknown,
  puzzle: CrossMathPuzzle,
): value is Readonly<Record<string, string>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const destinations = new Set(getPuzzleDestinationIds(puzzle));
  const tileIds = new Set(puzzle.tiles.map((tile) => tile.id));
  const usedTiles = new Set<string>();
  return Object.entries(value).every(([destinationId, tileId]) => {
    const tile = typeof tileId === "string" ? puzzle.tiles.find((candidate) => candidate.id === tileId) : undefined;
    if (!destinations.has(destinationId) || tile === undefined || usedTiles.has(tileId) || !destinationAcceptsTile(puzzle, destinationId, tile)) {
      return false;
    }
    usedTiles.add(tileId);
    return true;
  });
}

export function restoreSavedCrossMathGame(value: unknown): SavedCrossMathGame | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<SavedCrossMathGame>;
  const rawSession = candidate.session as Partial<CrossMathSession> | undefined;
  const reference = typeof rawSession?.puzzle?.id === "string"
    ? parseCrossMathChallengeId(rawSession.puzzle.id)
    : null;
  if (
    candidate.schemaVersion !== CROSSMATH_SAVE_SCHEMA_VERSION
    || typeof candidate.savedAt !== "string"
    || rawSession === undefined
    || reference === null
  ) {
    return null;
  }
  const puzzle = generateCrossMath(reference.difficulty, reference.seed);
  if (
    !isValidPlacements(rawSession.placements, puzzle)
    || !Array.isArray(rawSession.history)
    || !rawSession.history.every((snapshot) => (
      typeof snapshot === "object"
      && snapshot !== null
      && isValidPlacements((snapshot as Partial<PlacementSnapshot>).placements, puzzle)
    ))
    || rawSession.selectedTileId !== null
      && !puzzle.tiles.some((tile) => tile.id === rawSession.selectedTileId)
    || !isNonNegativeInteger(rawSession.errors)
    || !isNonNegativeInteger(rawSession.hints)
    || !isNonNegativeInteger(rawSession.elapsedSeconds)
    || typeof rawSession.paused !== "boolean"
  ) {
    return null;
  }
  return {
    schemaVersion: CROSSMATH_SAVE_SCHEMA_VERSION,
    savedAt: candidate.savedAt,
    session: {
      puzzle,
      placements: rawSession.placements,
      selectedTileId: rawSession.selectedTileId as string | null,
      history: rawSession.history as readonly PlacementSnapshot[],
      errors: Number(rawSession.errors),
      hints: Number(rawSession.hints),
      elapsedSeconds: Number(rawSession.elapsedSeconds),
      paused: false,
      pendingHint: null,
      mistakeRelationIds: [],
    },
  };
}
