import type {GeometryHint} from "@math-game/grid-architect-core";
import {AppIcon} from "../../../components/AppIcon";
import "./GridArchitectHintDialog.css";

export function GridArchitectHintDialog({hint, onApply, onClose}: {readonly hint: GeometryHint; readonly onApply: () => void; readonly onClose: () => void}) {
  return (
    <div className="grid-architect-hint__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="grid-architect-hint" role="dialog" aria-modal="true" aria-labelledby="grid-architect-hint-title">
        <span className="grid-architect-hint__icon"><AppIcon name="lightbulb" size={21} /></span>
        <small>空间提示</small><h2 id="grid-architect-hint-title">{hint.message}</h2><p>{hint.reason}</p>
        <div><button type="button" onClick={onApply}>{hint.action === "build" ? "帮我建造" : "帮我拆除"}</button><button type="button" onClick={onClose}>我再想想</button></div>
      </section>
    </div>
  );
}
