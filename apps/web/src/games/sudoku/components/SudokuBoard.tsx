import {getPeerIndices, type SudokuDigit, type SudokuPuzzle, type SudokuValue} from "@math-game/sudoku-core";
import {noteDigits} from "../state/session";
import "./SudokuBoard.css";

interface SudokuBoardProps {
  readonly puzzle: SudokuPuzzle;
  readonly values: readonly SudokuValue[];
  readonly notes: readonly number[];
  readonly selectedIndex: number | null;
  readonly hintIndex: number | null;
  readonly mistakeIndex: number | null;
  readonly onSelect: (index: number) => void;
}

function cellLabel(index: number, value: SudokuValue, given: boolean): string {
  const row = Math.floor(index / 9) + 1;
  const column = index % 9 + 1;
  if (value === 0) {
    return `第 ${row} 行第 ${column} 列，空格`;
  }
  return `第 ${row} 行第 ${column} 列，${value}${given ? "，题目数字" : "，已填写"}`;
}

export function SudokuBoard({
  puzzle,
  values,
  notes,
  selectedIndex,
  hintIndex,
  mistakeIndex,
  onSelect,
}: SudokuBoardProps) {
  const selectedValue = selectedIndex === null ? 0 : values[selectedIndex] ?? 0;
  const peers = selectedIndex === null ? new Set<number>() : new Set(getPeerIndices(selectedIndex));

  return (
    <div className="sudoku-board" role="grid" aria-label="九乘九数独棋盘">
      {values.map((value, index) => {
        const given = puzzle.puzzle[index] !== 0;
        const isSelected = selectedIndex === index;
        const classes = [
          "sudoku-cell",
          given ? "sudoku-cell--given" : "sudoku-cell--user",
          peers.has(index) ? "sudoku-cell--peer" : "",
          selectedValue !== 0 && value === selectedValue ? "sudoku-cell--same" : "",
          isSelected ? "sudoku-cell--selected" : "",
          hintIndex === index ? "sudoku-cell--hint" : "",
          mistakeIndex === index ? "sudoku-cell--mistake" : "",
        ].filter(Boolean).join(" ");

        return (
          <button
            className={classes}
            type="button"
            role="gridcell"
            aria-selected={isSelected}
            aria-label={cellLabel(index, value, given)}
            key={index}
            onClick={() => onSelect(index)}
          >
            {value !== 0 ? (
              <span className="sudoku-cell__value">{value}</span>
            ) : (
              <span className="sudoku-cell__notes" aria-label={noteDigits(notes[index] ?? 0).join("、")}>
                {Array.from({length: 9}, (_, noteIndex) => {
                  const digit = (noteIndex + 1) as SudokuDigit;
                  return <i key={digit}>{noteDigits(notes[index] ?? 0).includes(digit) ? digit : ""}</i>;
                })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
