export const SUDOKU_SIZE = 9 as const;
export const SUDOKU_BOX_SIZE = 3 as const;

export type SudokuDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SudokuPosition {
  row: number;
  column: number;
}

export interface SudokuCell {
  readonly solution: SudokuDigit;
  readonly given: boolean;
  value: SudokuDigit | null;
  notes: Set<SudokuDigit>;
}

export type SudokuBoard = readonly (readonly SudokuCell[])[];

export type SudokuInputMode = "value" | "notes";

export type SudokuHintTechnique =
  | "naked-single"
  | "hidden-single-row"
  | "hidden-single-column"
  | "hidden-single-box";

export interface SudokuHint {
  technique: SudokuHintTechnique;
  target: SudokuPosition;
  digit: SudokuDigit;
  explanation: readonly string[];
}
