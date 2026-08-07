import assert from "node:assert/strict";
import test from "node:test";
import {
  addRational,
  compareByOperator,
  compareRational,
  countCrossMathSolutions,
  divideRational,
  evaluateRelation,
  findCrossMathHint,
  formatCrossMathChallengeId,
  formatRational,
  generateCrossMath,
  getInitialValueState,
  getInvalidCrossMathGridRelationIds,
  getPuzzleDestinationIds,
  isCrossMathSolved,
  multiplyRational,
  parseCrossMathChallengeId,
  rational,
  rationalFromDecimal,
  reconstructCrossMathGrid,
  setDestinationSymbol,
  setDestinationValue,
  solveCrossMath,
  subtractRational,
} from "./index.ts";

test("rational arithmetic stays exact and normalizes equivalent fractions", () => {
  assert.deepEqual(rational(2, 4), rational(1, 2));
  assert.deepEqual(rationalFromDecimal("1.25"), rational(5, 4));
  assert.deepEqual(addRational(rational(1, 3), rational(1, 6)), rational(1, 2));
  assert.deepEqual(multiplyRational(rational(2, 3), rational(9, 4)), rational(3, 2));
  assert.deepEqual(divideRational(rational(3, 5), rational(9, 10)), rational(2, 3));
  assert.equal(divideRational(rational(1), rational(0)), null);
  assert.equal(compareRational(rational(1, 2), rational(0.5 * 10, 10)), 0);
});

test("all five relation operators use exact values", () => {
  const values = {cells: {a: rational(1, 2), b: rational(2, 4)}, variables: {}};
  const makeRelation = (operator) => ({
    id: operator,
    left: {kind: "cell", cellId: "a"},
    operator,
    right: {kind: "cell", cellId: "b"},
    cellIds: ["a", "b"],
    variableNames: [],
    hintLabel: operator,
  });
  assert.equal(evaluateRelation(makeRelation("equal"), values), true);
  assert.equal(evaluateRelation(makeRelation("greater"), values), false);
  assert.equal(evaluateRelation(makeRelation("less"), values), false);
  assert.equal(evaluateRelation(makeRelation("greater-or-equal"), values), true);
  assert.equal(evaluateRelation(makeRelation("less-or-equal"), values), true);
});

function twoSlotPuzzle(result) {
  return {
    id: "test",
    difficulty: "starter",
    seed: 0,
    rows: 1,
    columns: 5,
    cells: [
      {id: "a", row: 0, column: 0, kind: "value", relationIds: ["sum"]},
      {id: "plus", row: 0, column: 1, kind: "symbol", symbol: "+", relationIds: ["sum"]},
      {id: "b", row: 0, column: 2, kind: "value", relationIds: ["sum"]},
      {id: "equals", row: 0, column: 3, kind: "symbol", symbol: "=", relationIds: ["sum"]},
      {id: "result", row: 0, column: 4, kind: "value", fixedValue: rational(result), relationIds: ["sum"]},
    ],
    relations: [{
      id: "sum",
      left: {kind: "binary", operator: "add", left: {kind: "cell", cellId: "a"}, right: {kind: "cell", cellId: "b"}},
      operator: "equal",
      right: {kind: "cell", cellId: "result"},
      cellIds: ["a", "b", "result"],
      variableNames: [],
      hintLabel: "a + b = result",
    }],
    tiles: [{id: "one", kind: "number", value: rational(1)}, {id: "two", kind: "number", value: rational(2)}],
    variableNames: [],
    knowledgeTags: [],
    solution: {cells: {a: rational(1), b: rational(2), result: rational(result)}, variables: {}},
  };
}

test("solver distinguishes no solution, a unique assignment and multiple assignments", () => {
  assert.equal(countCrossMathSolutions(twoSlotPuzzle(4)), 0);
  assert.equal(countCrossMathSolutions(twoSlotPuzzle(3)), 2);
  const unique = twoSlotPuzzle(-1);
  unique.cells[1].symbol = "−";
  unique.relations[0].left.operator = "subtract";
  assert.equal(countCrossMathSolutions(unique), 1);
  assert.equal(solveCrossMath(unique, 2).length, 1);
});

