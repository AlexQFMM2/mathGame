import {AppIcon} from "../../../components/AppIcon";
import "./GridArchitectToolbar.css";

export function GridArchitectToolbar({canUndo, canReset, onUndo, onReset, onHint, onCheck}: {readonly canUndo: boolean; readonly canReset: boolean; readonly onUndo: () => void; readonly onReset: () => void; readonly onHint: () => void; readonly onCheck: () => void}) {
  return (
    <div className="grid-architect-toolbar" aria-label="游戏操作">
      <button type="button" disabled={!canUndo} onClick={onUndo}><AppIcon name="undo" size={15} /><span>撤销</span></button>
      <button type="button" disabled={!canReset} onClick={onReset}><AppIcon name="eraser" size={15} /><span>清空</span></button>
      <button type="button" onClick={onHint}><AppIcon name="lightbulb" size={15} /><span>提示</span></button>
      <button className="grid-architect-toolbar__check" type="button" onClick={onCheck}><AppIcon name="check" size={15} /><span>检查方案</span></button>
    </div>
  );
}
