import assert from "node:assert/strict";
import test from "node:test";
import {
  countSolutions,
  findConflicts,
  findLogicalHint,
  generateSudoku,
  getCandidates,
  isSolvedGrid,
  parseSudokuChallengeId,
  solveSudoku,
} from "./index.ts";

const UNIQUE_PUZZLE = [
  5, 3, 0, 0, 7, 0, 0, 0, 0,
  6, 0, 0, 1, 9, 5, 0, 0, 0,
  0, 9, 8, 0, 0, 0, 0, 6, 0,
  8, 0, 0, 0, 6, 0, 0, 0, 3,
  4, 0, 0, 8, 0, 3, 0, 0, 1,
  7, 0, 0, 0, 2, 0, 0, 0, 6,
  0, 6, 0, 0, 0, 0, 2, 8, 0,
  0, 0, 0, 4, 1, 9, 0, 0, 5,
  0, 0, 0, 0, 8, 0, 0, 7, 9,
];

test("candidate calculation does not mutate the board", () => {
  const original = [...UNIQUE_PUZZLE];
  assert.deepEqual(getCandidates(UNIQUE_PUZZLE, 2), [1, 2, 4]);
  assert.deepEqual(UNIQUE_PUZZLE, original);
});

test("solver handles unique, impossible and multiple-solution grids", () => {
  const solved = solveSudoku(UNIQUE_PUZZLE);
  assert.ok(solved);
  assert.equal(isSolvedGrid(solved), true);
  assert.equal(countSolutions(UNIQUE_PUZZLE), 1);

  const impossible = [...UNIQUE_PUZZLE];
  impossible[2] = 5;
  assert.ok(findConflicts(impossible).length > 0);
  assert.equal(countSolutions(impossible), 0);

  const invalidFullGrid = [...solved];
  invalidFullGrid[0] = invalidFullGrid[1];
  assert.equal(solveSudoku(invalidFullGrid), null);
  assert.equal(countSolutions(invalidFullGrid), 0);

  assert.equal(countSolutions(Array(81).fill(0), 2), 2);
});

test("logical hint returns proof data derived from the current board", () => {
  const almostSolved = [
    0, 3, 4, 6, 7, 8, 9, 1, 2,
    6, 7, 2, 1, 9, 5, 3, 4, 8,
    1, 9, 8, 3, 4, 2, 5, 6, 7,
    8, 5, 9, 7, 6, 1, 4, 2, 3,
    4, 2, 6, 8, 5, 3, 7, 9, 1,
    7, 1, 3, 9, 2, 4, 8, 5, 6,
    9, 6, 1, 5, 3, 7, 2, 8, 4,
    2, 8, 7, 4, 1, 9, 6, 3, 5,
    3, 4, 5, 2, 8, 6, 1, 7, 9,
  ];
  assert.deepEqual(findLogicalHint(almostSolved), {
    technique: "naked-single",
    target: {row: 0, column: 0},
    index: 0,
    digit: 5,
    candidates: [5],
  });
});

test("generator is repeatable and creates a unique puzzle for every difficulty", () => {
  const clueLimits = {easy: 42, medium: 34, hard: 30};
  for (const difficulty of ["easy", "medium", "hard"]) {
    const puzzle = generateSudoku(difficulty, 20260807);
    const repeated = generateSudoku(difficulty, 20260807);
    assert.deepEqual(puzzle, repeated);
    assert.equal(countSolutions(puzzle.puzzle), 1);
    assert.deepEqual(solveSudoku(puzzle.puzzle), puzzle.solution);
    assert.ok(puzzle.clueCount <= clueLimits[difficulty]);
  }
});

test("challenge ids restore the exact generated puzzle", () => {
  const original = generateSudoku("medium", 20260807);
  const reference = parseSudokuChallengeId(`  ${original.id.toUpperCase()}  `);
  assert.deepEqual(reference, {
    id: original.id,
    difficulty: "medium",
    seed: 20260807,
  });
  assert.deepEqual(generateSudoku(reference.difficulty, reference.seed), original);
});

test("challenge ids reject malformed or out-of-range seeds", () => {
  assert.equal(parseSudokuChallengeId("expert-abc"), null);
  assert.equal(parseSudokuChallengeId("easy-0"), null);
  assert.equal(parseSudokuChallengeId("easy-0001"), null);
  assert.equal(parseSudokuChallengeId("medium-1z141z4"), null);
  assert.equal(parseSudokuChallengeId("hard-a_b"), null);
  assert.equal(parseSudokuChallengeId(""), null);
});
