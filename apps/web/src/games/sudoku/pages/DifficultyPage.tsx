import type {SudokuChallengeReference, SudokuDifficulty} from "@math-game/sudoku-core";
import {AppIcon, type AppIconName} from "../../../components/AppIcon";
import {SeedChallengeCard} from "../components/SeedChallengeCard";
import {DIFFICULTY_LABELS} from "./labels";
import "./DifficultyPage.css";

interface DifficultyPageProps {
  readonly hasSavedGame: boolean;
  readonly onBack: () => void;
  readonly onSelect: (difficulty: SudokuDifficulty) => void;
  readonly onStartChallenge: (reference: SudokuChallengeReference) => void;
}

const OPTIONS: readonly {
  readonly id: SudokuDifficulty;
  readonly eyebrow: string;
  readonly description: string;
  readonly clueRange: string;
  readonly icon: AppIconName;
}[] = [
  {id: "easy", eyebrow: "适合热身", description: "更多已知数字，主要使用基础唯一法。", clueRange: "约 42 个提示数", icon: "leaf"},
  {id: "medium", eyebrow: "日常练习", description: "线索更少，需要交叉观察行、列和宫。", clueRange: "约 34 个提示数", icon: "compass"},
  {id: "hard", eyebrow: "专注挑战", description: "更开放的盘面，留给推理更多空间。", clueRange: "约 28 个提示数", icon: "flame"},
];

export function DifficultyPage({hasSavedGame, onBack, onSelect, onStartChallenge}: DifficultyPageProps) {
  return (
    <section className="difficulty-page">
      <header className="difficulty-page__header">
        <button type="button" onClick={onBack} aria-label="返回主页"><AppIcon name="arrow-left" size={19} /></button>
        <div>
          <small>开始一局数独</small>
          <h1>选择难度</h1>
        </div>
      </header>

      <p className="difficulty-page__intro">每道题都在本机即时生成，并检查只有一个答案。</p>

      <div className="difficulty-list">
        {OPTIONS.map((option, index) => (
          <button
            className={`difficulty-card difficulty-card--${option.id}`}
            type="button"
            key={option.id}
            onClick={() => onSelect(option.id)}
          >
            <span className="difficulty-card__number">0{index + 1}</span>
            <span className="difficulty-card__symbol" aria-hidden="true"><AppIcon name={option.icon} size={27} /></span>
            <span className="difficulty-card__copy">
              <small>{option.eyebrow}</small>
              <strong>{DIFFICULTY_LABELS[option.id]}</strong>
              <span>{option.description}</span>
              <b>{option.clueRange}</b>
            </span>
            <span className="difficulty-card__arrow" aria-hidden="true"><AppIcon name="arrow-right" size={16} /></span>
          </button>
        ))}
      </div>

      <SeedChallengeCard hasSavedGame={hasSavedGame} onStart={onStartChallenge} />

      <p className="difficulty-page__note"><span aria-hidden="true"><AppIcon name="check" size={12} /></span> 完全离线生成 · 自动验证唯一解</p>
    </section>
  );
}
