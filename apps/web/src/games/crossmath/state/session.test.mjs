import assert from "node:assert/strict";
import test from "node:test";
import {
  equalRational,
  generateCrossMath,
  getPuzzleDestinationIds,
} from "@math-game/crossmath-core";
import {
  createCrossMathSession,
  createCrossMathValueState,
  createSavedCrossMathGame,
  crossMathSessionReducer,
  getUnusedCrossMathTiles,
  isCrossMathSessionComplete,
  restoreSavedCrossMathGame,
} from "./session.ts";

function solutionValue(puzzle, destinationId) {
  return destinationId.startsWith("var:")
    ? puzzle.solution.variables[destinationId.slice(4)]
    : puzzle.solution.cells[destinationId];
}

function completeSession(session) {
  for (const destinationId of getPuzzleDestinationIds(session.puzzle)) {
    const expected = solutionValue(session.puzzle, destinationId);
    const expectedSymbol = session.puzzle.cells.find((cell) => cell.id === destinationId && cell.kind === "symbol")?.symbol;
    const tile = getUnusedCrossMathTiles(session).find((candidate) => expectedSymbol === undefined
      ? candidate.kind === "number" && equalRational(candidate.value, expected)
      : candidate.kind === "symbol" && candidate.symbol === expectedSymbol);
    assert.notEqual(tile, undefined, `missing tile for ${destinationId}`);
    session = crossMathSessionReducer(session, {type: "select-tile", tileId: tile.id});
    session = crossMathSessionReducer(session, {type: "place", destinationId});
  }
  return session;
}

test("tap tile then destination places, moves and returns a tile without duplication", () => {
  let session = createCrossMathSession(generateCrossMath("starter", 0));
  const [firstDestination, secondDestination] = getPuzzleDestinationIds(session.puzzle);
  const firstTile = session.puzzle.tiles[0];
  assert.ok(firstDestination && secondDestination && firstTile);

  session = crossMathSessionReducer(session, {type: "select-tile", tileId: firstTile.id});
  session = crossMathSessionReducer(session, {type: "place", destinationId: firstDestination});
  assert.equal(session.placements[firstDestination], firstTile.id);

  session = crossMathSessionReducer(session, {type: "select-tile", tileId: firstTile.id});
  session = crossMathSessionReducer(session, {type: "place", destinationId: secondDestination});
  assert.equal(session.placements[firstDestination], undefined);
  assert.equal(session.placements[secondDestination], firstTile.id);
  assert.equal(Object.values(session.placements).filter((id) => id === firstTile.id).length, 1);

  session = crossMathSessionReducer(session, {type: "place", destinationId: secondDestination});
  assert.equal(session.placements[secondDestination], undefined);
  assert.ok(getUnusedCrossMathTiles(session).some((tile) => tile.id === firstTile.id));
});

test("number and symbol tiles stay in their own slots and validation waits until the map is full", () => {
  let session = createCrossMathSession(generateCrossMath("starter", 0));
  const numberDestination = getPuzzleDestinationIds(session.puzzle).find((id) => session.puzzle.solution.cells[id] !== undefined);
  const symbolCell = session.puzzle.cells.find((cell) => cell.kind === "symbol" && cell.fillable === true);
  const numberTile = session.puzzle.tiles.find((tile) => tile.kind === "number");
  const wrongSymbolTile = session.puzzle.tiles.find((tile) => tile.kind === "symbol" && tile.symbol !== symbolCell?.symbol);
  assert.ok(numberDestination && symbolCell && numberTile && wrongSymbolTile);

  session = crossMathSessionReducer(session, {type: "select-tile", tileId: wrongSymbolTile.id});
  session = crossMathSessionReducer(session, {type: "place", destinationId: numberDestination});
  assert.deepEqual(session.placements, {});
  session = crossMathSessionReducer(session, {type: "select-tile", tileId: numberTile.id});
  session = crossMathSessionReducer(session, {type: "place", destinationId: symbolCell.id});
  assert.deepEqual(session.placements, {});

  session = crossMathSessionReducer(session, {type: "select-tile", tileId: wrongSymbolTile.id});
  session = crossMathSessionReducer(session, {type: "place", destinationId: symbolCell.id});
  assert.equal(session.placements[symbolCell.id], wrongSymbolTile.id);
  assert.deepEqual(session.mistakeRelationIds, []);
  assert.equal(session.errors, 0);
});

test("a full invalid map ejects cards from conflicting tributaries", () => {
  let session = createCrossMathSession(generateCrossMath("starter", 0));
  const destinations = getPuzzleDestinationIds(session.puzzle);
  const symbolDestinations = destinations.filter((id) => session.puzzle.cells.some((cell) => cell.id === id && cell.kind === "symbol"));
  const firstSymbol = session.puzzle.cells.find((cell) => cell.id === symbolDestinations[0] && cell.kind === "symbol");
  const secondSymbol = session.puzzle.cells.find((cell) => cell.id === symbolDestinations[1] && cell.kind === "symbol");
  assert.ok(firstSymbol && secondSymbol && firstSymbol.symbol !== secondSymbol.symbol);

  for (const destinationId of destinations) {
    const expected = solutionValue(session.puzzle, destinationId);
    const expectedSymbol = session.puzzle.cells.find((cell) => cell.id === destinationId && cell.kind === "symbol")?.symbol;
    const swappedSymbol = destinationId === symbolDestinations[0]
      ? secondSymbol.symbol
      : destinationId === symbolDestinations[1]
        ? firstSymbol.symbol
        : expectedSymbol;
    const tile = getUnusedCrossMathTiles(session).find((candidate) => swappedSymbol === undefined
      ? candidate.kind === "number" && equalRational(candidate.value, expected)
      : candidate.kind === "symbol" && candidate.symbol === swappedSymbol);
    assert.ok(tile, `missing tile for ${destinationId}`);
    session = crossMathSessionReducer(session, {type: "select-tile", tileId: tile.id});
    session = crossMathSessionReducer(session, {type: "place", destinationId});
  }

  assert.equal(isCrossMathSessionComplete(session), false);
  assert.equal(session.errors, 1);
  assert.ok(session.mistakeRelationIds.length > 0);
  assert.ok(Object.keys(session.placements).length < session.puzzle.tiles.length);
  assert.ok(getUnusedCrossMathTiles(session).length > 0);
});

