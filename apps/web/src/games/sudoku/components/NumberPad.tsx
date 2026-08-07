import type {SudokuDigit} from "@math-game/sudoku-core";
import "./NumberPad.css";

interface NumberPadProps {
  readonly completedCounts: readonly number[];
  readonly onInput: (digit: SudokuDigit) => void;
}

export function NumberPad({completedCounts, onInput}: NumberPadProps) {
  return (
    <div className="number-pad" aria-label="数字键盘">
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((digit) => {
        const complete = completedCounts[digit] === 9;
        return (
          <button
            type="button"
            disabled={complete}
            aria-label={`填写数字 ${digit}${complete ? "，已全部完成" : ""}`}
            key={digit}
            onClick={() => onInput(digit)}
          >
            {digit}
          </button>
        );
      })}
    </div>
  );
}
