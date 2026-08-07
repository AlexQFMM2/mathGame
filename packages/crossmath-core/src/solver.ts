import {getInvalidCrossMathGridRelationIds, reconstructCrossMathGrid} from "./gridRelations.ts";
import {rationalKey} from "./rational.ts";
import type {
  CrossMathPuzzle,
  CrossMathSymbol,
  CrossMathTile,
  CrossMathValueCell,
  CrossMathValueState,
  Rational,
  VariableName,
} from "./types.ts";

export function getInitialValueState(puzzle: CrossMathPuzzle): CrossMathValueState {
  return {
    cells: Object.fromEntries(
      puzzle.cells
        .filter((cell): cell is CrossMathValueCell => cell.kind === "value" && cell.fixedValue !== undefined)
        .map((cell) => [cell.id, cell.fixedValue as Rational]),
    ),
    variables: {},
    symbols: {},
  };
}

export function getPuzzleDestinationIds(puzzle: CrossMathPuzzle): readonly string[] {
  return [
    ...puzzle.cells
      .filter((cell) => cell.kind === "value" && cell.fixedValue === undefined)
      .map((cell) => cell.id),
    ...puzzle.variableNames.map((name) => `var:${name}`),
    ...puzzle.cells
      .filter((cell) => cell.kind === "symbol" && cell.fillable === true)
      .map((cell) => cell.id),
  ];
}

export function setDestinationValue(
  values: CrossMathValueState,
  destinationId: string,
  value: Rational | null,
): CrossMathValueState {
  if (destinationId.startsWith("var:")) {
    const name = destinationId.slice(4) as VariableName;
    const variables = {...values.variables};
    if (value === null) delete variables[name];
    else variables[name] = value;
    return {...values, variables};
  }
  const cells = {...values.cells};
  if (value === null) delete cells[destinationId];
  else cells[destinationId] = value;
  return {...values, cells};
}

export function setDestinationSymbol(
  values: CrossMathValueState,
  destinationId: string,
  symbol: CrossMathSymbol | null,
): CrossMathValueState {
  const symbols = {...values.symbols};
  if (symbol === null) delete symbols[destinationId];
  else symbols[destinationId] = symbol;
  return {...values, symbols};
}

export function getDestinationSymbol(
  values: CrossMathValueState,
  destinationId: string,
): CrossMathSymbol | null {
  return values.symbols[destinationId] ?? null;
}

export function getDestinationValue(
  values: CrossMathValueState,
  destinationId: string,
): Rational | null {
  return destinationId.startsWith("var:")
    ? values.variables[destinationId.slice(4) as VariableName] ?? null
    : values.cells[destinationId] ?? null;
}

function relationStatusIsValid(puzzle: CrossMathPuzzle, values: CrossMathValueState): boolean {
  return getInvalidCrossMathGridRelationIds(puzzle, values).length === 0;
}

type DestinationAssignment =
  | {readonly kind: "number"; readonly value: Rational}
  | {readonly kind: "symbol"; readonly symbol: CrossMathSymbol};

function isSymbolDestination(puzzle: CrossMathPuzzle, destinationId: string): boolean {
  return puzzle.cells.some((cell) => cell.id === destinationId && cell.kind === "symbol" && cell.fillable === true);
}

function getDestinationAssignment(
  puzzle: CrossMathPuzzle,
  values: CrossMathValueState,
  destinationId: string,
): DestinationAssignment | null {
  if (isSymbolDestination(puzzle, destinationId)) {
    const symbol = getDestinationSymbol(values, destinationId);
    return symbol === null ? null : {kind: "symbol", symbol};
  }
  const value = getDestinationValue(values, destinationId);
  return value === null ? null : {kind: "number", value};
}

function tileAssignment(tile: CrossMathTile): DestinationAssignment {
  return tile.kind === "number"
    ? {kind: "number", value: tile.value}
    : {kind: "symbol", symbol: tile.symbol};
}

function assignmentKey(assignment: DestinationAssignment): string {
  return assignment.kind === "number"
    ? `number:${rationalKey(assignment.value)}`
    : `symbol:${assignment.symbol}`;
}

function setDestinationAssignment(
  puzzle: CrossMathPuzzle,
  values: CrossMathValueState,
  destinationId: string,
  assignment: DestinationAssignment,
): CrossMathValueState | null {
  if (isSymbolDestination(puzzle, destinationId)) {
    return assignment.kind === "symbol" ? setDestinationSymbol(values, destinationId, assignment.symbol) : null;
  }
  return assignment.kind === "number" ? setDestinationValue(values, destinationId, assignment.value) : null;
}

function destinationWeight(puzzle: CrossMathPuzzle, destinationId: string): number {
  if (destinationId.startsWith("var:")) {
    const name = destinationId.slice(4) as VariableName;
    return puzzle.relations.filter((relation) => relation.variableNames.includes(name)).length;
  }
  const symbol = puzzle.cells.find((cell) => cell.id === destinationId && cell.kind === "symbol");
  if (symbol !== undefined) return symbol.relationIds.length;
  return puzzle.relations.filter((relation) => relation.cellIds.includes(destinationId)).length;
}

