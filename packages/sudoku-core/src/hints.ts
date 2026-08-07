import {getBoxIndex, getCandidates, getUnitIndices, indexToPosition, SUDOKU_DIGITS} from "./board.ts";
import {SUDOKU_SIZE, type SudokuGrid, type SudokuHint} from "./types.ts";

export function findLogicalHint(grid: SudokuGrid): SudokuHint | null {
  const candidateMap = new Map<number, readonly (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)[]>();
  for (let index = 0; index < grid.length; index += 1) {
    if (grid[index] === 0) {
      candidateMap.set(index, getCandidates(grid, index));
    }
  }

  for (const [index, candidates] of candidateMap) {
    const digit = candidates[0];
    if (candidates.length === 1 && digit !== undefined) {
      return {
        technique: "naked-single",
        target: indexToPosition(index),
        index,
        digit,
        candidates,
      };
    }
  }

  for (const [kind, technique] of [
    ["row", "hidden-single-row"],
    ["column", "hidden-single-column"],
    ["box", "hidden-single-box"],
  ] as const) {
    for (let unit = 0; unit < SUDOKU_SIZE; unit += 1) {
      const indices = getUnitIndices(kind, unit).filter((index) => grid[index] === 0);
      for (const digit of SUDOKU_DIGITS) {
        const matches = indices.filter((index) => candidateMap.get(index)?.includes(digit));
        const index = matches[0];
        if (matches.length === 1 && index !== undefined) {
          return {
            technique,
            target: indexToPosition(index),
            index,
            digit,
            unit: kind === "box" ? getBoxIndex(index) : unit,
            candidates: candidateMap.get(index) ?? [],
          };
        }
      }
    }
  }

  return null;
}
