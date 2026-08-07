import {
  SUDOKU_BOX_SIZE,
  SUDOKU_CELL_COUNT,
  SUDOKU_SIZE,
  type SudokuDigit,
  type SudokuGrid,
  type SudokuPosition,
  type SudokuValue,
} from "./types.ts";

export const SUDOKU_DIGITS: readonly SudokuDigit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function assertSudokuGrid(grid: SudokuGrid): void {
  if (grid.length !== SUDOKU_CELL_COUNT) {
    throw new RangeError(`A Sudoku grid must contain ${SUDOKU_CELL_COUNT} cells.`);
  }

  for (const value of grid) {
    if (!Number.isInteger(value) || value < 0 || value > SUDOKU_SIZE) {
      throw new RangeError(`Invalid Sudoku cell value: ${value}.`);
    }
  }
}

export function positionToIndex(position: SudokuPosition): number {
  if (
    !Number.isInteger(position.row)
    || !Number.isInteger(position.column)
    || position.row < 0
    || position.row >= SUDOKU_SIZE
    || position.column < 0
    || position.column >= SUDOKU_SIZE
  ) {
    throw new RangeError("Sudoku position is outside the 9 × 9 board.");
  }

  return position.row * SUDOKU_SIZE + position.column;
}

export function indexToPosition(index: number): SudokuPosition {
  if (!Number.isInteger(index) || index < 0 || index >= SUDOKU_CELL_COUNT) {
    throw new RangeError("Sudoku index is outside the 9 × 9 board.");
  }

  return {
    row: Math.floor(index / SUDOKU_SIZE),
    column: index % SUDOKU_SIZE,
  };
}

export function getBoxIndex(index: number): number {
  const {row, column} = indexToPosition(index);
  return (
    Math.floor(row / SUDOKU_BOX_SIZE) * SUDOKU_BOX_SIZE
    + Math.floor(column / SUDOKU_BOX_SIZE)
  );
}

export function getUnitIndices(
  kind: "row" | "column" | "box",
  unit: number,
): readonly number[] {
  if (!Number.isInteger(unit) || unit < 0 || unit >= SUDOKU_SIZE) {
    throw new RangeError("Sudoku unit index is outside the board.");
  }

  if (kind === "row") {
    return Array.from({length: SUDOKU_SIZE}, (_, column) => unit * SUDOKU_SIZE + column);
  }

  if (kind === "column") {
    return Array.from({length: SUDOKU_SIZE}, (_, row) => row * SUDOKU_SIZE + unit);
  }

  const startRow = Math.floor(unit / SUDOKU_BOX_SIZE) * SUDOKU_BOX_SIZE;
  const startColumn = (unit % SUDOKU_BOX_SIZE) * SUDOKU_BOX_SIZE;
  return Array.from({length: SUDOKU_SIZE}, (_, offset) => (
    (startRow + Math.floor(offset / SUDOKU_BOX_SIZE)) * SUDOKU_SIZE
    + startColumn
    + (offset % SUDOKU_BOX_SIZE)
  ));
}

export function getPeerIndices(index: number): readonly number[] {
  const {row, column} = indexToPosition(index);
  const peers = new Set<number>([
    ...getUnitIndices("row", row),
    ...getUnitIndices("column", column),
    ...getUnitIndices("box", getBoxIndex(index)),
  ]);
  peers.delete(index);
  return [...peers].sort((left, right) => left - right);
}

export function isValidPlacement(
  grid: SudokuGrid,
  index: number,
  digit: SudokuDigit,
): boolean {
  assertSudokuGrid(grid);
  indexToPosition(index);
  return getPeerIndices(index).every((peer) => grid[peer] !== digit);
}

export function getCandidates(grid: SudokuGrid, index: number): readonly SudokuDigit[] {
  assertSudokuGrid(grid);
  indexToPosition(index);
  if (grid[index] !== 0) {
    return [];
  }

  const used = new Set<SudokuValue>(getPeerIndices(index).map((peer) => grid[peer] ?? 0));
  return SUDOKU_DIGITS.filter((digit) => !used.has(digit));
}

export function findConflicts(grid: SudokuGrid): readonly number[] {
  assertSudokuGrid(grid);
  const conflicts = new Set<number>();

  for (const kind of ["row", "column", "box"] as const) {
    for (let unit = 0; unit < SUDOKU_SIZE; unit += 1) {
      const seen = new Map<SudokuDigit, number>();
      for (const index of getUnitIndices(kind, unit)) {
        const value = grid[index] ?? 0;
        if (value === 0) {
          continue;
        }
        const previous = seen.get(value);
        if (previous !== undefined) {
          conflicts.add(previous);
          conflicts.add(index);
        } else {
          seen.set(value, index);
        }
      }
    }
  }

  return [...conflicts].sort((left, right) => left - right);
}

export function isSolvedGrid(grid: SudokuGrid): boolean {
  return grid.every((value) => value !== 0) && findConflicts(grid).length === 0;
}
