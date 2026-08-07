import {parseCrossMathChallengeId, type CrossMathChallengeReference} from "@math-game/crossmath-core";
import {useState} from "react";
import {AppIcon} from "../../../components/AppIcon";
import "./CrossMathSeedCard.css";

export function CrossMathSeedCard({hasSavedGame, onStart}: {readonly hasSavedGame: boolean; readonly onStart: (reference: CrossMathChallengeReference) => void}) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const reference = parseCrossMathChallengeId(value);

  const submit = () => {
    if (reference === null) {
      setMessage("编号无效，例如 CROSS-E-3F。");
      setConfirming(false);
      return;
    }
    if (hasSavedGame && !confirming) {
      setMessage("已有未完成题目，再点一次将替换存档。");
      setConfirming(true);
      return;
    }
    onStart(reference);
  };

  return (
    <article className="crossmath-seed-card">
      <span aria-hidden="true"><AppIcon name="copy" size={16} /></span>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label htmlFor="crossmath-seed">按题号进入</label>
        <div>
          <input id="crossmath-seed" value={value} maxLength={32} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="CROSS-E-3F" onChange={(event) => { setValue(event.target.value.toUpperCase()); setMessage(""); setConfirming(false); }} />
          <button type="submit" disabled={value.trim() === ""}>{confirming ? "确认" : "进入"}</button>
        </div>
        <small aria-live="polite">{message || "编号包含难度和 seed，可还原同一道题"}</small>
      </form>
    </article>
  );
}
