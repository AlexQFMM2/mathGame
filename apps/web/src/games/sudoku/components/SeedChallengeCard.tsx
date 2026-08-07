import {parseSudokuChallengeId, type SudokuChallengeReference} from "@math-game/sudoku-core";
import {useState} from "react";
import {AppIcon} from "../../../components/AppIcon";
import "./SeedChallengeCard.css";

interface SeedChallengeCardProps {
  readonly hasSavedGame: boolean;
  readonly onStart: (reference: SudokuChallengeReference) => void;
}

export function SeedChallengeCard({hasSavedGame, onStart}: SeedChallengeCardProps) {
  const [seed, setSeed] = useState("");
  const [message, setMessage] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const reference = parseSudokuChallengeId(seed);

  const resetFeedback = () => {
    setMessage("");
    setConfirmingId(null);
  };

  const submitSeed = () => {
    if (reference === null) {
      setMessage("种子无效，请检查是否完整，例如 MEDIUM-OR8M4D。");
      setConfirmingId(null);
      return;
    }
    if (hasSavedGame && confirmingId !== reference.id) {
      setMessage("当前有未完成棋局，再点一次将替换存档。");
      setConfirmingId(reference.id);
      return;
    }
    onStart(reference);
  };

  return (
    <article className="seed-challenge-card">
      <header className="seed-challenge-card__header">
        <span aria-hidden="true"><AppIcon name="copy" size={17} /></span>
        <div>
          <strong>按种子进入</strong>
          <small>输入结算页复制的题目种子</small>
        </div>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); submitSeed(); }}>
        <div className="seed-challenge-card__field">
          <label htmlFor="sudoku-seed">题目种子</label>
          <input
            id="sudoku-seed"
            value={seed}
            maxLength={32}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="例如 MEDIUM-OR8M4D"
            onChange={(event) => {
              setSeed(event.target.value.toUpperCase());
              resetFeedback();
            }}
          />
          {seed !== "" && (
            <button
              className="seed-challenge-card__clear"
              type="button"
              aria-label="清空题目种子"
              onClick={() => { setSeed(""); resetFeedback(); }}
            >×</button>
          )}
        </div>
        <button className="seed-challenge-card__submit" type="submit" disabled={seed.trim() === ""}>
          {confirmingId === reference?.id ? "确认替换" : "进入"}
          <AppIcon name="arrow-right" size={14} />
        </button>
      </form>

      <small
        className={`seed-challenge-card__message${message ? " seed-challenge-card__message--visible" : ""}`}
        aria-live="polite"
      >
        {message || "种子已包含难度信息，可还原同一道题"}
      </small>
    </article>
  );
}
