import "./GameToolbar.css";
import {AppIcon} from "../../../components/AppIcon";

interface GameToolbarProps {
  readonly canUndo: boolean;
  readonly notesActive: boolean;
  readonly onUndo: () => void;
  readonly onErase: () => void;
  readonly onToggleNotes: () => void;
  readonly onHint: () => void;
}

export function GameToolbar({canUndo, notesActive, onUndo, onErase, onToggleNotes, onHint}: GameToolbarProps) {
  return (
    <div className="game-toolbar" aria-label="游戏操作">
      <button type="button" disabled={!canUndo} onClick={onUndo}>
        <span aria-hidden="true"><AppIcon name="undo" size={20} /></span><small>撤销</small>
      </button>
      <button type="button" onClick={onErase}>
        <span aria-hidden="true"><AppIcon name="eraser" size={20} /></span><small>擦除</small>
      </button>
      <button
        className={notesActive ? "game-toolbar__notes--active" : ""}
        type="button"
        aria-pressed={notesActive}
        onClick={onToggleNotes}
      >
        <span aria-hidden="true"><AppIcon name="pencil" size={20} /></span><small>笔记</small><b>{notesActive ? "开" : "关"}</b>
      </button>
      <button type="button" onClick={onHint}>
        <span aria-hidden="true"><AppIcon name="lightbulb" size={20} /></span><small>提示</small>
      </button>
    </div>
  );
}