export function solveCrossMath(
  puzzle: CrossMathPuzzle,
  limit = 2,
  startingValues: CrossMathValueState = getInitialValueState(puzzle),
): readonly CrossMathValueState[] {
  if (!Number.isInteger(limit) || limit < 1) return [];
  const destinations = getPuzzleDestinationIds(puzzle)
    .filter((destinationId) => getDestinationAssignment(puzzle, startingValues, destinationId) === null);
  const relationIdsByDestination = new Map(getPuzzleDestinationIds(puzzle).map((destinationId) => {
    const relationIds = destinationId.startsWith("var:")
      ? puzzle.relations
          .filter((relation) => relation.variableNames.includes(destinationId.slice(4) as VariableName))
          .map((relation) => relation.id)
      : puzzle.cells.find((cell) => cell.id === destinationId)?.relationIds ?? [];
    return [destinationId, relationIds] as const;
  }));
  const destinationsByRelation = new Map(puzzle.relations.map((relation) => [
    relation.id,
    getPuzzleDestinationIds(puzzle).filter((destinationId) => relationIdsByDestination.get(destinationId)?.includes(relation.id)),
  ]));
  const assignedKeys = new Map<string, number>();
  for (const destinationId of getPuzzleDestinationIds(puzzle)) {
    const assignment = getDestinationAssignment(puzzle, startingValues, destinationId);
    if (assignment !== null) {
      const key = assignmentKey(assignment);
      assignedKeys.set(key, (assignedKeys.get(key) ?? 0) + 1);
    }
  }
  const remaining = new Map<string, {assignment: DestinationAssignment; count: number}>();
  for (const tile of puzzle.tiles) {
    const assignment = tileAssignment(tile);
    const key = assignmentKey(assignment);
    const item = remaining.get(key);
    remaining.set(key, {assignment, count: (item?.count ?? 0) + 1});
  }
  for (const [key, count] of assignedKeys) {
    const item = remaining.get(key);
    if (item !== undefined) item.count -= count;
  }
  if ([...remaining.values()].some((item) => item.count < 0)) return [];

  const results: CrossMathValueState[] = [];
  const visit = (unassigned: readonly string[], values: CrossMathValueState) => {
    if (results.length >= limit) return;
    if (unassigned.length === 0) {
      if (relationStatusIsValid(puzzle, values)) results.push(values);
      return;
    }
    const unresolvedCounts = new Map(puzzle.relations.map((relation) => [
      relation.id,
      (destinationsByRelation.get(relation.id) ?? [])
        .filter((destinationId) => getDestinationAssignment(puzzle, values, destinationId) === null).length,
    ]));
    const destinationId = [...unassigned].sort((left, right) => {
      const nearestClosure = (candidate: string) => Math.min(
        ...(relationIdsByDestination.get(candidate) ?? []).map((relationId) => unresolvedCounts.get(relationId) ?? 99),
        99,
      );
      return nearestClosure(left) - nearestClosure(right)
        || destinationWeight(puzzle, right) - destinationWeight(puzzle, left);
    })[0];
    if (destinationId === undefined) return;
    const nextUnassigned = unassigned.filter((candidate) => candidate !== destinationId);
    for (const item of remaining.values()) {
      if (item.count <= 0) continue;
      const next = setDestinationAssignment(puzzle, values, destinationId, item.assignment);
      if (next === null) continue;
      item.count -= 1;
      if (relationStatusIsValid(puzzle, next)) visit(nextUnassigned, next);
      item.count += 1;
      if (results.length >= limit) return;
    }
  };
  visit(destinations, startingValues);
  return results;
}

export function countCrossMathSolutions(puzzle: CrossMathPuzzle, limit = 2): number {
  return solveCrossMath(puzzle, limit).length;
}

export function isCrossMathSolved(puzzle: CrossMathPuzzle, values: CrossMathValueState): boolean {
  const destinations = getPuzzleDestinationIds(puzzle);
  const assignments = destinations.map((destinationId) => getDestinationAssignment(puzzle, values, destinationId));
  if (assignments.some((assignment) => assignment === null)) return false;
  const reconstructed = reconstructCrossMathGrid(puzzle, values);
  if (
    reconstructed.invalidRelationIds.length > 0
    || reconstructed.unresolvedRelationIds.length > 0
    || reconstructed.relations.length !== puzzle.relations.length
    || getInvalidCrossMathGridRelationIds(puzzle, values, true).length > 0
  ) return false;
  const expected = puzzle.tiles.map((tile) => assignmentKey(tileAssignment(tile)));
  const actual = assignments.map((assignment) => assignmentKey(assignment as DestinationAssignment));
  return expected.every((key) => {
    const index = actual.indexOf(key);
    if (index < 0) return false;
    actual.splice(index, 1);
    return true;
  }) && actual.length === 0;
}
