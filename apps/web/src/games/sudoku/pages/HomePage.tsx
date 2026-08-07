import {GAME_CATALOG} from "@math-game/game-core";
import {AppIcon} from "../../../components/AppIcon";
import type {SavedSudokuGame} from "../state/session";
import {DIFFICULTY_LABELS} from "./labels";
import "./HomePage.css";

interface HomePageProps {
  readonly savedGame: SavedSudokuGame | null;
  readonly onChooseSudoku: () => void;
  readonly onResume: () => void;
}

export function HomePage({savedGame, onChooseSudoku, onResume}: HomePageProps) {
  const sudoku = GAME_CATALOG[0];

  return (
    <section className="home-page">
      <div className="home-page__orb home-page__orb--top" aria-hidden="true" />
      <div className="home-page__orb home-page__orb--bottom" aria-hidden="true" />

      <header className="home-page__header">
        <p>离线数学游戏集</p>
        <h1>MathGame</h1>
        <span>留一点安静，给每一步推理。</span>
      </header>

      <main className="home-page__content">
        {savedGame !== null && (
          <button className="resume-card" type="button" onClick={onResume}>
            <span className="resume-card__icon" aria-hidden="true"><AppIcon name="play" size={18} /></span>
            <span>
              <small>继续上次游戏</small>
              <strong>{DIFFICULTY_LABELS[savedGame.session.puzzle.difficulty]}数独</strong>
            </span>
            <b>{Math.floor(savedGame.session.elapsedSeconds / 60)} 分钟</b>
          </button>
        )}

        <div className="home-page__section-title">
          <span>选择游戏</span>
          <small>01 个可玩</small>
        </div>

        <button className="sudoku-card" type="button" onClick={onChooseSudoku}>
          <span className="sudoku-card__grid" aria-hidden="true">
            {Array.from({length: 9}, (_, index) => <i key={index}>{[4, 7, 2, 9][index] ?? ""}</i>)}
          </span>
          <span className="sudoku-card__copy">
            <small>经典逻辑</small>
            <strong>{sudoku?.title ?? "数独"}</strong>
            <span>{sudoku?.subtitle ?? "从候选数中找到唯一答案"}</span>
          </span>
          <span className="sudoku-card__arrow" aria-hidden="true"><AppIcon name="arrow-right" size={15} /></span>
        </button>
      </main>

      <footer className="home-page__footer">
        <span>离线优先</span><i>·</i><span>没有广告</span><i>·</i><span>尊重思考</span>
      </footer>
    </section>
  );
}
