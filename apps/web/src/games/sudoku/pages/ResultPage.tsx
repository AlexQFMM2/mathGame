import type {SudokuDifficulty} from "@math-game/sudoku-core";
import {useState} from "react";
import {AppIcon} from "../../../components/AppIcon";
import {browserClipboard} from "../../../platform/clipboard";
import {formatElapsedTime} from "../state/session";
import {DIFFICULTY_LABELS} from "./labels";
import "./ResultPage.css";

export interface GameResult {
  readonly difficulty: SudokuDifficulty;
  readonly elapsedSeconds: number;
  readonly errors: number;
  readonly hints: number;
  readonly puzzleId: string;
}

interface ResultPageProps {
  readonly result: GameResult;
  readonly checkInStatus?: string;
  readonly onHome: () => void;
  readonly onNewGame: () => void;
}

export function ResultPage({result, checkInStatus, onHome, onNewGame}: ResultPageProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const puzzleId = result.puzzleId.toUpperCase();

  const copyPuzzleId = async () => {
    setCopyState(await browserClipboard.writeText(puzzleId) ? "copied" : "failed");
  };

  return (
    <section className="result-page">
      <div className="result-page__seal" aria-hidden="true"><span><AppIcon name="check" size={28} /></span></div>
      <p className="result-page__eyebrow">PUZZLE COMPLETE</p>
      <h1>漂亮的推理</h1>
      <p className="result-page__message">{checkInStatus ?? "九宫归位，今天的这一局已经完整收好。"}</p>

      <div className="result-summary">
        <div><small>难度</small><strong>{DIFFICULTY_LABELS[result.difficulty]}</strong></div>
        <div><small>用时</small><strong>{formatElapsedTime(result.elapsedSeconds)}</strong></div>
        <div><small>错误</small><strong>{result.errors}</strong></div>
        <div><small>提示</small><strong>{result.hints}</strong></div>
      </div>

      <div className="result-page__id">
        <span><small>题目编号</small><strong>{puzzleId}</strong></span>
        <button type="button" onClick={() => void copyPuzzleId()} aria-label={`复制题目编号 ${puzzleId}`}>
          <AppIcon name={copyState === "copied" ? "check" : "copy"} size={15} />
          {copyState === "copied" ? "已复制" : "复制"}
        </button>
      </div>
      <p className={`result-page__copy-status result-page__copy-status--${copyState}`} aria-live="polite">
        {copyState === "failed" ? "复制失败，请长按编号复制" : copyState === "copied" ? "可以在难度页按种子进入" : "复制后可分享或再次挑战"}
      </p>

      <div className="result-page__actions">
        <button type="button" onClick={onNewGame}>再来一局</button>
        <button type="button" className="result-page__secondary" onClick={onHome}>返回主页</button>
      </div>
    </section>
  );
}
