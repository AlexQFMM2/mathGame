import {AppIcon} from "../../../components/AppIcon";
import "./CrossMathToolbar.css";

interface CrossMathToolbarProps {
  readonly canUndo: boolean;
  readonly canReset: boolean;
  readonly onUndo: () => void;
  readonly onReset: () => void;
  readonly onHint: () => void;
}

export function CrossMathToolbar({canUndo, canReset, onUndo, onReset, onHint}: CrossMathToolbarProps) {
  return (
    <div className="crossmath-toolbar" aria-label="游戏操作">
      <button type="button" disabled={!canUndo} onClick={onUndo}><AppIcon name="undo" size={18} /><small>撤销</small></button>
      <button type="button" disabled={!canReset} onClick={onReset}><AppIcon name="eraser" size={18} /><small>清空</small></button>
      <button type="button" onClick={onHint}><AppIcon name="lightbulb" size={18} /><small>提示</small></button>
    </div>
  );
}
