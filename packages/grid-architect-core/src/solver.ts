import {evaluateGeometryPuzzle, geometryCellId, mirrorGeometryCellId} from "./geometry.ts";
import type {
  GeometrySelection,
  GeometrySolveResult,
  GridArchitectPuzzle,
  SymmetryKind,
} from "./types.ts";

const DIRECTIONS = [
  {row: -1, column: 0},
  {row: 1, column: 0},
  {row: 0, column: -1},
  {row: 0, column: 1},
] as const;

function positionOf(id: string): {readonly row: number; readonly column: number} | null {
  const match = /^cell-(\d+)-(\d+)$/.exec(id);
  return match === null ? null : {row: Number(match[1]), column: Number(match[2])};
}

function stableHash(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 0x45d9_f3b) >>> 0;
  return hash;
}

function symmetryOf(puzzle: GridArchitectPuzzle): SymmetryKind | null {
  return puzzle.conditions.find((condition) => condition.kind === "symmetry")?.symmetry ?? null;
}

function closureFor(
  puzzle: GridArchitectPuzzle,
  cellId: string,
  symmetry: SymmetryKind | null,
): readonly string[] {
  if (symmetry === null) return [cellId];
  const mirror = mirrorGeometryCellId(puzzle, cellId, symmetry);
  return mirror === null || mirror === cellId ? [cellId] : [cellId, mirror];
}

export function solveGeometryPuzzle(
  puzzle: GridArchitectPuzzle,
  solutionLimit = 2,
  options: {
    readonly maxVisits?: number;
    readonly ignoredConditionKinds?: readonly string[];
    readonly requiredCellIds?: readonly string[];
  } = {},
): GeometrySolveResult {
  const maxVisits = options.maxVisits ?? 150_000;
  const ignoredConditionKinds = options.ignoredConditionKinds ?? [];
  const areaTarget = puzzle.conditions.find((condition) => condition.kind === "area-equal")?.target;
  if (areaTarget === undefined || solutionLimit < 1) return {solutions: [], visits: 0, exhausted: true};
  const allowed = new Set(puzzle.cells.filter((cell) => cell.terrain !== "obstacle").map((cell) => cell.id));
  const symmetry = symmetryOf(puzzle);
  const landmarks = puzzle.cells.filter((cell) => cell.terrain === "landmark").map((cell) => cell.id);
  const initial = new Set<string>();
  for (const required of [...landmarks, ...(options.requiredCellIds ?? [])]) {
    for (const id of closureFor(puzzle, required, symmetry)) {
      if (!allowed.has(id)) return {solutions: [], visits: 0, exhausted: true};
      initial.add(id);
    }
  }
  if (initial.size === 0) {
    const first = puzzle.cells.find((cell) => cell.terrain !== "obstacle");
    if (first === undefined) return {solutions: [], visits: 0, exhausted: true};
    closureFor(puzzle, first.id, symmetry).forEach((id) => initial.add(id));
  }

  const visited = new Set<string>();
  const solutions: GeometrySelection[] = [];
  let visits = 0;
  let stopped = false;
  let reachedVisitLimit = false;
  let reachedSolutionLimit = false;
  const visit = (selected: ReadonlySet<string>) => {
    if (stopped) return;
    visits += 1;
    if (visits > maxVisits) {
      stopped = true;
      reachedVisitLimit = true;
      return;
    }
    const key = [...selected].sort().join("|");
    if (visited.has(key)) return;
    visited.add(key);
    if (selected.size > areaTarget) return;
    if (selected.size === areaTarget) {
      const selection = {selectedCellIds: [...selected].sort()};
      if (evaluateGeometryPuzzle(puzzle, selection, ignoredConditionKinds).solved) {
        solutions.push(selection);
        if (solutions.length >= solutionLimit) {
          stopped = true;
          reachedSolutionLimit = true;
        }
      }
      return;
    }

    const frontier = new Set<string>();
    for (const id of selected) {
      const position = positionOf(id);
      if (position === null) continue;
      for (const direction of DIRECTIONS) {
        const row = position.row + direction.row;
        const column = position.column + direction.column;
        const candidate = geometryCellId(row, column);
        if (row >= 0 && row < puzzle.rows && column >= 0 && column < puzzle.columns && allowed.has(candidate) && !selected.has(candidate)) {
          frontier.add(candidate);
        }
      }
    }
    const candidates = [...frontier].sort((left, right) => stableHash(left, puzzle.seed) - stableHash(right, puzzle.seed));
    for (const candidate of candidates) {
      const additions = closureFor(puzzle, candidate, symmetry);
      if (additions.some((id) => !allowed.has(id)) || selected.size + additions.filter((id) => !selected.has(id)).length > areaTarget) continue;
      const next = new Set(selected);
      additions.forEach((id) => next.add(id));
      visit(next);
      if (stopped) return;
    }
  };
  visit(initial);
  return {solutions, visits, exhausted: !reachedVisitLimit && !reachedSolutionLimit};
}

export function findMinimumGeometryPerimeter(
  puzzle: GridArchitectPuzzle,
  maxVisits = 300_000,
): {readonly perimeter: number; readonly solution: GeometrySelection; readonly visits: number} | null {
  const result = solveGeometryPuzzle(puzzle, Number.MAX_SAFE_INTEGER, {
    maxVisits,
    ignoredConditionKinds: ["perimeter-equal", "perimeter-at-most", "minimum-perimeter"],
  });
  if (!result.exhausted || result.solutions.length === 0) return null;
  let best = result.solutions[0] as GeometrySelection;
  let perimeter = evaluateGeometryPuzzle(puzzle, best, ["perimeter-equal", "perimeter-at-most", "minimum-perimeter"]).metrics.perimeter;
  for (const solution of result.solutions.slice(1)) {
    const candidate = evaluateGeometryPuzzle(puzzle, solution, ["perimeter-equal", "perimeter-at-most", "minimum-perimeter"]).metrics.perimeter;
    if (candidate < perimeter) {
      best = solution;
      perimeter = candidate;
    }
  }
  return {perimeter, solution: best, visits: result.visits};
}
