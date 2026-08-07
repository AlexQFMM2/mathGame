import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateGeometryPuzzle,
  findMinimumGeometryPerimeter,
  findGeometryHint,
  formatGridArchitectChallengeId,
  generateGridArchitect,
  geometryCellId,
  measureGeometrySelection,
  mirrorGeometryCellId,
  parseGridArchitectChallengeId,
  solveGeometryPuzzle,
} from "./index.ts";

function plainPuzzle(rows, columns, conditions, obstacles = [], landmarks = [geometryCellId(0, 0)]) {
  return {
    id: "geo-test",
    difficulty: "starter",
    seed: 1,
    rows,
    columns,
    cells: Array.from({length: rows * columns}, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const id = geometryCellId(row, column);
      return {id, row, column, terrain: obstacles.includes(id) ? "obstacle" : landmarks.includes(id) ? "landmark" : "ground"};
    }),
    conditions,
    knowledgeTags: [],
    solution: {selectedCellIds: []},
  };
}

test("area, shared-edge perimeter, connectivity and holes use exact grid geometry", () => {
  const puzzle = plainPuzzle(4, 4, []);
  const square = {selectedCellIds: [geometryCellId(0, 0), geometryCellId(0, 1), geometryCellId(1, 0), geometryCellId(1, 1)]};
  assert.deepEqual(measureGeometrySelection(puzzle, square), {area: 4, perimeter: 8, connected: true, holes: 0});
  const disconnected = {selectedCellIds: [geometryCellId(0, 0), geometryCellId(3, 3)]};
  assert.equal(measureGeometrySelection(puzzle, disconnected).connected, false);
  const ring = {selectedCellIds: Array.from({length: 9}, (_, index) => geometryCellId(Math.floor(index / 3), index % 3)).filter((id) => id !== geometryCellId(1, 1))};
  assert.equal(measureGeometrySelection(puzzle, ring).holes, 1);
});

test("condition evaluation accepts mathematical solutions rather than a stored shape", () => {
  const puzzle = plainPuzzle(3, 3, [
    {id: "area", kind: "area-equal", target: 3, label: "area"},
    {id: "perimeter", kind: "perimeter-equal", target: 8, label: "perimeter"},
    {id: "connected", kind: "connected", label: "connected"},
    {id: "landmarks", kind: "include-landmarks", label: "landmark"},
  ]);
  puzzle.solution = {selectedCellIds: [geometryCellId(0, 0), geometryCellId(0, 1), geometryCellId(0, 2)]};
  const alternative = {selectedCellIds: [geometryCellId(0, 0), geometryCellId(1, 0), geometryCellId(2, 0)]};
  assert.equal(evaluateGeometryPuzzle(puzzle, puzzle.solution).solved, true);
  assert.equal(evaluateGeometryPuzzle(puzzle, alternative).solved, true);
});

test("symmetry transforms and conflicting condition details are exact", () => {
  const dimensions = {rows: 3, columns: 4};
  assert.equal(mirrorGeometryCellId(dimensions, geometryCellId(0, 1), "horizontal"), geometryCellId(2, 1));
  assert.equal(mirrorGeometryCellId(dimensions, geometryCellId(0, 1), "vertical"), geometryCellId(0, 2));
  assert.equal(mirrorGeometryCellId(dimensions, geometryCellId(0, 1), "central"), geometryCellId(2, 2));
  assert.equal(mirrorGeometryCellId(dimensions, "outside" , "central"), null);

  const puzzle = plainPuzzle(3, 3, [
    {id: "holes", kind: "no-holes", label: "holes"},
    {id: "symmetry", kind: "symmetry", symmetry: "central", label: "symmetry"},
  ]);
  const ring = {selectedCellIds: Array.from({length: 9}, (_, index) => geometryCellId(Math.floor(index / 3), index % 3)).filter((id) => id !== geometryCellId(1, 1))};
  const evaluation = evaluateGeometryPuzzle(puzzle, ring);
  assert.equal(evaluation.solved, false);
  assert.deepEqual(evaluation.conditionResults[0].conflictCellIds, [geometryCellId(1, 1)]);
  assert.equal(evaluation.conditionResults[1].satisfied, true);
});