test("solution placements complete all four difficulty sessions", () => {
  for (const difficulty of ["starter", "easy", "normal", "hard"]) {
    const session = completeSession(createCrossMathSession(generateCrossMath(difficulty, 0)));
    assert.equal(isCrossMathSessionComplete(session), true, difficulty);
    assert.equal(getUnusedCrossMathTiles(session).length, 0);
  }
});

test("undo, reset, pause and timer preserve coherent session state", () => {
  let session = createCrossMathSession(generateCrossMath("easy", 0));
  const destinationId = getPuzzleDestinationIds(session.puzzle)[0];
  const tileId = session.puzzle.tiles[0]?.id;
  assert.ok(destinationId && tileId);
  session = crossMathSessionReducer(session, {type: "select-tile", tileId});
  session = crossMathSessionReducer(session, {type: "place", destinationId});
  assert.equal(Object.keys(session.placements).length, 1);
  session = crossMathSessionReducer(session, {type: "undo"});
  assert.deepEqual(session.placements, {});
  session = crossMathSessionReducer(session, {type: "tick"});
  assert.equal(session.elapsedSeconds, 1);
  session = crossMathSessionReducer(session, {type: "toggle-pause"});
  session = crossMathSessionReducer(session, {type: "tick"});
  assert.equal(session.elapsedSeconds, 1);
  assert.equal(session.paused, true);
});

test("structured hints can be applied using an available tile", () => {
  let session = createCrossMathSession(generateCrossMath("hard", 0));
  session = crossMathSessionReducer(session, {type: "request-hint"});
  assert.notEqual(session.pendingHint, null);
  const destinationId = session.pendingHint.destinationId;
  session = crossMathSessionReducer(session, {type: "apply-hint"});
  assert.equal(session.hints, 1);
  assert.ok(session.placements[destinationId]);
});

test("a hint relocates a required tile when an inequality placement dead-ends the remaining bank", () => {
  let session = createCrossMathSession(generateCrossMath("normal", 0));
  const destinations = getPuzzleDestinationIds(session.puzzle)
    .filter((destinationId) => solutionValue(session.puzzle, destinationId) !== undefined);
  const neededDestination = destinations.find((destinationId, index) => destinations.slice(index + 1).some((candidate) => (
    !equalRational(solutionValue(session.puzzle, destinationId), solutionValue(session.puzzle, candidate))
  )));
  assert.ok(neededDestination);
  const neededValue = solutionValue(session.puzzle, neededDestination);
  const wrongDestination = destinations.find((destinationId) => (
    destinationId !== neededDestination
    && !equalRational(solutionValue(session.puzzle, destinationId), neededValue)
  ));
  const neededTile = session.puzzle.tiles.find((tile) => tile.kind === "number" && equalRational(tile.value, neededValue));
  assert.ok(neededDestination && wrongDestination && neededTile);

  session = crossMathSessionReducer(session, {type: "select-tile", tileId: neededTile.id});
  session = crossMathSessionReducer(session, {type: "place", destinationId: wrongDestination});
  session = crossMathSessionReducer(session, {type: "request-hint"});
  assert.equal(session.pendingHint?.destinationId, neededDestination);
  assert.equal(session.pendingHint?.movesExistingTile, true);

  session = crossMathSessionReducer(session, {type: "apply-hint"});
  assert.equal(session.placements[neededDestination], neededTile.id);
  assert.equal(session.placements[wrongDestination], undefined);
  assert.equal(session.hints, 1);
});

test("versioned save restores from regenerated puzzle and rejects corrupt placements", () => {
  let session = createCrossMathSession(generateCrossMath("normal", 0));
  const destinationId = getPuzzleDestinationIds(session.puzzle)[0];
  const tileId = session.puzzle.tiles[0]?.id;
  assert.ok(destinationId && tileId);
  session = crossMathSessionReducer(session, {type: "select-tile", tileId});
  session = crossMathSessionReducer(session, {type: "place", destinationId});
  const saved = createSavedCrossMathGame(session);
  const restored = restoreSavedCrossMathGame(saved);
  assert.notEqual(restored, null);
  assert.deepEqual(restored.session.placements, session.placements);
  assert.deepEqual(createCrossMathValueState(restored.session), createCrossMathValueState(session));
  assert.equal(restoreSavedCrossMathGame({...saved, schemaVersion: 3}), null);
  assert.equal(restoreSavedCrossMathGame({
    ...saved,
    session: {...saved.session, placements: {unknown: tileId}},
  }), null);
  assert.equal(restoreSavedCrossMathGame({
    ...saved,
    session: {...saved.session, placements: {[destinationId]: "missing-tile"}},
  }), null);
});
