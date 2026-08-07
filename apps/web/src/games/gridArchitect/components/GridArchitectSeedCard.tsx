import {parseGridArchitectChallengeId, type GridArchitectChallengeReference} from "@math-game/grid-architect-core";
import {useState} from "react";
import {AppIcon} from "../../../components/AppIcon";
import "./GridArchitectSeedCard.css";

export function GridArchitectSeedCard({hasSavedGame, onStart}: {
  readonly hasSavedGame: boolean;
  readonly onStart: (reference: GridArchitectChallengeReference) => void;
}) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const submit = () => {
    const reference = parseGridArchitectChallengeId(value);
    if (reference === null) {
      setMessage("题号格式不正确，例如 GEO-E-3F");
      setConfirming(false);
      return;
    }
    if (hasSavedGame && !confirming) {
      setMessage("再次点击进入，将替换当前未完成游戏");
      setConfirming(true);
      return;
    }
    onStart(reference);
  };
  return (
    <article className="grid-architect-seed-card">
      <header><span><AppIcon name="compass" size={14} /></span><label htmlFor="grid-architect-seed">按题号进入</label></header>
      <div>
        <input id="grid-architect-seed" value={value} maxLength={32} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="GEO-E-3F" onChange={(event) => { setValue(event.target.value.toUpperCase()); setMessage(""); setConfirming(false); }} />
        <button type="button" onClick={submit}>{confirming ? "确认" : "进入"}</button>
      </div>
      <p className={message ? "grid-architect-seed-card__message" : ""}>{message || "输入结算页复制的题号，可复现同一地图"}</p>
    </article>
  );
}