test("all four difficulties generate reproducible solvable tributary maps", () => {
  for (const difficulty of ["starter", "easy", "normal", "hard"]) {
    for (const seed of [0, 7]) {
      const first = generateCrossMath(difficulty, seed);
      const second = generateCrossMath(difficulty, seed);
      assert.deepEqual(first, second);
      assert.equal(first.rows, 14);
      assert.equal(first.columns, 14);
      assert.equal(first.cells.length, 196);
      assert.ok(first.cells.some((cell) => cell.kind === "blocked"));
      assert.equal(isCrossMathSolved(first, {
        cells: first.solution.cells,
        variables: first.solution.variables,
        symbols: Object.fromEntries(first.cells
          .filter((cell) => cell.kind === "symbol" && cell.fillable === true)
          .map((cell) => [cell.id, cell.symbol])),
      }), true, `${difficulty}:${seed} generated witness`);
      assert.equal(first.tiles.length, getPuzzleDestinationIds(first).length);
      assert.ok(first.tiles.length >= (difficulty === "starter" ? 9 : difficulty === "hard" ? 15 : 10));
    }
  }
  for (const difficulty of ["starter", "easy", "normal", "hard"]) {
    assert.ok(countCrossMathSolutions(generateCrossMath(difficulty, 0), 1) >= 1, `${difficulty}:0 independent solver`);
  }
});

test("tributaries use both equation sides without concatenating ambiguous lines", () => {
  for (const difficulty of ["starter", "easy", "normal", "hard"]) {
    for (const seed of [0, 7]) {
      const puzzle = generateCrossMath(difficulty, seed);
      const cellAt = new Map(puzzle.cells.map((cell) => [`${cell.row}:${cell.column}`, cell]));
      let expressionFirstCount = 0;
      let expressionLastCount = 0;
      for (const relation of puzzle.relations) {
        const relationCells = puzzle.cells.filter((cell) => (
          (cell.kind === "value" || cell.kind === "variable")
          && cell.relationIds.includes(relation.id)
        ));
        assert.ok(relationCells.length >= 2 && relationCells.length <= 4);
        const rows = relationCells.map((cell) => cell.row);
        const columns = relationCells.map((cell) => cell.column);
        const horizontal = new Set(rows).size === 1;
        const fixed = horizontal ? rows[0] : columns[0];
        const positions = horizontal ? columns : rows;
        const before = Math.min(...positions) - 1;
        const after = Math.max(...positions) + 1;
        for (const position of [before, after]) {
          if (position < 0 || position >= (horizontal ? puzzle.columns : puzzle.rows)) continue;
          const neighbor = cellAt.get(horizontal ? `${fixed}:${position}` : `${position}:${fixed}`);
          assert.equal(
            neighbor?.kind,
            "blocked",
            `${difficulty}:${seed}:${relation.id} must end before another visible operator`,
          );
        }
        const line = puzzle.cells
          .filter((cell) => cell.relationIds.includes(relation.id))
          .sort((left, right) => horizontal ? left.column - right.column : left.row - right.row);
        expressionFirstCount += relation.left.kind === "binary" ? 1 : 0;
        expressionLastCount += relation.right.kind === "binary" ? 1 : 0;
        assert.equal(evaluateRelation(relation, {
          cells: puzzle.solution.cells,
          variables: puzzle.solution.variables,
          symbols: {},
        }), true, `${difficulty}:${seed}:${relation.id} must be true across both visible sides`);
      }
      assert.ok(expressionFirstCount > 0, `${difficulty}:${seed} must place expressions on the left or top`);
      assert.ok(expressionLastCount > 0, `${difficulty}:${seed} must place expressions on the right or bottom`);
    }
  }
});

