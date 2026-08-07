import {assertSudokuGrid, findConflicts, getCandidates} from "./board.ts";
import {SUDOKU_CELL_COUNT, type SudokuDigit, type SudokuGrid, type SudokuValue} from "./types.ts";

interface EmptyCellChoice {
  readonly index: number;
  readonly candidates: readonly SudokuDigit[];
}

function chooseEmptyCell(grid: readonly SudokuValue[]): EmptyCellChoice | null {
  let choice: EmptyCellChoice | null = null;

  for (let index = 0; index < SUDOKU_CELL_COUNT; index += 1) {
    if (grid[index] !== 0) {
      continue;
    }
    const candidates = getCandidates(grid, index);
    if (candidates.length === 0) {
      return {index, candidates};
    }
    if (choice === null || candidates.length < choice.candidates.length) {
      choice = {index, candidates};
      if (candidates.length === 1) {
        return choice;
      }
    }
  }

  return choice;
}

export function solveSudoku(grid: SudokuGrid): SudokuGrid | null {
  assertSudokuGrid(grid);
  if (findConflicts(grid).length > 0) {
    return null;
  }
  const working = [...grid];

  function search(): boolean {
    const choice = chooseEmptyCell(working);
    if (choice === null) {
      return true;
    }
    for (const digit of choice.candidates) {
      working[choice.index] = digit;
      if (search()) {
        return true;
      }
    }
    working[choice.index] = 0;
    return false;
  }

  return search() ? working : null;
}

export function countSolutions(grid: SudokuGrid, limit = 2): number {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Solution limit must be a positive integer.");
  }
  assertSudokuGrid(grid);
  if (findConflicts(grid).length > 0) {
    return 0;
  }

  const working = [...grid];
  let count = 0;

  function search(): void {
    if (count >= limit) {
      return;
    }
    const choice = chooseEmptyCell(working);
    if (choice === null) {
      count += 1;
      return;
    }
    for (const digit of choice.candidates) {
      working[choice.index] = digit;
      search();
      if (count >= limit) {
        break;
      }
    }
    working[choice.index] = 0;
  }

  search();
  return count;
}

export function countSearchNodes(grid: SudokuGrid, nodeLimit = 100_000): number {
  assertSudokuGrid(grid);
  if (findConflicts(grid).length > 0) {
    return 0;
  }
  const working = [...grid];
  let nodes = 0;

  function search(): boolean {
    nodes += 1;
    if (nodes >= nodeLimit) {
      return false;
    }
    const choice = chooseEmptyCell(working);
    if (choice === null) {
      return true;
    }
    for (const digit of choice.candidates) {
      working[choice.index] = digit;
      if (search()) {
        return true;
      }
    }
    working[choice.index] = 0;
    return false;
  }

  search();
  return nodes;
}
