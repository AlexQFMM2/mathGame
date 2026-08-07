import {generateSudoku} from "@math-game/sudoku-core";
import {evaluateGeometryPuzzle, generateGridArchitect} from "@math-game/grid-architect-core";
import type {ReactNode} from "react";
import {GeometryConditionCards} from "../../gridArchitect/components/GeometryConditionCards";
import {GridArchitectBoard} from "../../gridArchitect/components/GridArchitectBoard";
import {GridArchitectResultPage} from "../../gridArchitect/pages/GridArchitectResultPage";
import {GameToolbar} from "../components/GameToolbar";
import {NumberPad} from "../components/NumberPad";
import {SudokuBoard} from "../components/SudokuBoard";
import {ResultPage} from "../pages/ResultPage";

export interface ComponentPreviewEntry {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly fullscreen?: boolean;
  readonly render: () => ReactNode;
}

const previewPuzzle = generateSudoku("medium", 20260807);
const previewValues = [...previewPuzzle.puzzle];
const firstEmpty = previewValues.findIndex((value) => value === 0);
const previewNotes = Array(81).fill(0) as number[];
previewNotes[firstEmpty] = (1 << 2) | (1 << 5) | (1 << 8);

const geometryPuzzle = generateGridArchitect("hard", 1);
const geometrySelection = geometryPuzzle.solution.selectedCellIds.slice(0, 7);
const geometryEvaluation = evaluateGeometryPuzzle(geometryPuzzle, {selectedCellIds: geometrySelection});

export const COMPONENT_PREVIEWS: readonly ComponentPreviewEntry[] = [
  {
    id: "board",
    title: "SudokuBoard",
    description: "题目数字、空格、笔记、选中与关联区域。",
    render: () => (
      <SudokuBoard
        puzzle={previewPuzzle}
        values={previewValues}
        notes={previewNotes}
        selectedIndex={firstEmpty}
        hintIndex={null}
        mistakeIndex={null}
        onSelect={() => undefined}
      />
    ),
  },
  {
    id: "controls",
    title: "Game controls",
    description: "操作栏的开启、禁用状态和数字键完成状态。",
    render: () => (
      <div className="component-preview__controls">
        <GameToolbar
          canUndo={false}
          notesActive
          onUndo={() => undefined}
          onErase={() => undefined}
          onToggleNotes={() => undefined}
          onHint={() => undefined}
        />
        <NumberPad completedCounts={[0, 9, 3, 2, 4, 5, 6, 7, 8, 1]} onInput={() => undefined} />
      </div>
    ),
  },
  {
    id: "result",
    title: "Result page",
    description: "结算统计、长题目编号、复制反馈与页面操作。",
    fullscreen: true,
    render: () => (
      <ResultPage
        result={{
          difficulty: "medium",
          elapsedSeconds: 263,
          errors: 0,
          hints: 1,
          puzzleId: previewPuzzle.id,
          puzzle: previewPuzzle,
          values: previewPuzzle.solution,
        }}
        onHome={() => undefined}
        onNewGame={() => undefined}
      />
    ),
  },
  {
    id: "geometry-board",
    title: "GridArchitectBoard",
    description: "建造、地标、障碍、边界、中心点、提示与冲突状态。",
    render: () => (
      <GridArchitectBoard
        puzzle={geometryPuzzle}
        selectedCellIds={geometrySelection}
        conditionResults={geometryEvaluation.conditionResults}
        hintCellId={geometryPuzzle.solution.selectedCellIds[7] ?? null}
        onToggle={() => undefined}
      />
    ),
  },
  {
    id: "geometry-conditions",
    title: "GeometryConditionCards",
    description: "待完成、成立和冲突条件的组合状态。",
    render: () => <GeometryConditionCards puzzle={geometryPuzzle} results={geometryEvaluation.conditionResults} checked />,
  },
  {
    id: "geometry-result",
    title: "Grid architect result",
    description: "完成建筑、统计与可分享题号。",
    fullscreen: true,
    render: () => (
      <GridArchitectResultPage
        result={{
          difficulty: geometryPuzzle.difficulty,
          elapsedSeconds: 188,
          errors: 1,
          hints: 1,
          puzzleId: geometryPuzzle.id,
          puzzle: geometryPuzzle,
          selectedCellIds: geometryPuzzle.solution.selectedCellIds,
        }}
        onHome={() => undefined}
        onNewGame={() => undefined}
      />
    ),
  },
];
