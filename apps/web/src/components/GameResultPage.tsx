import {useState, type ReactNode} from "react";
import {browserClipboard} from "../platform/clipboard";
import {AppIcon} from "./AppIcon";
import "./GameResultPage.css";

export interface ResultStat {
  readonly label: string;
  readonly value: string | number;
}

interface GameResultPageProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly message: string;
  readonly stats: readonly ResultStat[];
  readonly puzzleId: string;
  readonly completedBoard: ReactNode;
  readonly onHome: () => void;
  readonly onNewGame: () => void;
}

export function GameResultPage({eyebrow, title, message, stats, puzzleId, completedBoard, onHome, onNewGame}: GameResultPageProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const normalizedId = puzzleId.toUpperCase();
  const copyPuzzleId = async () => setCopyState(await browserClipboard.writeText(normalizedId) ? "copied" : "failed");

  return (
    <section className="game-result-page">
      <header className="game-result-page__hero">
        <div className="game-result-page__seal" aria-hidden="true"><span><AppIcon name="check" size={20} /></span></div>
        <div>
          <p className="game-result-page__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="game-result-page__message">{message}</p>
        </div>
      </header>
      <div className="game-result-page__board">
        <span><b>本局完成</b><small>棋盘已点亮，可以直接截屏</small></span>
        {completedBoard}
      </div>
      <div className="game-result-summary">
        {stats.map((stat) => <div key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong></div>)}
      </div>
      <div className="game-result-page__id">
        <span><small>题目编号</small><strong>{normalizedId}</strong></span>
        <button type="button" onClick={() => void copyPuzzleId()} aria-label={`复制题目编号 ${normalizedId}`}>
          <AppIcon name={copyState === "copied" ? "check" : "copy"} size={15} />
          {copyState === "copied" ? "已复制" : "复制"}
        </button>
      </div>
      <p className={`game-result-page__copy-status game-result-page__copy-status--${copyState}`} aria-live="polite">
        {copyState === "failed" ? "复制失败，请长按编号复制" : copyState === "copied" ? "可以在难度页按种子进入" : "复制后可分享或再次挑战"}
      </p>
      <div className="game-result-page__actions">
        <button type="button" onClick={onNewGame}>再来一局</button>
        <button type="button" className="game-result-page__secondary" onClick={onHome}>返回主页</button>
      </div>
    </section>
  );
}
