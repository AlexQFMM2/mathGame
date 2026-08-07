import type {SudokuDifficulty, SudokuPuzzle, SudokuValue} from "@math-game/sudoku-core";
import {formatElapsedTime} from "../../../components/formatElapsedTime";
import {GameResultPage} from "../../../components/GameResultPage";
import {SudokuBoard} from "../components/SudokuBoard";
import {DIFFICULTY_LABELS} from "./labels";

export interface GameResult {
  readonly difficulty: SudokuDifficulty;
  readonly elapsedSeconds: number;
  readonly errors: number;
  readonly hints: number;
  readonly puzzleId: string;
  readonly puzzle: SudokuPuzzle;
  readonly values: readonly SudokuValue[];
}

interface ResultPageProps {
  readonly result: GameResult;
  readonly checkInStatus?: string;
  readonly onHome: () => void;
  readonly onNewGame: () => void;
}

export function ResultPage({result, checkInStatus, onHome, onNewGame}: ResultPageProps) {
  return (
    <GameResultPage
      eyebrow="PUZZLE COMPLETE"
      title="漂亮的推理"
      message={checkInStatus ?? "九宫归位，今天的这一局已经完整收好。"}
      stats={[
        {label: "难度", value: DIFFICULTY_LABELS[result.difficulty]},
        {label: "用时", value: formatElapsedTime(result.elapsedSeconds)},
        {label: "错误", value: result.errors},
        {label: "提示", value: result.hints},
      ]}
      puzzleId={result.puzzleId}
      completedBoard={(
        <SudokuBoard
          puzzle={result.puzzle}
          values={result.values}
          notes={Array(81).fill(0) as number[]}
          selectedIndex={null}
          hintIndex={null}
          mistakeIndex={null}
          onSelect={() => undefined}
          readOnly
        />
      )}
      onHome={onHome}
      onNewGame={onNewGame}
    />
  );
}
