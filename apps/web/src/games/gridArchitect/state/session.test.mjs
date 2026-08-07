import assert from "node:assert/strict";
import test from "node:test";
import {generateGridArchitect} from "@math-game/grid-architect-core";
import {
  createGridArchitectSession,
  createSavedGridArchitectGame,
  gridArchitectSessionReducer,
  isGridArchitectSessionComplete,
  restoreSavedGridArchitectGame,
} from "./session.ts";

test("cells toggle, obstacles reject input and undo/reset restore snapshots", () => {
  let session = createGridArchitectSession(generateGridArchitect("normal", 0));
  const ground = session.puzzle.cells.find((cell) => cell.terrain !== "obstacle");
  const obstacle = session.puzzle.cells.find((cell) => cell.terrain === "obstacle");
  assert.ok(ground && obstacle);
  session = gridArchitectSessionReducer(session, {type: "toggle-cell", cellId: obstacle.id});
  assert.deepEqual(session.selectedCellIds, []);
  session = gridArchitectSessionReducer(session, {type: "toggle-cell", cellId: ground.id});
  assert.deepEqual(session.selectedCellIds, [ground.id]);
  session = gridArchitectSessionReducer(session, {type: "undo"});
  assert.deepEqual(session.selectedCellIds, []);
  session = gridArchitectSessionReducer(session, {type: "toggle-cell", cellId: ground.id});
  session = gridArchitectSessionReducer(session, {type: "reset"});
  assert.deepEqual(session.selectedCellIds, []);
});

test("checking an invalid shape counts one adjustment and a valid alternative completes", () => {
  let session = createGridArchitectSession(generateGridArchitect("starter", 0));
  session = gridArchitectSessionReducer(session, {type: "check"});
  assert.equal(session.errors, 1);
  assert.equal(isGridArchitectSessionComplete(session), false);
  for (const cellId of session.puzzle.solution.selectedCellIds) {
    session = gridArchitectSessionReducer(session, {type: "toggle-cell", cellId});
  }
  session = gridArchitectSessionReducer(session, {type: "check"});
  assert.equal(isGridArchitectSessionComplete(session), true);
});

test("pause, timer and structured hints remain coherent", () => {
  let session = createGridArchitectSession(generateGridArchitect("hard", 1));
  session = gridArchitectSessionReducer(session, {type: "tick"});
  assert.equal(session.elapsedSeconds, 1);
  session = gridArchitectSessionReducer(session, {type: "toggle-pause"});
  session = gridArchitectSessionReducer(session, {type: "tick"});
  assert.equal(session.elapsedSeconds, 1);
  session = gridArchitectSessionReducer(session, {type: "toggle-pause"});
  session = gridArchitectSessionReducer(session, {type: "request-hint"});
  assert.notEqual(session.pendingHint, null);
  const hintedId = session.pendingHint.cellId;
  session = gridArchitectSessionReducer(session, {type: "apply-hint"});
  assert.equal(session.hints, 1);
  assert.ok(session.selectedCellIds.includes(hintedId));
});

test("versioned saves regenerate the puzzle and reject corrupt state", () => {
  let session = createGridArchitectSession(generateGridArchitect("easy", 9));
  const cell = session.puzzle.cells.find((candidate) => candidate.terrain !== "obstacle");
  assert.ok(cell);
  session = gridArchitectSessionReducer(session, {type: "toggle-cell", cellId: cell.id});
  const saved = createSavedGridArchitectGame(session);
  const restored = restoreSavedGridArchitectGame(saved);
  assert.deepEqual(restored?.session.selectedCellIds, session.selectedCellIds);
  assert.equal(restoreSavedGridArchitectGame({...saved, schemaVersion: 2}), null);
  assert.equal(restoreSavedGridArchitectGame({...saved, session: {...saved.session, selectedCellIds: ["missing"]}}), null);
});
