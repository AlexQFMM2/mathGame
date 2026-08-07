import {formatRational, type CrossMathGridCell, type CrossMathPuzzle, type CrossMathValueState} from "@math-game/crossmath-core";
import type {CSSProperties} from "react";
import {CrossMathValueText} from "./CrossMathValueText";
import "./CrossMathBoard.css";

interface CrossMathBoardProps {
  readonly puzzle: CrossMathPuzzle;
  readonly values: CrossMathValueState;
  readonly mistakeRelationIds: readonly string[];
  readonly hintDestinationId: string | null;
  readonly hintRelationId: string | null;
  readonly onPlace: (destinationId: string) => void;
  readonly readOnly?: boolean;
}

function isRelated(cell: CrossMathGridCell, relationIds: readonly string[]): boolean {
  return cell.relationIds.some((relationId) => relationIds.includes(relationId));
}

export function CrossMathBoard({
  puzzle,
  values,
  mistakeRelationIds,
  hintDestinationId,
  hintRelationId,
  onPlace,
  readOnly = false,
}: CrossMathBoardProps) {
  const verticalRelationIds = new Set(puzzle.relations.flatMap((relation) => {
    const cells = puzzle.cells.filter((cell) => cell.kind !== "blocked" && cell.relationIds.includes(relation.id));
    return cells.length > 0 && cells.every((cell) => cell.column === cells[0]?.column) ? [relation.id] : [];
  }));
  const style = {
    "--crossmath-board-columns": puzzle.columns,
    "--crossmath-board-rows": puzzle.rows,
    "--crossmath-cell-size": "20px",
  } as CSSProperties;

  return (
    <div
      className={`crossmath-board${readOnly ? " crossmath-board--result" : ""}`}
      style={style}
      role="grid"
      aria-label={`${readOnly ? "已完成的" : ""}${puzzle.rows} 行 ${puzzle.columns} 列算术填字题面`}
      aria-readonly={readOnly}
    >
      {puzzle.cells.map((cell) => {
        const cellStyle = {gridRow: cell.row + 1, gridColumn: cell.column + 1};
        if (cell.kind === "blocked") {
          return <span className="crossmath-board__blocked" style={cellStyle} aria-hidden="true" key={cell.id} />;
        }
        const mistake = isRelated(cell, mistakeRelationIds);
        const hinted = cell.id === hintDestinationId || (hintRelationId !== null && cell.relationIds.includes(hintRelationId));
        if (cell.kind === "symbol") {
          const fixed = cell.fillable !== true;
          const assigned = fixed ? cell.symbol : values.symbols[cell.id];
          const verticalComparison = assigned !== undefined
            && [">", "<", "≥", "≤"].includes(assigned)
            && cell.relationIds.some((relationId) => verticalRelationIds.has(relationId));
          const className = [
            "crossmath-board__symbol",
            fixed ? "crossmath-board__symbol--fixed" : "crossmath-board__symbol--slot",
            !fixed && assigned !== undefined ? "crossmath-board__symbol--filled" : "",
            verticalComparison ? "crossmath-board__symbol--vertical-comparison" : "",
            mistake ? "crossmath-board__symbol--mistake" : "",
            hinted ? "crossmath-board__symbol--hint" : "",
          ].filter(Boolean).join(" ");
          const content = assigned === undefined ? "" : <span className="crossmath-board__symbol-glyph">{assigned}</span>;
          return fixed || readOnly ? (
            <span className={className} style={cellStyle} role="gridcell" aria-label={`固定符号 ${cell.symbol}`} key={cell.id}>{content}</span>
          ) : (
            <button className={className} style={cellStyle} type="button" role="gridcell" data-destination-id={cell.id} aria-label={assigned === undefined ? "空符号格，点击放入所选符号" : `已放置符号 ${assigned}`} key={cell.id} tabIndex={readOnly ? -1 : undefined} onClick={readOnly ? undefined : () => onPlace(cell.id)}>{content}</button>
          );
        }
        if (cell.kind === "variable") {
          const assigned = values.variables[cell.variable];
          return (
            <span className={`crossmath-board__variable${mistake ? " crossmath-board__variable--mistake" : ""}${hinted ? " crossmath-board__variable--hint" : ""}`} style={cellStyle} key={cell.id}>
              <b>{cell.variable}</b>{assigned !== undefined && <small>{formatRational(assigned)}</small>}
            </span>
          );
        }
        const fixed = cell.fixedValue !== undefined;
        const value = fixed ? cell.fixedValue : values.cells[cell.id];
        const className = [
          "crossmath-board__value",
          fixed ? "crossmath-board__value--fixed" : "crossmath-board__value--slot",
          !fixed && value !== undefined ? "crossmath-board__value--filled" : "",
          mistake ? "crossmath-board__value--mistake" : "",
          hinted ? "crossmath-board__value--hint" : "",
        ].filter(Boolean).join(" ");
        const content = <>{cell.prefix && <i>{cell.prefix}</i>}{value !== undefined && <CrossMathValueText value={value} />}{cell.suffix && <i>{cell.suffix}</i>}</>;
        return cell.fixedValue !== undefined || readOnly ? (
          <span className={className} style={cellStyle} role="gridcell" aria-label={`${fixed ? "固定数字" : "已放置"} ${value === undefined ? "" : formatRational(value)}`} key={cell.id}>{content}</span>
        ) : (
          <button
            className={className}
            style={cellStyle}
            type="button"
            role="gridcell"
            data-destination-id={cell.id}
            aria-label={value === undefined ? "空格，点击放入所选数字" : `已放置 ${formatRational(value)}，点击操作`}
            key={cell.id}
            tabIndex={readOnly ? -1 : undefined}
            onClick={readOnly ? undefined : () => onPlace(cell.id)}
          >{content}</button>
        );
      })}
    </div>
  );
}
