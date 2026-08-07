import {formatRational, type CrossMathHint} from "@math-game/crossmath-core";
import {AppIcon} from "../../../components/AppIcon";
import "./CrossMathHintDialog.css";

export function CrossMathHintDialog({hint, onApply, onClose}: {readonly hint: CrossMathHint; readonly onApply: () => void; readonly onClose: () => void}) {
  return (
    <div className="crossmath-hint__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="crossmath-hint" role="dialog" aria-modal="true" aria-labelledby="crossmath-hint-title">
        <span className="crossmath-hint__icon" aria-hidden="true"><AppIcon name="lightbulb" size={21} /></span>
        <small>推理提示</small>
        <h2 id="crossmath-hint-title">先看这一处</h2>
        <p>{hint.explanation}</p>
        <div className="crossmath-hint__answer"><span>可确定</span><strong>{formatRational(hint.value)}</strong></div>
        <div className="crossmath-hint__actions">
          <button type="button" autoFocus onClick={onApply}>{hint.movesExistingTile ? "移动卡牌" : "填入答案"}</button>
          <button type="button" onClick={onClose}>我再想想</button>
        </div>
      </section>
    </div>
  );
}
