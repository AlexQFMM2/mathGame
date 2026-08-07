import type {SudokuDifficulty} from "@math-game/sudoku-core";
import {DIFFICULTY_LABELS} from "./labels";
import "./GeneratingPage.css";

export function GeneratingPage({difficulty}: {readonly difficulty: SudokuDifficulty}) {
  return (
    <section className="generating-page" aria-live="polite">
      <div className="generating-page__grid" aria-hidden="true">
        {Array.from({length: 9}, (_, index) => <span key={index}>{index % 4 === 0 ? index + 1 : ""}</span>)}
      </div>
      <small>正在准备</small>
      <h1>{DIFFICULTY_LABELS[difficulty]}数独</h1>
      <p>生成题面并验证唯一解…</p>
      <div className="generating-page__progress"><i /></div>
    </section>
  );
}
