import {GAME_CATALOG} from "@math-game/game-core";
import {AppIcon} from "../../../components/AppIcon";
import type {SavedSudokuGame} from "../state/session";
import type {SavedCrossMathGame} from "../../crossmath/state/session";
import type {SavedGridArchitectGame} from "../../gridArchitect/state/session";
import {GRID_ARCHITECT_DIFFICULTY_LABELS} from "../../gridArchitect/pages/labels";
import {CROSSMATH_DIFFICULTY_LABELS} from "../../crossmath/pages/labels";
import {DIFFICULTY_LABELS} from "./labels";
import "./HomePage.css";

interface HomePageProps {
  readonly savedSudokuGame: SavedSudokuGame | null;
  readonly savedCrossMathGame: SavedCrossMathGame | null;
  readonly savedGridArchitectGame: SavedGridArchitectGame | null;
  readonly onChooseSudoku: () => void;
  readonly onChooseCrossMath: () => void;
  readonly onChooseGridArchitect: () => void;
  readonly onResumeSudoku: () => void;
  readonly onResumeCrossMath: () => void;
  readonly onResumeGridArchitect: () => void;
}

export function HomePage({savedSudokuGame, savedCrossMathGame, savedGridArchitectGame, onChooseSudoku, onChooseCrossMath, onChooseGridArchitect, onResumeSudoku, onResumeCrossMath, onResumeGridArchitect}: HomePageProps) {
  const sudoku = GAME_CATALOG.find((game) => game.id === "sudoku");
  const crossmath = GAME_CATALOG.find((game) => game.id === "crossmath");
  const gridArchitect = GAME_CATALOG.find((game) => game.id === "grid-architect");
  const availableCount = GAME_CATALOG.filter((game) => game.status === "available").length;

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
        {(savedSudokuGame !== null || savedCrossMathGame !== null || savedGridArchitectGame !== null) && (
          <div className="resume-list">
            {savedSudokuGame !== null && (
              <button className="resume-card" type="button" onClick={onResumeSudoku}>
                <span className="resume-card__icon" aria-hidden="true"><AppIcon name="play" size={16} /></span>
                <span><small>继续未完成游戏</small><strong>{DIFFICULTY_LABELS[savedSudokuGame.session.puzzle.difficulty]}数独</strong></span>
                <b>{Math.floor(savedSudokuGame.session.elapsedSeconds / 60)} 分钟</b>
              </button>
            )}
            {savedCrossMathGame !== null && (
              <button className="resume-card" type="button" onClick={onResumeCrossMath}>
                <span className="resume-card__icon" aria-hidden="true"><AppIcon name="play" size={16} /></span>
                <span><small>继续未完成游戏</small><strong>{CROSSMATH_DIFFICULTY_LABELS[savedCrossMathGame.session.puzzle.difficulty]}算术填字</strong></span>
                <b>{Math.floor(savedCrossMathGame.session.elapsedSeconds / 60)} 分钟</b>
              </button>
            )}
            {savedGridArchitectGame !== null && (
              <button className="resume-card" type="button" onClick={onResumeGridArchitect}>
                <span className="resume-card__icon" aria-hidden="true"><AppIcon name="play" size={16} /></span>
                <span><small>继续未完成游戏</small><strong>{GRID_ARCHITECT_DIFFICULTY_LABELS[savedGridArchitectGame.session.puzzle.difficulty]}格点建筑师</strong></span>
                <b>{Math.floor(savedGridArchitectGame.session.elapsedSeconds / 60)} 分钟</b>
              </button>
            )}
          </div>
        )}

        <div className="home-page__section-title">
          <span>选择游戏</span>
          <small>{String(availableCount).padStart(2, "0")} 个可玩</small>
        </div>

        <button className="game-card game-card--sudoku" type="button" onClick={onChooseSudoku}>
          <span className="sudoku-card__grid" aria-hidden="true">
            {Array.from({length: 9}, (_, index) => <i key={index}>{[4, 7, 2, 9][index] ?? ""}</i>)}
          </span>
          <span className="game-card__copy">
            <small>经典逻辑</small>
            <strong>{sudoku?.title ?? "数独"}</strong>
            <span>{sudoku?.subtitle ?? "从候选数中找到唯一答案"}</span>
          </span>
          <span className="game-card__arrow" aria-hidden="true"><AppIcon name="arrow-right" size={15} /></span>
        </button>

        <button className="game-card game-card--crossmath" type="button" onClick={onChooseCrossMath}>
          <span className="crossmath-card__grid" aria-hidden="true">
            <i>8</i><b>+</b><i>7</i><b>=</b><i>15</i>
            <b>+</b><em /><b>−</b><em /><b>−</b>
            <i>4</i><b>+</b><i>3</i><b>=</b><i>7</i>
          </span>
          <span className="game-card__copy">
            <small>算术逻辑</small>
            <strong>{crossmath?.title ?? "算术填字"}</strong>
            <span>{crossmath?.subtitle ?? "让横竖每条数学关系都成立"}</span>
          </span>
          <span className="game-card__arrow" aria-hidden="true"><AppIcon name="arrow-right" size={15} /></span>
        </button>

        <button className="game-card game-card--grid-architect" type="button" onClick={onChooseGridArchitect}>
          <span className="grid-architect-card__grid" aria-hidden="true">
            {Array.from({length: 16}, (_, index) => <i className={[5, 6, 9, 10, 11].includes(index) ? "built" : index === 7 ? "landmark" : index === 12 ? "obstacle" : ""} key={index}>{index === 7 ? "★" : ""}</i>)}
          </span>
          <span className="game-card__copy">
            <small>空间几何</small>
            <strong>{gridArchitect?.title ?? "格点建筑师"}</strong>
            <span>{gridArchitect?.subtitle ?? "用面积、周长与对称建造图形"}</span>
          </span>
          <span className="game-card__arrow" aria-hidden="true"><AppIcon name="arrow-right" size={15} /></span>
        </button>
      </main>

      <footer className="home-page__footer">
        <span>离线优先</span><i>·</i><span>没有广告</span><i>·</i><span>尊重思考</span>
      </footer>
    </section>
  );
}
