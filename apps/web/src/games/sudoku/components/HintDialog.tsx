import type {SudokuHint} from "@math-game/sudoku-core";
import {AppIcon} from "../../../components/AppIcon";
import {HINT_LABELS} from "../pages/labels";
import "./HintDialog.css";

interface HintDialogProps {
  readonly hint: SudokuHint;
  readonly onApply: () => void;
  readonly onClose: () => void;
}

function hintDescription(hint: SudokuHint): string {
  const row = hint.target.row + 1;
  const column = hint.target.column + 1;
  if (hint.technique === "naked-single") {
    return `第 ${row} 行、第 ${column} 列这个格子只剩候选数 ${hint.digit}。`;
  }
  if (hint.technique === "hidden-single-row") {
    return `第 ${row} 行中，只有第 ${column} 列可以放数字 ${hint.digit}。`;
  }
  if (hint.technique === "hidden-single-column") {
    return `第 ${column} 列中，只有第 ${row} 行可以放数字 ${hint.digit}。`;
  }
  if (hint.technique === "hidden-single-box") {
    return `这个九宫内，数字 ${hint.digit} 只能放在第 ${row} 行、第 ${column} 列。`;
  }
  return `当前盘面没有基础唯一法可用，可以直接揭示第 ${row} 行、第 ${column} 列。`;
}

export function HintDialog({hint, onApply, onClose}: HintDialogProps) {
  return (
    <div className="hint-dialog__backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="hint-dialog" role="dialog" aria-modal="true" aria-labelledby="hint-title">
        <span className="hint-dialog__mark" aria-hidden="true"><AppIcon name="lightbulb" size={22} /></span>
        <small>推理提示</small>
        <h2 id="hint-title">{HINT_LABELS[hint.technique]}</h2>
        <p>{hintDescription(hint)}</p>
        {hint.candidates.length > 0 && (
          <div className="hint-dialog__candidates">
            <span>当前候选</span><strong>{hint.candidates.join(" · ")}</strong>
          </div>
        )}
        <div className="hint-dialog__actions">
          <button type="button" autoFocus onClick={onApply}>填入 {hint.digit}</button>
          <button type="button" onClick={onClose}>我再想想</button>
        </div>
      </section>
    </div>
  );
}
