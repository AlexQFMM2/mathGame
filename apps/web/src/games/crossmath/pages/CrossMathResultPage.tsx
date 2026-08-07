import type {CrossMathDifficulty, CrossMathPuzzle, CrossMathValueState} from "@math-game/crossmath-core";
import {formatElapsedTime} from "../../../components/formatElapsedTime";
import {GameResultPage} from "../../../components/GameResultPage";
import {CrossMathBoard} from "../components/CrossMathBoard";
import {CROSSMATH_DIFFICULTY_LABELS} from "./labels";

export interface CrossMathGameResult {
  readonly difficulty: CrossMathDifficulty;
  readonly elapsedSeconds: number;
  readonly errors: number;
  readonly hints: number;
  readonly puzzleId: string;
  readonly puzzle: CrossMathPuzzle;
  readonly values: CrossMathValueState;
}

export function CrossMathResultPage({result, checkInStatus, onHome, onNewGame}: {
  readonly result: CrossMathGameResult;
  readonly checkInStatus?: string;
  readonly onHome: () => void;
  readonly onNewGame: () => void;
}) {
  return (
    <GameResultPage
      eyebrow="ALL RELATIONS TRUE"
      title="算式全部成立"
      message={checkInStatus ?? "数字各归其位，这张算术填字已经完成。"}
      stats={[
        {label: "难度", value: CROSSMATH_DIFFICULTY_LABELS[result.difficulty]},
        {label: "用时", value: formatElapsedTime(result.elapsedSeconds)},
        {label: "调整", value: result.errors},
        {label: "提示", value: result.hints},
      ]}
      puzzleId={result.puzzleId}
      completedBoard={(
        <CrossMathBoard
          puzzle={result.puzzle}
          values={result.values}
          mistakeRelationIds={[]}
          hintDestinationId={null}
          hintRelationId={null}
          onPlace={() => undefined}
          readOnly
        />
      )}
      onHome={onHome}
      onNewGame={onNewGame}
    />
  );
}