test("difficulty content includes comparisons, exact fractions and shared variables", () => {
  const starter = generateCrossMath("starter", 0);
  const easy = generateCrossMath("easy", 0);
  const normal = generateCrossMath("normal", 0);
  const hard = generateCrossMath("hard", 0);
  assert.ok(starter.relations.every((relation) => relation.operator === "equal"));
  assert.ok(easy.relations.some((relation) => relation.operator === "greater" || relation.operator === "less"));
  const comparisonCount = (puzzle) => puzzle.relations.filter((relation) => relation.operator !== "equal").length;
  assert.equal(comparisonCount(easy), 4);
  assert.equal(comparisonCount(normal), 4);
  assert.equal(comparisonCount(hard), 5);
  const normalLabels = Object.values(normal.solution.cells).map(formatRational);
  assert.equal(normalLabels.filter((label) => label.includes("/")).length, 4);
  assert.ok(normalLabels.some((label) => label.includes(".")));
  assert.deepEqual(hard.variableNames, ["a", "b", "c"]);
  assert.equal(hard.tiles.filter((tile) => tile.kind === "symbol").length, 6);
  assert.equal(hard.cells.filter((cell) => cell.kind === "symbol" && cell.fillable === true).length, 6);
  for (const name of hard.variableNames) {
    assert.equal(hard.cells.filter((cell) => cell.kind === "variable" && cell.variable === name).length, 2);
    assert.ok(hard.relations.filter((relation) => relation.variableNames.includes(name)).length >= 2);
  }
  const visited = new Set([hard.relations[0].id]);
  while (true) {
    const next = hard.relations.find((relation) => !visited.has(relation.id) && hard.relations.some((seen) => (
      visited.has(seen.id)
      && (relation.cellIds.some((id) => seen.cellIds.includes(id)) || relation.variableNames.some((name) => seen.variableNames.includes(name)))
    )));
    if (next === undefined) break;
    visited.add(next.id);
  }
  assert.equal(visited.size, hard.relations.length, "hard puzzle must be one connected relation network");
  assert.ok(hard.cells.some((cell) => (cell.kind === "value" || cell.kind === "variable") && cell.relationIds.length >= 2));
  const firstMask = generateCrossMath("hard", 21).cells.filter((cell) => cell.kind !== "blocked").map((cell) => `${cell.row}:${cell.column}`).sort();
  const secondMask = generateCrossMath("hard", 22).cells.filter((cell) => cell.kind !== "blocked").map((cell) => `${cell.row}:${cell.column}`).sort();
  assert.notDeepEqual(firstMask, secondMask, "different seeds should dig different tributary maps");
});

test("relation-centered parsing preserves operand order on both sides", () => {
  const puzzle = generateCrossMath("easy", 0);
  const values = {
    cells: puzzle.solution.cells,
    variables: puzzle.solution.variables,
    symbols: Object.fromEntries(puzzle.cells
      .filter((cell) => cell.kind === "symbol" && cell.fillable === true)
      .map((cell) => [cell.id, cell.symbol])),
  };
  const reconstructed = reconstructCrossMathGrid(puzzle, values);
  assert.deepEqual(reconstructed.invalidRelationIds, []);
  assert.deepEqual(reconstructed.unresolvedRelationIds, []);
  let arithmeticSideCount = 0;
  const leaves = (expression) => expression.kind === "binary"
    ? [...leaves(expression.left), ...leaves(expression.right)]
    : [expression];
  for (const relation of reconstructed.relations) {
    const line = puzzle.cells
      .filter((cell) => cell.kind !== "blocked" && cell.relationIds.includes(relation.id))
      .sort((left, right) => left.row === right.row ? left.column - right.column : left.row - right.row);
    const expressionFor = (cell) => cell.kind === "value"
        ? {kind: "cell", cellId: cell.id}
        : {kind: "variable", name: cell.variable};
    const relationIndex = line.findIndex((cell) => cell.kind === "symbol" && ["=", ">", "<", "≥", "≤"].includes(cell.symbol));
    const expectedLeft = line.slice(0, relationIndex)
      .filter((cell) => cell.kind === "value" || cell.kind === "variable")
      .map(expressionFor);
    const expectedRight = line.slice(relationIndex + 1)
      .filter((cell) => cell.kind === "value" || cell.kind === "variable")
      .map(expressionFor);
    assert.deepEqual(leaves(relation.left), expectedLeft);
    assert.deepEqual(leaves(relation.right), expectedRight);
    arithmeticSideCount += expectedLeft.length > 1 ? 1 : 0;
    arithmeticSideCount += expectedRight.length > 1 ? 1 : 0;
    assert.equal(evaluateRelation(relation, values), true);
  }
  assert.ok(arithmeticSideCount > 0);
});

