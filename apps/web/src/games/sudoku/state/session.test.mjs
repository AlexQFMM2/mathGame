import assert from "node:assert/strict";
import test from "node:test";
import {generateSudoku} from "@math-game/sudoku-core";
import {
  createSavedGame,
  createSudokuSession,
  isSessionComplete,
  restoreSavedGame,
  sudokuSessionReducer,
} from "./session.ts";

test("strict input rejects a wrong digit and accepts the solution", () => {
  const puzzle = generateSudoku("easy", 42);
  let session = createSudokuSession(puzzle);
  const index = session.selectedIndex;
  assert.notEqual(index, null);
  const solution = puzzle.solution[index];
  const wrong = solution === 9 ? 8 : 9;

  session = sudokuSessionReducer(session, {type: "input", digit: wrong});
  assert.equal(session.values[index], 0);
  assert.equal(session.errors, 1);

  session = sudokuSessionReducer(session, {type: "input", digit: solution});
  assert.equal(session.values[index], solution);
  assert.equal(session.history.length, 1);
});

test("undo restores values and auto-cleared notes as one action", () => {
  const puzzle = generateSudoku("easy", 31415);
  let session = createSudokuSession(puzzle);
  const index = session.selectedIndex;
  const digit = puzzle.solution[index];
  session = {...session, notes: session.notes.map((_, cell) => cell === index ? 1 << digit : 0)};
  session = sudokuSessionReducer(session, {type: "input", digit});
  assert.equal(session.notes[index], 0);
  session = sudokuSessionReducer(session, {type: "undo"});
  assert.equal(session.values[index], 0);
  assert.equal(session.notes[index], 1 << digit);
});

test("note mode toggles legal candidates and rejects obvious conflicts", () => {
  const puzzle = generateSudoku("easy", 2718);
  let session = createSudokuSession(puzzle);
  const index = session.selectedIndex;
  const peerDigit = session.values.find((value, cell) => value !== 0 && (
    Math.floor(cell / 9) === Math.floor(index / 9)
    || cell % 9 === index % 9
  ));
  assert.notEqual(peerDigit, undefined);

  session = sudokuSessionReducer(session, {type: "toggle-notes"});
  session = sudokuSessionReducer(session, {type: "input", digit: peerDigit});
  assert.equal(session.notes[index], 0);
  assert.equal(session.mistakeIndex, index);

  const legalDigit = puzzle.solution[index];
  session = sudokuSessionReducer(session, {type: "input", digit: legalDigit});
  assert.equal(session.notes[index], 1 << legalDigit);
  session = sudokuSessionReducer(session, {type: "input", digit: legalDigit});
  assert.equal(session.notes[index], 0);
});

test("saved session is versioned and validates its board shape", () => {
  const saved = createSavedGame(createSudokuSession(generateSudoku("medium", 7)));
  assert.deepEqual(restoreSavedGame(saved), saved);
  assert.equal(restoreSavedGame({...saved, schemaVersion: 2}), null);
  assert.equal(restoreSavedGame({...saved, session: {...saved.session, values: []}}), null);
});

test("a fully filled solution completes the game", () => {
  const puzzle = generateSudoku("easy", 99);
  const session = {...createSudokuSession(puzzle), values: puzzle.solution};
  assert.equal(isSessionComplete(session), true);
});
