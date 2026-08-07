import type {SudokuDifficulty, SudokuHintTechnique} from "@math-game/sudoku-core";

export const DIFFICULTY_LABELS: Readonly<Record<SudokuDifficulty, string>> = {
  easy: "轻松",
  medium: "进阶",
  hard: "挑战",
};

export const HINT_LABELS: Readonly<Record<SudokuHintTechnique, string>> = {
  "naked-single": "格内唯一",
  "hidden-single-row": "行内唯一",
  "hidden-single-column": "列内唯一",
  "hidden-single-box": "宫内唯一",
  reveal: "直接提示",
};