test("vertical comparisons evaluate the top value against the bottom value", () => {
  const puzzle = {
    id: "vertical-comparison",
    difficulty: "easy",
    seed: 0,
    rows: 3,
    columns: 1,
    cells: [
      {id: "top", row: 0, column: 0, kind: "value", fixedValue: rational(8), relationIds: ["vertical"]},
      {id: "comparison", row: 1, column: 0, kind: "symbol", symbol: ">", relationIds: ["vertical"]},
      {id: "bottom", row: 2, column: 0, kind: "value", fixedValue: rational(4), relationIds: ["vertical"]},
    ],
    relations: [{
      id: "vertical",
      left: {kind: "cell", cellId: "top"},
      operator: "greater",
      right: {kind: "cell", cellId: "bottom"},
      cellIds: ["top", "bottom"],
      variableNames: [],
      hintLabel: "top greater than bottom",
    }],
    tiles: [],
    variableNames: [],
    knowledgeTags: [],
    solution: {cells: {top: rational(8), bottom: rational(4)}, variables: {}},
  };
  const values = {...puzzle.solution, symbols: {}};
  const greater = reconstructCrossMathGrid(puzzle, values).relations[0];
  assert.deepEqual(greater.left, {kind: "cell", cellId: "top"});
  assert.deepEqual(greater.right, {kind: "cell", cellId: "bottom"});
  assert.equal(evaluateRelation(greater, values), true);

  puzzle.cells[1].symbol = "<";
  const less = reconstructCrossMathGrid(puzzle, values).relations[0];
  assert.equal(evaluateRelation(less, values), false);
});

test("fillable symbols are judged by their final grid positions instead of their generated positions", () => {
  const puzzle = twoSlotPuzzle(2);
  puzzle.tiles.splice(0, 2,
    {id: "two", kind: "number", value: rational(2)},
    {id: "zero", kind: "number", value: rational(0)},
  );
  puzzle.cells[1].fillable = true;
  puzzle.cells[3].fillable = true;
  puzzle.tiles.push(
    {id: "plus-tile", kind: "symbol", symbol: "+"},
    {id: "equals-tile", kind: "symbol", symbol: "="},
  );
  const original = setDestinationSymbol(
    setDestinationSymbol(getInitialValueState(puzzle), "plus", "+"),
    "equals",
    "=",
  );
  const swapped = setDestinationSymbol(
    setDestinationSymbol(getInitialValueState(puzzle), "plus", "="),
    "equals",
    "+",
  );
  for (const values of [original, swapped]) {
    const complete = setDestinationValue(setDestinationValue(values, "a", rational(2)), "b", rational(0));
    assert.equal(isCrossMathSolved(puzzle, complete), true);
  }
  const malformed = setDestinationSymbol(
    setDestinationSymbol(getInitialValueState(puzzle), "plus", "+"),
    "equals",
    "−",
  );
  assert.deepEqual(getInvalidCrossMathGridRelationIds(puzzle, malformed), ["sum"]);
});

test("challenge IDs parse strictly and preserve the unsigned seed", () => {
  const id = formatCrossMathChallengeId("hard", 0xffff_ffff);
  assert.deepEqual(parseCrossMathChallengeId(id.toUpperCase()), {difficulty: "hard", seed: 0xffff_ffff});
  assert.equal(parseCrossMathChallengeId("cross-x-12"), null);
  assert.equal(parseCrossMathChallengeId("cross-h-zzzzzzzzzz"), null);
  assert.equal(parseCrossMathChallengeId("sudoku-hard-1"), null);
});

test("hints return a remaining tile and a verifiable destination", () => {
  const puzzle = generateCrossMath("starter", 91);
  const values = getInitialValueState(puzzle);
  const hint = findCrossMathHint(puzzle, values, puzzle.tiles.filter((tile) => tile.kind === "number").map((tile) => tile.value));
  assert.notEqual(hint, null);
  const next = setDestinationValue(values, hint.destinationId, hint.value);
  assert.deepEqual(next.cells[hint.destinationId] ?? next.variables[hint.destinationId.slice(4)], hint.value);
});
