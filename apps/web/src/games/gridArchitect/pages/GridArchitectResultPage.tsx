import type {GridArchitectDifficulty, GridArchitectPuzzle} from "@math-game/grid-architect-core";
import {formatElapsedTime} from "../../../components/formatElapsedTime";
import {GameResultPage} from "../../../components/GameResultPage";
import {GridArchitectBoard} from "../components/GridArchitectBoard";
import {GRID_ARCHITECT_DIFFICULTY_LABELS} from "./labels";

export interface GridArchitectGameResult {
  readonly difficulty: GridArchitectDifficulty;
  readonly elapsedSeconds: number;
  readonly errors: number;
  readonly hints: number;
  readonly puzzleId: string;
  readonly puzzle: GridArchitectPuzzle;
  readonly selectedCellIds: readonly string[];
}

export function GridArchitectResultPage({result, checkInStatus, onHome, onNewGame}: {readonly result: GridArchitectGameResult; readonly checkInStatus?: string; readonly onHome: () => void; readonly onNewGame: () => void}) {
  return (
    <GameResultPage
      eyebrow="BUILDING CONDITIONS MET"
      title="建筑方案成立"
      message={checkInStatus ?? "面积、周长与空间条件全部满足。"}
      stats={[
        {label: "难度", value: GRID_ARCHITECT_DIFFICULTY_LABELS[result.difficulty]},
        {label: "用时", value: formatElapsedTime(result.elapsedSeconds)},
        {label: "调整", value: result.errors},
        {label: "提示", value: result.hints},
      ]}
      puzzleId={result.puzzleId}
      completedBoard={<GridArchitectBoard puzzle={result.puzzle} selectedCellIds={result.selectedCellIds} conditionResults={[]} hintCellId={null} onToggle={() => undefined} readOnly />}
      onHome={onHome}
      onNewGame={onNewGame}
    />
  );
}
