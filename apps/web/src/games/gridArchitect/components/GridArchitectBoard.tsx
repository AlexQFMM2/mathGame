import type {GeometryConditionResult, GridArchitectPuzzle} from "@math-game/grid-architect-core";
import type {CSSProperties} from "react";
import "./GridArchitectBoard.css";

export function GridArchitectBoard({puzzle, selectedCellIds, conditionResults, hintCellId, onToggle, readOnly = false}: {
  readonly puzzle: GridArchitectPuzzle;
  readonly selectedCellIds: readonly string[];
  readonly conditionResults: readonly GeometryConditionResult[];
  readonly hintCellId: string | null;
  readonly onToggle: (cellId: string) => void;
  readonly readOnly?: boolean;
}) {
  const selected = new Set(selectedCellIds);
  const conflicts = new Set(conditionResults.filter((result) => !result.satisfied).flatMap((result) => result.conflictCellIds));
  const cellSize = Math.floor(272 / Math.max(puzzle.rows, puzzle.columns));
  const symmetry = puzzle.conditions.find((condition) => condition.kind === "symmetry")?.symmetry ?? null;
  const style = {
    "--grid-architect-columns": puzzle.columns,
    "--grid-architect-rows": puzzle.rows,
    "--grid-architect-cell-size": `${cellSize}px`,
  } as CSSProperties;
  const isSelected = (row: number, column: number) => selected.has(`cell-${row}-${column}`);
  return (
    <div className={`grid-architect-board grid-architect-board--${symmetry ?? "plain"}${readOnly ? " grid-architect-board--result" : ""}`} style={style} role="grid" aria-label={`${puzzle.rows} 行 ${puzzle.columns} 列格点建筑地图`} aria-readonly={readOnly}>
      {puzzle.cells.map((cell) => {
        const built = selected.has(cell.id);
        const classes = [
          "grid-architect-board__cell",
          `grid-architect-board__cell--${cell.terrain}`,
          built ? "grid-architect-board__cell--built" : "",
          built && !isSelected(cell.row - 1, cell.column) ? "grid-architect-board__cell--edge-top" : "",
          built && !isSelected(cell.row + 1, cell.column) ? "grid-architect-board__cell--edge-bottom" : "",
          built && !isSelected(cell.row, cell.column - 1) ? "grid-architect-board__cell--edge-left" : "",
          built && !isSelected(cell.row, cell.column + 1) ? "grid-architect-board__cell--edge-right" : "",
          conflicts.has(cell.id) ? "grid-architect-board__cell--conflict" : "",
          hintCellId === cell.id ? "grid-architect-board__cell--hint" : "",
        ].filter(Boolean).join(" ");
        const content = cell.terrain === "landmark"
          ? <span className="grid-architect-board__landmark" aria-hidden="true">★</span>
          : cell.terrain === "obstacle"
            ? <span className="grid-architect-board__rock" aria-hidden="true"><i /><i /><i /></span>
            : null;
        const label = cell.terrain === "obstacle"
          ? `第 ${cell.row + 1} 行第 ${cell.column + 1} 列，障碍，不可建造`
          : `第 ${cell.row + 1} 行第 ${cell.column + 1} 列，${cell.terrain === "landmark" ? "地标，" : ""}${built ? "已建造" : "空地"}`;
        return readOnly || cell.terrain === "obstacle" ? (
          <span className={classes} style={{gridRow: cell.row + 1, gridColumn: cell.column + 1}} role="gridcell" aria-label={label} key={cell.id}>{content}</span>
        ) : (
          <button className={classes} style={{gridRow: cell.row + 1, gridColumn: cell.column + 1}} type="button" role="gridcell" aria-pressed={built} aria-label={`${label}，点击${built ? "拆除" : "建造"}`} key={cell.id} onClick={() => onToggle(cell.id)}>{content}</button>
        );
      })}
      {symmetry === "vertical" && <span className="grid-architect-board__axis grid-architect-board__axis--vertical" aria-hidden="true" />}
      {symmetry === "horizontal" && <span className="grid-architect-board__axis grid-architect-board__axis--horizontal" aria-hidden="true" />}
      {symmetry === "central" && <span className="grid-architect-board__center" aria-hidden="true" />}
    </div>
  );
}