test("solver distinguishes zero, one and multiple solutions", () => {
  const baseConditions = [
    {id: "area", kind: "area-equal", target: 2, label: "area"},
    {id: "connected", kind: "connected", label: "connected"},
    {id: "landmarks", kind: "include-landmarks", label: "landmark"},
  ];
  const multiple = plainPuzzle(2, 2, baseConditions);
  const allMultiple = solveGeometryPuzzle(multiple, 3);
  assert.equal(allMultiple.solutions.length, 2);
  assert.equal(allMultiple.exhausted, true);
  assert.equal(solveGeometryPuzzle(multiple, 1).exhausted, false);
  const unique = plainPuzzle(2, 2, [...baseConditions, {id: "symmetry", kind: "symmetry", symmetry: "vertical", label: "symmetry"}]);
  assert.equal(solveGeometryPuzzle(unique, 2).solutions.length, 1);
  const none = plainPuzzle(2, 2, [{id: "area", kind: "area-equal", target: 5, label: "area"}]);
  assert.equal(solveGeometryPuzzle(none, 2).solutions.length, 0);
  assert.equal(solveGeometryPuzzle(multiple, 3, {maxVisits: 1}).exhausted, false);
});

test("minimum perimeter is accepted only after exhaustive optimization", () => {
  const puzzle = plainPuzzle(3, 3, [
    {id: "area", kind: "area-equal", target: 4, label: "area"},
    {id: "connected", kind: "connected", label: "connected"},
    {id: "landmarks", kind: "include-landmarks", label: "landmark"},
  ]);
  const minimum = findMinimumGeometryPerimeter(puzzle, 10_000);
  assert.equal(minimum?.perimeter, 8);
  const optimized = {...puzzle, conditions: [...puzzle.conditions, {id: "minimum", kind: "minimum-perimeter", target: 8, label: "minimum"}]};
  assert.equal(evaluateGeometryPuzzle(optimized, minimum.solution).solved, true);
  assert.equal(findMinimumGeometryPerimeter(puzzle, 1), null);
});

test("all difficulties generate reproducible, solvable puzzles", () => {
  for (const difficulty of ["starter", "easy", "normal", "hard"]) {
    for (const seed of [0, 1]) {
      const first = generateGridArchitect(difficulty, seed);
      assert.deepEqual(first, generateGridArchitect(difficulty, seed));
      assert.equal(first.rows, difficulty === "starter" ? 5 : difficulty === "easy" ? 6 : difficulty === "normal" ? 7 : 8);
      assert.equal(evaluateGeometryPuzzle(first, first.solution).solved, true);
      assert.ok(solveGeometryPuzzle(first, 1, {maxVisits: 250_000}).solutions.length >= 1);
      assert.ok(first.cells.some((cell) => cell.terrain === "landmark"));
      if (difficulty !== "starter") assert.ok(first.cells.some((cell) => cell.terrain === "obstacle"));
      const kinds = new Set(first.conditions.map((condition) => condition.kind));
      assert.ok(kinds.has("area-equal") && kinds.has("connected") && kinds.has("include-landmarks"));
      if (difficulty === "normal" || difficulty === "hard") {
        assert.ok(kinds.has("symmetry") && kinds.has("no-holes"));
      }
    }
    assert.notDeepEqual(generateGridArchitect(difficulty, 0), generateGridArchitect(difficulty, 1));
  }
});

test("hints are solver-derived and challenge IDs round-trip strictly", () => {
  const puzzle = generateGridArchitect("easy", 7);
  const hint = findGeometryHint(puzzle, {selectedCellIds: []});
  assert.equal(hint?.action, "build");
  assert.ok(puzzle.cells.some((cell) => cell.id === hint?.cellId));
  const id = formatGridArchitectChallengeId("hard", 0xffff_ffff);
  assert.deepEqual(parseGridArchitectChallengeId(id.toUpperCase()), {difficulty: "hard", seed: 0xffff_ffff});
  assert.equal(parseGridArchitectChallengeId("geo-x-12"), null);

  const multiple = plainPuzzle(3, 3, [
    {id: "area", kind: "area-equal", target: 3, label: "area"},
    {id: "connected", kind: "connected", label: "connected"},
    {id: "landmarks", kind: "include-landmarks", label: "landmark"},
  ]);
  const currentCell = geometryCellId(2, 0);
  const continuation = findGeometryHint(multiple, {selectedCellIds: [currentCell]});
  assert.equal(continuation?.action, "build");
  const overfilled = findGeometryHint(multiple, {selectedCellIds: [
    geometryCellId(0, 0), geometryCellId(0, 1), geometryCellId(1, 0), geometryCellId(1, 1),
  ]});
  assert.equal(overfilled?.action, "remove");
});
