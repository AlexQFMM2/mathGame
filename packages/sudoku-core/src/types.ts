export const SUDOKU_SIZE = 9 as const;
export const SUDOKU_BOX_SIZE = 3 as const;
export const SUDOKU_CELL_COUNT = 81 as const;

export type SudokuDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type SudokuValue = SudokuDigit | 0;
export type SudokuGrid = readonly SudokuValue[];
export type SudokuDifficulty = "easy" | "medium" | "hard";

export interface SudokuPosition {
  readonly row: number;
  readonly column: number;
}

export interface SudokuPuzzle {
  readonly id: string;
  readonly difficulty: SudokuDifficulty;
  readonly seed: number;
  readonly puzzle: SudokuGrid;
  readonly solution: SudokuGrid;
  readonly clueCount: number;
}

export type SudokuHintTechnique =
  | "naked-single"
  | "hidden-single-row"
  | "hidden-single-column"
  | "hidden-single-box"
  | "reveal";

export interface SudokuHint {
  readonly technique: SudokuHintTechnique;
  readonly target: SudokuPosition;
  readonly index: number;
  readonly digit: SudokuDigit;
  readonly unit?: number;
  readonly candidates: readonly SudokuDigit[];
}

export interface SudokuAnalysis {
  readonly clueCount: number;
  readonly logicalSteps: number;
  readonly unresolvedAfterSingles: number;
  readonly searchNodes: number;
}
